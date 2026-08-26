import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
// represents one node from the dependency list/graph, called a step
export type Step = {
  id: string;
  track: string;
  phase: string;
  name: string;
  providerType?: string;
  department?: string;
  description: string;
  dependsOn: string[];
  cost?: string;
  timeToComplete?: string;
  processingTime?: string;
  renewal?: string;
  formLink?: string;
  level?: string;
};

type Row = Record<string, string>;

const STEP_ID_COLUMN = "Step ID (For Dependency List)";

function toStep(row: Row): Step {
  return {
    id: row[STEP_ID_COLUMN].trim(),
    track: row["Center/Home"].trim(),
    phase: row["Phase"].trim(),
    name: row["Step"].trim(),
    providerType: row["Provider Type"]?.trim() || undefined,
    department: row["Department"]?.trim() || undefined,
    description: row["Description"]?.trim() ?? "",
    dependsOn: row["Dependency"]
      ? row["Dependency"].split(",").map((id) => id.trim()).filter(Boolean)
      : [],
    cost: row["Cost"]?.trim() || undefined,
    timeToComplete: row["Time to Complete"]?.trim() || undefined,
    processingTime: row["Processing Time"]?.trim() || undefined,
    renewal: row["Renewal"]?.trim() || undefined,
    formLink: row["Link to Forms"]?.trim() || undefined,
    level: row["Level (NYC Home-based specific)"]?.trim() || undefined,
  };
}

function loadSteps(): Step[] {
  const csvPath = path.join(process.cwd(), "data", "steps.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows: Row[] = parse(raw, { columns: true, skip_empty_lines: true });
  return rows
    .filter((row) => row[STEP_ID_COLUMN]?.trim())
    .map(toStep);
}

export const steps = loadSteps();
export const stepsById = new Map(steps.map((step) => [step.id, step]));

// Get the prerequisites (dependencies) for a given step ID
export function getPrerequisites(id: string): Step[] {
  const step = stepsById.get(id);
  if (!step) return [];
  return step.dependsOn
    .map((depId) => stepsById.get(depId))
    .filter((s): s is Step => Boolean(s));
}
// returns those whose dependsOn contain this id.
export function getDependents(id: string): Step[] {
  return steps.filter((step) => step.dependsOn.includes(id));
}

export function stepsForTrack(track: string): Step[] {
  return steps.filter((step) => step.track === track);
}

export function stepsForPhase(track: string, phase: string): Step[] {
  return steps.filter((step) => step.track === track && step.phase === phase);
}

export function phasesForTrack(track: string): string[] {
  const seen = new Set<string>();
  const phases: string[] = [];
  for (const step of stepsForTrack(track)) {
    if (!seen.has(step.phase)) {
      seen.add(step.phase);
      phases.push(step.phase);
    }
  }
  return phases;
}

// all the distinct tracks (Home/Center), in the order they first show up in the csv
export function tracks(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const step of steps) {
    if (!seen.has(step.track)) {
      seen.add(step.track);
      result.push(step.track);
    }
  }
  return result;
}

// every department that shows up anywhere in this track, no duplicates
// used in key agencies number for pathway overview, and in comparison page
export function keyAgencies(track: string): string[] {
  const seen = new Set<string>();
  for (const step of stepsForTrack(track)) {
    if (!step.department) continue;
    for (const department of step.department.split(",").map((d) => d.trim())) {
      seen.add(department);
    }
  }
  return Array.from(seen);
}

// finds the steps in this phase that have nothing blocking them, groups
// those together, and repeats until every step has a group.
// used by the pathway overview dropdown to show which steps can be in parallel
export function dependencyLayers(track: string, phase: string): Step[][] {
  const phaseSteps = stepsForPhase(track, phase);
  const phaseIds = new Set(phaseSteps.map((step) => step.id));
  const remaining = new Map(phaseSteps.map((step) => [step.id, step]));
  const resolved = new Set<string>();
  const layers: Step[][] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining.values()).filter((step) =>
      step.dependsOn
        .filter((id) => phaseIds.has(id))
        .every((id) => resolved.has(id)),
    );
    const layer = ready.length > 0 ? ready : Array.from(remaining.values());
    for (const step of layer) {
      remaining.delete(step.id);
      resolved.add(step.id);
    }
    layers.push(layer);
  }

  return layers;
}

// finds which steps in this phase are actually connected to each other by a
// dependency (directly or through a chain of them) and groups those into one list
// used for phase page to create groups for the "workstreams" simultaneoulsy the figma mentioned
// ie answers which flows can be in parallel
export function dependencyChains(track: string, phase: string): Step[][] {
  const phaseSteps = stepsForPhase(track, phase);
  const phaseIds = new Set(phaseSteps.map((step) => step.id));
  const byId = new Map(phaseSteps.map((step) => [step.id, step]));

  const adjacency = new Map<string, Set<string>>();
  for (const step of phaseSteps) adjacency.set(step.id, new Set());
  for (const step of phaseSteps) {
    for (const depId of step.dependsOn) {
      if (!phaseIds.has(depId)) continue;
      adjacency.get(step.id)!.add(depId);
      adjacency.get(depId)!.add(step.id);
    }
  }

  const visited = new Set<string>();
  const chains: Step[][] = [];

  for (const step of phaseSteps) {
    if (visited.has(step.id)) continue;
    const componentIds: string[] = [];
    const queue = [step.id];
    visited.add(step.id);
    while (queue.length > 0) {
      const currentId = queue.shift() as string;
      componentIds.push(currentId);
      for (const neighborId of adjacency.get(currentId) ?? []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    const componentIdSet = new Set(componentIds);
    const remaining = new Map(componentIds.map((id) => [id, byId.get(id) as Step]));
    const resolved = new Set<string>();
    const ordered: Step[] = [];
    while (remaining.size > 0) {
      const ready = Array.from(remaining.values()).filter((s) =>
        s.dependsOn.filter((id) => componentIdSet.has(id)).every((id) => resolved.has(id)),
      );
      const next = ready.length > 0 ? ready : Array.from(remaining.values());
      for (const s of next) {
        remaining.delete(s.id);
        resolved.add(s.id);
        ordered.push(s);
      }
    }
    chains.push(ordered);
  }

  return chains;
}

