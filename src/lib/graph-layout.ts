// Graph layout algorithm — separated from steps.ts so it can be imported
// by client components without pulling in Node.js fs/path modules.

import type { Step } from "./steps";

// ── Graph layout types ──────────────────────────────────────────────

export type GraphNode = {
  step: Step;
  col: number;
  row: number;
  x: number;
  y: number;
};

export type GraphEdge = {
  from: string;
  to: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
};

// Layout constants
export const COL_SPACING = 200;
export const ROW_SPACING = 70;
export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 40;
export const PADDING = 40;

// Takes any array of Steps and computes positioned graph data for SVG rendering.
// The algorithm uses a Sugiyama-style layered layout:
//   1. Build adjacency (filter to in-scope edges)
//   2. Assign layers via longest path from roots
//   3. Promote nodes rightward to reduce long edges
//   4. Order nodes within layers via barycenter heuristic
//   5. Map grid positions to pixel coordinates
export function computeGraphLayout(inputSteps: Step[]): GraphData {
  if (inputSteps.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // ── Phase 1: Build adjacency ──────────────────────────────────────
  const idSet = new Set(inputSteps.map((s) => s.id));

  // prerequisites: for each step, which in-scope steps must come before it
  const prerequisites = new Map<string, string[]>();
  // dependents: for each step, which in-scope steps come after it
  const dependents = new Map<string, string[]>();

  for (const step of inputSteps) {
    prerequisites.set(step.id, []);
    dependents.set(step.id, []);
  }

  const graphEdges: GraphEdge[] = [];

  for (const step of inputSteps) {
    for (const depId of step.dependsOn) {
      if (!idSet.has(depId)) continue; // skip out-of-scope dependencies
      prerequisites.get(step.id)!.push(depId);
      dependents.get(depId)!.push(step.id);
      graphEdges.push({ from: depId, to: step.id });
    }
  }

  // ── Phase 2: Initial layer assignment (longest path from roots) ───
  const layer = new Map<string, number>();

  // Topological sort via Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const step of inputSteps) {
    inDegree.set(step.id, prerequisites.get(step.id)!.length);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      layer.set(id, 0);
    }
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    for (const depId of dependents.get(id)!) {
      const currentLayer = layer.get(id)!;
      const depLayer = layer.get(depId);
      if (depLayer === undefined || depLayer < currentLayer + 1) {
        layer.set(depId, currentLayer + 1);
      }
      inDegree.set(depId, inDegree.get(depId)! - 1);
      if (inDegree.get(depId) === 0) {
        queue.push(depId);
      }
    }
  }

  // Handle any nodes not reached (shouldn't happen with clean data, but safety)
  for (const step of inputSteps) {
    if (!layer.has(step.id)) {
      layer.set(step.id, 0);
      topoOrder.push(step.id);
    }
  }

  // ── Phase 3: Promote nodes rightward ──────────────────────────────
  // Process in reverse topological order. Push each node as close
  // as possible to its earliest dependent to reduce long edges.
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const deps = dependents.get(id)!;
    if (deps.length === 0) continue; // no dependents — leave in place
    const minDependentLayer = Math.min(...deps.map((d) => layer.get(d)!));
    const promoted = minDependentLayer - 1;
    if (promoted > layer.get(id)!) {
      layer.set(id, promoted);
    }
  }

  // ── Phase 4: Vertical ordering (barycenter heuristic) ─────────────
  // Group nodes by layer
  const numCols = Math.max(...Array.from(layer.values())) + 1;
  const columns: string[][] = Array.from({ length: numCols }, () => []);
  for (const [id, col] of layer) {
    columns[col].push(id);
  }

  // Find the critical path (longest chain) so we can pin it to the bottom
  const criticalPath = findCriticalPath(topoOrder, prerequisites);
  const criticalSet = new Set(criticalPath);

  // Assign row positions within each column
  const row = new Map<string, number>();

  for (let col = 0; col < numCols; col++) {
    const colNodes = columns[col];

    if (col === 0) {
      // First column: critical path node at bottom (row 0), rest above
      const critical = colNodes.filter((id) => criticalSet.has(id));
      const others = colNodes.filter((id) => !criticalSet.has(id));
      const sorted = [...critical, ...others];
      sorted.forEach((id, i) => row.set(id, i));
    } else {
      // Barycenter: sort by average row position of connected predecessors
      const scored = colNodes.map((id) => {
        const preds = prerequisites.get(id)!;
        const connectedRows = preds
          .map((p) => row.get(p))
          .filter((r): r is number => r !== undefined);
        const avg =
          connectedRows.length > 0
            ? connectedRows.reduce((a, b) => a + b, 0) / connectedRows.length
            : 0;
        return { id, barycenter: avg, isCritical: criticalSet.has(id) };
      });

      // Critical path nodes go to bottom (row 0), then sort rest by barycenter
      scored.sort((a, b) => {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        return a.barycenter - b.barycenter;
      });

      scored.forEach(({ id }, i) => row.set(id, i));
    }
  }

  // ── Phase 5: Pixel coordinate mapping ─────────────────────────────
  const maxRows = Math.max(...columns.map((col) => col.length));

  const nodes: GraphNode[] = inputSteps.map((step) => {
    const c = layer.get(step.id)!;
    const r = row.get(step.id)!;
    return {
      step,
      col: c,
      row: r,
      // x is the horizontal center of the node
      x: c * COL_SPACING + PADDING + NODE_WIDTH / 2,
      // y: invert so row 0 = bottom of the column
      y: (maxRows - r - 1) * ROW_SPACING + PADDING + NODE_HEIGHT / 2,
    };
  });

  const width = numCols * COL_SPACING + PADDING * 2;
  const height = maxRows * ROW_SPACING + PADDING * 2;

  return { nodes, edges: graphEdges, width, height };
}

// Finds the longest chain through the DAG (the critical path).
// Returns the IDs in order from source to sink.
function findCriticalPath(
  topoOrder: string[],
  prerequisites: Map<string, string[]>,
): string[] {
  // For each node, track the longest path ending at it and which node preceded it
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  for (const id of topoOrder) {
    dist.set(id, 0);
    prev.set(id, null);
  }

  for (const id of topoOrder) {
    for (const predId of prerequisites.get(id)!) {
      const newDist = dist.get(predId)! + 1;
      if (newDist > dist.get(id)!) {
        dist.set(id, newDist);
        prev.set(id, predId);
      }
    }
  }

  // Find the node with the longest path (the sink of the critical path)
  let maxDist = -1;
  let endId = topoOrder[0];
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endId = id;
    }
  }

  // Trace back to build the path
  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return path;
}
