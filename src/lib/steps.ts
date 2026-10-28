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
  formLinks: string[];
  level?: string;
};

type Row = Record<string, string>;

const STEP_ID_COLUMN = "Step ID (For Dependency List)";
const LEVEL_COLUMN = "Government Level";
const DATA_DIR = path.join(process.cwd(), "data");

// columns the app can't function without — a city's steps.csv missing one
// of these fails loudly rather than silently rendering broken/empty pages
const REQUIRED_COLUMNS = [STEP_ID_COLUMN, "Center/Home", "Phase", "Step", "Description", "Dependency"];

// columns that degrade gracefully to "-" / empty when absent — fine for a
// city that simply doesn't track that attribute
const OPTIONAL_COLUMNS = [
  "Provider Type",
  "Department",
  "Cost",
  "Time to Complete",
  "Processing Time",
  "Renewal",
  "Link to Forms",
  LEVEL_COLUMN,
];

// a city's CSV header row must match these column names exactly (case,
// spacing, punctuation) since csv-parse uses them as object keys — a typo'd
// header otherwise comes back as `undefined` everywhere with no error at all
export function validateHeaders(headerRow: string[], city: string): void {
  const missingRequired = REQUIRED_COLUMNS.filter((col) => !headerRow.includes(col));
  if (missingRequired.length > 0) {
    throw new Error(
      `${city}/steps.csv is missing required column(s): ${missingRequired.join(", ")}. ` +
        "Check that the header row matches the expected column names exactly.",
    );
  }

  const missingOptional = OPTIONAL_COLUMNS.filter((col) => !headerRow.includes(col));
  if (missingOptional.length > 0) {
    console.warn(
      `[steps.ts] ${city}/steps.csv is missing optional column(s): ${missingOptional.join(", ")} — these fields will be empty for every step.`,
    );
  }
}

// collapses stray extra spacing without touching intentional newlines in
// multi-line fields (descriptions, multi-link cells) — used for fields that
// get compared/grouped by exact string match, where "Facility Inspection"
// and "Facility  Inspection " should still be treated as the same value
function normalizeText(value: string): string {
  return value.trim().replace(/[ \t]+/g, " ");
}

function normalizeOrUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return normalizeText(value) || undefined;
}

// the Phase column looks like "5. Facility Inspection" — pull the leading
// number out for sorting, and keep the clean name without it for display.
function splitPhase(rawPhase: string): { phase: string; phaseNumber: number } {
  const match = rawPhase.match(/^(\d+)\.\s*(.+)$/);
  if (!match) return { phase: rawPhase, phaseNumber: Number.MAX_SAFE_INTEGER };
  return { phase: match[2].trim(), phaseNumber: Number(match[1]) };
}

function toStep(row: Row): Step {
  const { phase, phaseNumber } = splitPhase(normalizeText(row["Phase"] ?? ""));
  return {
    id: row[STEP_ID_COLUMN].trim(),
    track: normalizeText(row["Center/Home"] ?? ""),
    phase,
    phaseNumber,
    name: normalizeText(row["Step"] ?? ""),
    providerType: normalizeOrUndefined(row["Provider Type"]),
    department: normalizeOrUndefined(row["Department"]),
    description: row["Description"]?.trim() ?? "",
    dependsOn: row["Dependency"]
      ? row["Dependency"].split(",").map((id) => id.trim()).filter(Boolean)
      : [],
    cost: row["Cost"]?.trim() || undefined,
    timeToComplete: row["Time to Complete"]?.trim() || undefined,
    processingTime: row["Processing Time"]?.trim() || undefined,
    renewal: row["Renewal"]?.trim() || undefined,
    formLinks: row["Link to Forms"]
      ? row["Link to Forms"].split("\n").map((line) => line.trim()).filter(Boolean)
      : [],
    level: normalizeOrUndefined(row[LEVEL_COLUMN]),
  };
}

