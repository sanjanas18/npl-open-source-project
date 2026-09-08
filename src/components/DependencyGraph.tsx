"use client";

import { useState } from "react";
import type { Step } from "@/lib/steps";
import { computeGraphLayout, NODE_WIDTH, NODE_HEIGHT } from "@/lib/graph-layout";
import StepDetailPanel from "@/components/StepDetailPanel";

// Phase color palette — each phase gets a distinct fill color
const PHASE_COLORS: Record<string, { fill: string; stroke: string }> = {
  "Care Type":           { fill: "#a7f3d0", stroke: "#059669" },  // green
  "Process Initiation":  { fill: "#bfdbfe", stroke: "#2563eb" },  // blue
  "Facility Inspection": { fill: "#fde68a", stroke: "#d97706" },  // amber
  "Staff Preparation":   { fill: "#c4b5fd", stroke: "#7c3aed" },  // violet
  "Compliance":          { fill: "#fca5a5", stroke: "#dc2626" },  // red
  "Application":         { fill: "#fdba74", stroke: "#ea580c" },  // orange
  "Post-Application":    { fill: "#5eead4", stroke: "#0f766e" },  // dark teal
};

const DEFAULT_COLOR = { fill: "#e4e4e7", stroke: "#71717a" };  // zinc fallback

function getPhaseColor(phase: string) {
  return PHASE_COLORS[phase] ?? DEFAULT_COLOR;
}

// Get unique phases in order of appearance for the legend
function getPhases(steps: Step[]): string[] {
  const seen = new Set<string>();
  const phases: string[] = [];
  for (const step of steps) {
    if (!seen.has(step.phase)) {
      seen.add(step.phase);
      phases.push(step.phase);
    }
  }
  return phases;
}

type DependencyGraphProps = {
  steps: Step[];
  track: string;
};

export default function DependencyGraph({ steps }: DependencyGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const graph = computeGraphLayout(steps);
  const phases = getPhases(steps);

  if (graph.nodes.length === 0) return null;

  const stepsById = new Map(steps.map((s) => [s.id, s]));
  const selectedStep = selectedId ? (stepsById.get(selectedId) ?? null) : null;
  const prerequisites = selectedStep
    ? selectedStep.dependsOn.map((id) => stepsById.get(id)).filter((s): s is Step => Boolean(s))
    : [];
  const dependents = selectedStep
    ? steps.filter((s) => s.dependsOn.includes(selectedStep.id))
    : [];

  // Build lookup for node positions by ID
  const nodeById = new Map(graph.nodes.map((n) => [n.step.id, n]));

  // Determine which edges are connected to the hovered node
  const hoveredEdges = new Set<string>();
  const hoveredNeighbors = new Set<string>();
  if (hoveredId) {
    hoveredNeighbors.add(hoveredId);
    for (const edge of graph.edges) {
      if (edge.from === hoveredId || edge.to === hoveredId) {
        hoveredEdges.add(`${edge.from}->${edge.to}`);
        hoveredNeighbors.add(edge.from);
        hoveredNeighbors.add(edge.to);
      }
    }
  }

  return (
    <div className="mt-10">
      <h2 className="font-serif text-xl font-semibold text-zinc-900">
        Dependency Graph
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Click any step to see details. Hover to highlight connections.
      </p>

      {/* Phase legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {phases.map((phase) => {
          const color = getPhaseColor(phase);
          return (
            <div key={phase} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span
                className="inline-block h-3 w-3 rounded-sm border"
                style={{ backgroundColor: color.fill, borderColor: color.stroke }}
              />
              {phase}
            </div>
          );
        })}
      </div>

      {/* SVG graph — horizontally scrollable */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <svg
          width={graph.width}
          height={graph.height}
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          className="block"
        >
          {/* Arrowhead marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L8,3 L0,6" fill="#a1a1aa" />
            </marker>
            <marker
              id="arrowhead-highlighted"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L8,3 L0,6" fill="#3f3f46" />
            </marker>
          </defs>

          {/* Edges — cubic bezier curves */}
          {graph.edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;

            const edgeKey = `${edge.from}->${edge.to}`;
            const isHighlighted = hoveredId ? hoveredEdges.has(edgeKey) : false;
            const isDimmed = hoveredId ? !isHighlighted : false;

            // Start from right edge of source, end at left edge of target
            const x1 = from.x + NODE_WIDTH / 2;
            const y1 = from.y;
            const x2 = to.x - NODE_WIDTH / 2;
            const y2 = to.y;

            // Control point offset for the bezier curve
            const dx = Math.abs(x2 - x1);
            const cpOffset = Math.min(dx * 0.4, 80);

            const path = `M ${x1},${y1} C ${x1 + cpOffset},${y1} ${x2 - cpOffset},${y2} ${x2},${y2}`;

            return (
              <path
                key={edgeKey}
                d={path}
                fill="none"
                stroke={isHighlighted ? "#3f3f46" : "#d4d4d8"}
                strokeWidth={isHighlighted ? 2 : 1.5}
                markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                opacity={isDimmed ? 0.2 : 1}
                style={{ transition: "opacity 0.2s, stroke 0.2s" }}
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const color = getPhaseColor(node.step.phase);
            const isDimmed = hoveredId ? !hoveredNeighbors.has(node.step.id) : false;
            const isHovered = hoveredId === node.step.id;

            const rx = node.x - NODE_WIDTH / 2;
            const ry = node.y - NODE_HEIGHT / 2;

            return (
              <g
                key={node.step.id}
                style={{
                  cursor: "pointer",
                  opacity: isDimmed ? 0.25 : 1,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={() => setHoveredId(node.step.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(node.step.id)}
              >
                <rect
                  x={rx}
                  y={ry}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={6}
                  ry={6}
                  fill={color.fill}
                  stroke={isHovered ? color.stroke : `${color.stroke}80`}
                  strokeWidth={isHovered ? 2 : 1}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={500}
                  fill="#18181b"
                  style={{ pointerEvents: "none" }}
                >
                  {truncateLabel(node.step.name, 20)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Reusable step detail sidebar */}
      <StepDetailPanel
        step={selectedStep}
        prerequisites={prerequisites}
        dependents={dependents}
        onClose={() => setSelectedId(null)}
        onSelectStep={setSelectedId}
      />
    </div>
  );
}

// Truncate long step names to fit inside the node box
function truncateLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}
