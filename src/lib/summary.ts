import fs from "fs";
import path from "path";

// manually-curated totals for the summary table (compare view + pathway
// detail aggregate card) — kept separate from steps.csv because per-step
// Time to Complete / Cost values use inconsistent units and don't sum
// cleanly into one overall estimate. A human fills these in by hand.
export type TrackSummary = {
  estimatedTimeline?: string;
  estimatedCost?: string;
};

type SummaryFile = Record<string, TrackSummary>;

const DATA_DIR = path.join(process.cwd(), "data");

const summaryCache = new Map<string, SummaryFile>();

function getSummaryFile(city: string): SummaryFile {
  const cached = summaryCache.get(city);
  if (cached) return cached;

  const jsonPath = path.join(DATA_DIR, city, "summary.json");
  let data: SummaryFile = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (parsed && typeof parsed === "object") {
        data = parsed as SummaryFile;
      }
    } catch {
      // malformed summary.json shouldn't take down the whole page/build —
      // just fall back to no summary for this city, same as a missing file
      data = {};
    }
  }

  summaryCache.set(city, data);
  return data;
}

export function getTrackSummary(city: string, track: string): TrackSummary {
  const entry = getSummaryFile(city)[track] ?? {};
  return {
    estimatedTimeline: entry.estimatedTimeline?.trim() || undefined,
    estimatedCost: entry.estimatedCost?.trim() || undefined,
  };
}