// some steps are really the same requirement, just listed once per provider
// type (e.g. "Determine license type" appears once for FCC, once for GFCC).
// same track + phase + name = merge into one step, combine the provider
// types and descriptions, and point anything that depended on either of the
// old ids at the merged one instead.
export function mergeVariants(steps: Step[]): Step[] {
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

// a Dependency value that doesn't match any real step ID silently drops that
// edge everywhere (dependency graph, phase ordering, etc.) with no error —
// surfaced separately so it can be warned about loudly and unit tested
export function findDanglingDependencies(
  steps: Step[],
): { step: Step; depId: string }[] {
  const stepsById = new Map(steps.map((s) => [s.id, s]));
  const dangling: { step: Step; depId: string }[] = [];
  for (const step of steps) {
    for (const depId of step.dependsOn) {
      if (!stepsById.has(depId)) dangling.push({ step, depId });
    }
  }
  return dangling;
}

function getCityData(city: string): CityData {
  const cached = cityCache.get(city);
  if (cached) return cached;

  const csvPath = path.join(DATA_DIR, city, "steps.csv");
  let rawSteps: Step[] = [];
  if (fs.existsSync(csvPath)) {
    const csvText = fs.readFileSync(csvPath, "utf-8");
    const headerRow = (parse(csvText, { to_line: 1 }) as string[][])[0] ?? [];
    validateHeaders(headerRow, city);

    rawSteps = (parse(csvText, { columns: true, skip_empty_lines: true }) as Row[])
      .filter((row) => row[STEP_ID_COLUMN]?.trim())
      .map(toStep);
  }
  const steps = mergeVariants(rawSteps);
  const stepsById = new Map(steps.map((s) => [s.id, s]));

  // this data is hand-edited, and typos in a comma-separated ID list are
  // easy to make — warn loudly instead of letting the dependency silently
  // disappear from the graph/phase order.
  for (const { step, depId } of findDanglingDependencies(steps)) {
    console.warn(
      `[steps.ts] ${city}: step "${step.name}" (${step.id}) depends on unknown step ID "${depId}" — this dependency will be ignored.`,
    );
  }

  const data: CityData = { steps, stepsById };
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

// Orders phases for a track using the dependency graph as the source of
// truth, instead of a human-maintained number in the Phase column (which
// may be missing, or inconsistent with the real dependencies).
//
// We contract the step-level dependency graph into a phase-level graph —
// an edge phaseA -> phaseB exists if any step in phaseA is a dependency of
// any step in phaseB — then topologically sort the phases. Phases with no
// dependency relationship between them (genuinely parallel/independent)
// are tied; ties are broken first by the Phase column's own leading number
// when the data happens to have one, then by which phase's steps appear
// first in the CSV.
export function phasesForTrack(city: string, track: string): string[] {
  return orderPhases(stepsForTrack(city, track), `${city}/${track}`);
}

// pulled out of phasesForTrack as a pure function (no disk access) so it can
// be unit tested directly against synthetic step lists
export function orderPhases(steps: Step[], label = ""): string[] {
  if (steps.length === 0) return [];

  const stepsById = new Map(steps.map((s) => [s.id, s]));

  // tie-break signals: first-seen row order, and the lowest phaseNumber
  // seen for that phase (Number.MAX_SAFE_INTEGER when the data has none)
  const firstSeenOrder = new Map<string, number>();
  const bestPhaseNumber = new Map<string, number>();
  steps.forEach((step, index) => {
    if (!firstSeenOrder.has(step.phase)) firstSeenOrder.set(step.phase, index);
    const current = bestPhaseNumber.get(step.phase);
    if (current === undefined || step.phaseNumber < current) {
      bestPhaseNumber.set(step.phase, step.phaseNumber);
    }
  });

  const allPhases = Array.from(firstSeenOrder.keys());

  // contract the step graph into a phase graph (same-phase edges don't
  // affect phase order — those are handled within a phase separately)
  const phaseEdges = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  for (const phase of allPhases) {
    phaseEdges.set(phase, new Set());
    inDegree.set(phase, 0);
  }

  for (const step of steps) {
    for (const depId of step.dependsOn) {
      const depStep = stepsById.get(depId);
      if (!depStep || depStep.phase === step.phase) continue;
      const before = depStep.phase;
      const after = step.phase;
      const edgesFromBefore = phaseEdges.get(before)!;
      if (!edgesFromBefore.has(after)) {
        edgesFromBefore.add(after);
        inDegree.set(after, inDegree.get(after)! + 1);
      }
    }
  }

  const compareTies = (a: string, b: string) => {
    const numA = bestPhaseNumber.get(a)!;
    const numB = bestPhaseNumber.get(b)!;
    if (numA !== numB) return numA - numB;
    return firstSeenOrder.get(a)! - firstSeenOrder.get(b)!;
  };

  // Kahn's algorithm: repeatedly take the best tie-broken phase among
  // whatever has no unresolved phase-level dependency left. If nothing
  // qualifies but phases remain, we have a phase-level cycle (possible
  // even when the step-level graph is a clean DAG) — break it by taking
  // the best tie-broken phase among ALL that remain, same escape hatch
  // used elsewhere in this file for step-level cycles.
  const remaining = new Set(allPhases);
  const order: string[] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining).filter((p) => inDegree.get(p) === 0);
    if (ready.length === 0) {
      console.warn(
        `[steps.ts]${label ? ` ${label}:` : ""} circular phase dependency detected among: ${Array.from(remaining).join(", ")} — falling back to phase number / CSV order for these.`,
      );
    }
    const candidates = ready.length > 0 ? ready : Array.from(remaining);
    candidates.sort(compareTies);
    const next = candidates[0];

    order.push(next);
    remaining.delete(next);
    for (const after of phaseEdges.get(next)!) {
      if (remaining.has(after)) {
        inDegree.set(after, inDegree.get(after)! - 1);
      }
    }
  }

  return order;
}

