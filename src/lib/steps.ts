import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
// represents one node from the dependency list/graph, called a step
export type Step = {
  id: string;
  track: string;
  phase: string;
  phaseNumber: number;
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
const DATA_DIR = path.join(process.cwd(), "data");

// the Phase column looks like "5. Facility Inspection" — pull the leading
// number out for sorting, and keep the clean name without it for display.
function splitPhase(rawPhase: string): { phase: string; phaseNumber: number } {
  const match = rawPhase.match(/^(\d+)\.\s*(.+)$/);
  if (!match) return { phase: rawPhase, phaseNumber: Number.MAX_SAFE_INTEGER };
  return { phase: match[2].trim(), phaseNumber: Number(match[1]) };
}

function toStep(row: Row): Step {
  const { phase, phaseNumber } = splitPhase(row["Phase"].trim());
  return {
    id: row[STEP_ID_COLUMN].trim(),
    track: row["Center/Home"].trim(),
    phase,
    phaseNumber,
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

// some steps are really the same requirement, just listed once per provider
// type (e.g. "Determine license type" appears once for FCC, once for GFCC).
// same track + phase + name = merge into one step, combine the provider
// types and descriptions, and point anything that depended on either of the
// old ids at the merged one instead.
function mergeVariants(steps: Step[]): Step[] {
  const groups = new Map<string, Step[]>();
  for (const step of steps) {
    const key = `${step.track}|${step.phase}|${step.name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(step);
  }

  const idRemap = new Map<string, string>();
  const merged: Step[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }

    const mergedId = group.map((s) => s.id).join("+");
    for (const s of group) idRemap.set(s.id, mergedId);

    const providerTypes = group.map((s) => s.providerType).filter(Boolean) as string[];
    const departments = Array.from(
      new Set(group.map((s) => s.department).filter(Boolean)),
    ) as string[];
    const description = group
      .map((s) => (s.providerType ? `${s.providerType}: ${s.description}` : s.description))
      .join("\n\n");

    merged.push({
      ...group[0],
      id: mergedId,
      providerType: providerTypes.length ? providerTypes.join(" / ") : undefined,
      department: departments.length ? departments.join(", ") : undefined,
      description,
      dependsOn: Array.from(new Set(group.flatMap((s) => s.dependsOn))),
    });
  }

  if (idRemap.size === 0) return merged;

  return merged.map((step) => ({
    ...step,
    dependsOn: Array.from(new Set(step.dependsOn.map((id) => idRemap.get(id) ?? id))),
  }));
}

// every folder under data/ that has its own steps.csv is a supported city —
// drop in data/chicago/steps.csv and "chicago" shows up here automatically,
// no code changes needed.
export function listCities(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((city) => fs.existsSync(path.join(DATA_DIR, city, "steps.csv")))
    .sort();
}

type CityData = {
  steps: Step[];
  stepsById: Map<string, Step>;
};

const cityCache = new Map<string, CityData>();

function getCityData(city: string): CityData {
  const cached = cityCache.get(city);
  if (cached) return cached;

  const csvPath = path.join(DATA_DIR, city, "steps.csv");
  const rawSteps = fs.existsSync(csvPath)
    ? (parse(fs.readFileSync(csvPath, "utf-8"), {
        columns: true,
        skip_empty_lines: true,
      }) as Row[])
        .filter((row) => row[STEP_ID_COLUMN]?.trim())
        .map(toStep)
    : [];
  const steps = mergeVariants(rawSteps);

  const data: CityData = { steps, stepsById: new Map(steps.map((s) => [s.id, s])) };
  cityCache.set(city, data);
  return data;
}

// Get the prerequisites (dependencies) for a given step ID
export function getPrerequisites(city: string, id: string): Step[] {
  const { stepsById } = getCityData(city);
  const step = stepsById.get(id);
  if (!step) return [];
  return step.dependsOn
    .map((depId) => stepsById.get(depId))
    .filter((s): s is Step => Boolean(s));
}
// returns those whose dependsOn contain this id.
export function getDependents(city: string, id: string): Step[] {
  return getCityData(city).steps.filter((step) => step.dependsOn.includes(id));
}

export function stepsForTrack(city: string, track: string): Step[] {
  return getCityData(city).steps.filter((step) => step.track === track);
}

export function stepsForPhase(city: string, track: string, phase: string): Step[] {
  return getCityData(city).steps.filter(
    (step) => step.track === track && step.phase === phase,
  );
}

// distinct phases for a track, sorted by the phase number from the sheet
// (not by row order — the sheet's row order and phase number don't match)
export function phasesForTrack(city: string, track: string): string[] {
  const seen = new Map<string, number>();
  for (const step of stepsForTrack(city, track)) {
    if (!seen.has(step.phase)) {
      seen.set(step.phase, step.phaseNumber);
    }
  }
  return Array.from(seen.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([phase]) => phase);
}

// all the distinct tracks (Home/Center) for a city, in the order they first show up in the csv
export function tracks(city: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const step of getCityData(city).steps) {
    if (!seen.has(step.track)) {
      seen.add(step.track);
      result.push(step.track);
    }
  }
  return result;
}

// every department that shows up anywhere in this track, no duplicates
// used in key agencies number for pathway overview, and in comparison page
export function keyAgencies(city: string, track: string): string[] {
  const seen = new Set<string>();
  for (const step of stepsForTrack(city, track)) {
    if (!step.department) continue;
    for (const department of step.department.split(",").map((d) => d.trim())) {
      seen.add(department);
    }
  }
  return Array.from(seen);
}

// finds which steps in this phase are actually connected to each other by a
// dependency (directly or through a chain of them) and groups those into one list
// used for phase page to create groups for the "workstreams" simultaneoulsy the figma mentioned
// ie answers which flows can be in parallel
export function dependencyChains(city: string, track: string, phase: string): Step[][] {
  const phaseSteps = stepsForPhase(city, track, phase);
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
