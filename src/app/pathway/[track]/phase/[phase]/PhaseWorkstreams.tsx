"use client";

import { useState } from "react";
import type { Step } from "@/lib/steps";
// Is the box group component for each "can be done simultaneously workstream" on the phase page.
export default function PhaseWorkstreams({
  chains,
  phaseIds,
}: {
  chains: Step[][];
  phaseIds: string[];
}) {
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const allSteps = chains.flat();
  const openStep = allSteps.find((step) => step.id === openStepId) ?? null;
  const idSet = new Set(phaseIds);

  return (
    <div className="relative mt-8">
      {chains.length > 1 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500">
            ✛ These {chains.length} workstreams happen simultaneously
          </div>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-start gap-4">
        {chains.map((chain, chainIndex) => (
          <div key={chainIndex} className="rounded-lg border border-brand-amber/30 bg-white">
            <div className="border-b border-brand-amber/30 bg-amber-50 px-4 py-3">
              <div className="h-4" />
              <div className="text-xs text-zinc-500">
                {chain.length} step{chain.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex flex-col divide-y divide-zinc-100 px-4">
              {chain.map((step, stepIndex) => {
                const prerequisites = step.dependsOn
                  .filter((id) => idSet.has(id))
                  .map((id) => allSteps.find((s) => s.id === id))
                  .filter((s): s is Step => Boolean(s));
                return (
                  <div key={step.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600">
                        {stepIndex + 1}
                      </span>
                      <span className="font-medium text-zinc-900">{step.name}</span>
                    </div>
                    {prerequisites.length > 0 && (
                      <div className="ml-9 mt-1 text-xs text-zinc-500">
                        After {prerequisites.map((p) => p.name).join(", ")}
                      </div>
                    )}
                    <div className="ml-9 mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {step.department ?? "-"}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {step.timeToComplete ? `~${step.timeToComplete}` : "-"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenStepId(step.id)}
                      className="ml-9 mt-2 text-sm font-medium text-brand-amber"
                    >
                      Details →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {openStep && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpenStepId(null)} />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium tracking-wide text-zinc-400">
                {openStep.department ?? "-"}
              </span>
              <button
                type="button"
                onClick={() => setOpenStepId(null)}
                className="text-zinc-400"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <h2 className="mt-2 font-serif text-xl font-semibold text-zinc-900">
              {openStep.name}
            </h2>

            <p className="mt-4 whitespace-pre-line text-sm text-zinc-700">
              {openStep.description || "-"}
            </p>

            <div className="mt-6 flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-t border-zinc-100 pt-3">
                <span className="text-zinc-500">Est. time</span>
                <span className="font-medium text-zinc-800">
                  {openStep.timeToComplete ?? "-"}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-3">
                <span className="text-zinc-500">Cost</span>
                <span className="font-medium text-zinc-800">{openStep.cost ?? "-"}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-3">
                <span className="text-zinc-500">Processing time</span>
                <span className="font-medium text-zinc-800">
                  {openStep.processingTime ?? "-"}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-3">
                <span className="text-zinc-500">Renewal</span>
                <span className="font-medium text-zinc-800">{openStep.renewal ?? "-"}</span>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <div className="text-xs font-medium tracking-wide text-zinc-400">
                OFFICIAL RESOURCE
              </div>
              {openStep.formLink ? (
                <a
                  href={openStep.formLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-brand-amber underline"
                >
                  Visit official resource →
                </a>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">-</p>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