// preferred display order for known track names — anything not listed here
// falls back to CSV row order, so a future city's new track type still works
const TRACK_ORDER = ["Center", "Home"];

// all the distinct tracks (Home/Center) for a city, in a fixed display
// order — not CSV row order, which shifts any time rows get reorganized
// (e.g. grouped by track) and silently flips which card shows up first
export function tracks(city: string): string[] {
  return orderTracks(getCityData(city).steps);
}

// pulled out of tracks() as a pure function (no disk access) so it can be
// unit tested directly against synthetic step lists
export function orderTracks(steps: Step[]): string[] {
  const seen = new Set<string>();
  const firstSeenOrder: string[] = [];
  for (const step of steps) {
    if (!seen.has(step.track)) {
      seen.add(step.track);
      firstSeenOrder.push(step.track);
    }
  }

  return firstSeenOrder.sort((a, b) => {
    const rankA = TRACK_ORDER.indexOf(a);
    const rankB = TRACK_ORDER.indexOf(b);
    if (rankA !== -1 && rankB !== -1) return rankA - rankB;
    if (rankA !== -1) return -1;
    if (rankB !== -1) return 1;
    return firstSeenOrder.indexOf(a) - firstSeenOrder.indexOf(b);
  });
}

// every department that shows up anywhere in this track, no duplicates
// used in key agencies number for pathway overview, and in comparison page
export function keyAgencies(city: string, track: string): string[] {
  const seen = new Set<string>();
  for (const step of stepsForTrack(city, track)) {
    if (!step.department) continue;
    for (const department of step.department.split(",").map((d) => normalizeText(d))) {
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
  return groupIntoChains(stepsForPhase(city, track, phase));
}

// pulled out of dependencyChains as a pure function (no disk access) so it
// can be unit tested directly against synthetic step lists
export function groupIntoChains(phaseSteps: Step[]): Step[][] {
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
