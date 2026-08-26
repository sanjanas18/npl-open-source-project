"use client";

import Link from "next/link";
import { useState } from "react";
import type { Step } from "@/lib/steps";
import { DEDICATED_PAGE_STEP_THRESHOLD } from "@/lib/constants";

// Client facing accordian drop down component
type PhaseData = {
  phase: string;
  steps: Step[];
  layers: Step[][];
};

function inPhaseDependencies(step: Step, phaseSteps: Step[]): Step[] {
  return step.dependsOn
    .map((id) => phaseSteps.find((s) => s.id === id))
    .filter((s): s is Step => Boolean(s));
}

export default function PathwayAccordion({
  track,
  phases,
}: {
  track: string;
  phases: PhaseData[];
}) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  if (track === "Home") {
    return (
      <ol className="mt-6 flex flex-col gap-4">
        {phases.map(({ phase, steps }, index) => (
          <li key={phase} className="rounded-lg border-l-4 border-brand-green bg-white px-6 py-5">
            <div className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-green text-xs font-medium text-brand-green">
                {index + 1}
              </span>
              <div>
                <div className="font-semibold text-zinc-900">{phase}</div>
                <ul className="mt-2 flex flex-col gap-1">
                  {steps.map((step) => (
                    <li key={step.id} className="text-sm text-zinc-600">
                      {"•"} {step.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="mt-6 flex flex-col gap-3">
      {phases.map(({ phase, steps, layers }, index) => {
        const isExpanded = expandedPhase === phase;
        const needsDedicatedPage = steps.length >= DEDICATED_PAGE_STEP_THRESHOLD;
        const flatOrdered = layers.flat();

        return (
          <li key={phase} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs font-medium text-zinc-600">
                  {index + 1}
                </span>
                <div className="font-medium text-zinc-900">{phase}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right text-sm">
                  <div className="text-xs text-zinc-400">Steps</div>
                  <div className="font-medium text-zinc-800">{steps.length}</div>
                </div>
                {needsDedicatedPage ? (
                  <Link
                    href={`/pathway/${encodeURIComponent(track)}/phase/${encodeURIComponent(phase)}`}
                    className="rounded-md border border-brand-amber/40 bg-amber-50 px-3 py-1.5 text-sm font-medium text-brand-amber"
                  >
                    Explore phase {"→"}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                    className="text-zinc-400"
                    aria-label={isExpanded ? "Collapse phase" : "Expand phase"}
                  >
                    {isExpanded ? "▴" : "▾"}
                  </button>
                )}
              </div>
            </div>

            {!needsDedicatedPage && isExpanded && (
              <div className="border-t border-zinc-100 px-5 py-4">
                {layers.some((layer) => layer.length > 1) && (
                  <div className="mb-3 inline-block rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
                    Dashed border = can happen in parallel
                  </div>
                )}
                <ol className="flex flex-col gap-3">
                  {flatOrdered.map((step, stepIndex) => {
                    const layer = layers.find((l) => l.includes(step));
                    const isParallel = (layer?.length ?? 1) > 1;
                    const prerequisites = inPhaseDependencies(step, steps);
                    return (
                      <li
                        key={step.id}
                        className={`rounded-md px-4 py-3 ${
                          isParallel
                            ? "border border-dashed border-zinc-300"
                            : "border border-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600">
                            {stepIndex + 1}
                          </span>
                          <Link
                            href={`/pathway/${encodeURIComponent(track)}/step/${encodeURIComponent(step.id)}`}
                            className="font-medium text-zinc-900 hover:underline"
                          >
                            {step.name}
                          </Link>
                        </div>
                        {prerequisites.length > 0 && (
                          <div className="ml-9 mt-1 text-xs text-zinc-500">
                            After {prerequisites.map((p) => p.name).join(", ")}
                          </div>
                        )}
                        {step.department && (
                          <div className="ml-9 mt-1 text-xs text-zinc-400">{step.department}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
