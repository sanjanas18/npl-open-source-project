"use client";

import { useState } from "react";
import type { Step } from "@/lib/steps";
import StepDetail from "./StepDetail";

// Client facing accordian drop down component
type PhaseData = {
  phase: string;
  steps: Step[];
  chains: Step[][];
};

const ACCENT_BY_TRACK: Record<string, string> = {
  Home: "border-brand-green",
  Center: "border-zinc-300",
};

export default function PathwayAccordion({
  track,
  phases,
}: {
  track: string;
  phases: PhaseData[];
}) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [openStepId, setOpenStepId] = useState<string | null>(null);

  const allSteps = phases.flatMap((p) => p.steps);
  const stepsById = new Map(allSteps.map((step) => [step.id, step]));
  const openStep = openStepId ? (stepsById.get(openStepId) ?? null) : null;
  const prerequisites = openStep
    ? openStep.dependsOn.map((id) => stepsById.get(id)).filter((s): s is Step => Boolean(s))
    : [];
  const dependents = openStep
    ? allSteps.filter((s) => s.dependsOn.includes(openStep.id))
    : [];

  return (
    <>
      <ol className="mt-6 flex flex-col gap-3">
        {phases.map(({ phase, steps, chains }, index) => {
          const isExpanded = expandedPhase === phase;
          const isSingleWorkstream = chains.length <= 1;

          return (
            <li
              key={phase}
              className={`overflow-hidden rounded-lg border bg-white ${
                ACCENT_BY_TRACK[track] ?? "border-zinc-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                className="flex w-full items-center justify-between px-5 py-4"
                aria-expanded={isExpanded}
              >
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
                  <span className="text-zinc-400" aria-hidden="true">
                    {isExpanded ? "▴" : "▾"}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-100 px-5 py-4">
                  {!isSingleWorkstream && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-zinc-200" />
                      <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500">
                        ✛ These {chains.length} workstreams happen simultaneously
                      </div>
                      <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                  )}

                  {isSingleWorkstream ? (
                    <ChainLayers chain={chains[0] ?? []} onOpen={setOpenStepId} />
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-stretch gap-4">
                      {chains.map((chain, chainIndex) => (
                        <div
                          key={chainIndex}
                          className="flex flex-col rounded-lg border border-brand-amber/30 bg-white"
                        >
                          <div className="h-3 rounded-t-lg bg-amber-50" />
                          <div className="px-4">
                            <ChainLayers chain={chain} onOpen={setOpenStepId} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {openStep && (
        <StepDetail
          step={openStep}
          prerequisites={prerequisites}
          dependents={dependents}
          onClose={() => setOpenStepId(null)}
          onSelectStep={setOpenStepId}
        />
      )}
    </>
  );
}

function StepRow({
  step,
  stepIndex,
  chain,
  onOpen,
  showNumber = true,
}: {
  step: Step;
  stepIndex: number;
  chain: Step[];
  onOpen: () => void;
  showNumber?: boolean;
}) {
  const stepPrereqs = step.dependsOn
    .map((id) => chain.find((s) => s.id === id))
    .filter((s): s is Step => Boolean(s));
  const indent = showNumber ? "ml-9" : "ml-0";

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        {showNumber && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-600">
            {stepIndex + 1}
          </span>
        )}
        <span className="font-medium text-zinc-900">{step.name}</span>
      </div>
      {stepPrereqs.length > 0 && (
        <div className={`${indent} mt-1 text-xs text-zinc-500`}>
          After {stepPrereqs.map((p) => p.name).join(", ")}
        </div>
      )}
      <div className={`${indent} mt-2 flex flex-wrap items-center gap-2`}>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
          {step.department ?? "-"}
        </span>
        <span className="text-xs text-zinc-400">
          {step.timeToComplete ? `~${step.timeToComplete}` : "-"}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={`${indent} mt-2 text-sm font-medium text-brand-amber`}
      >
        Details →
      </button>
    </div>
  );
}

// Groups steps in a chain by dependency layer — steps whose in-scope
// prerequisites are all resolved go in the same layer (can happen in parallel).
function computeLayers(chain: Step[]): Step[][] {
  const chainIds = new Set(chain.map((s) => s.id));
  const remaining = new Map(chain.map((s) => [s.id, s]));
  const resolved = new Set<string>();
  const layers: Step[][] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining.values()).filter((step) =>
      step.dependsOn
        .filter((id) => chainIds.has(id))
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

// Renders a chain as grouped dependency layers. Steps in the same layer
// are shown side-by-side to indicate they can happen in parallel.
function ChainLayers({
  chain,
  onOpen,
}: {
  chain: Step[];
  onOpen: (id: string) => void;
}) {
  const layers = computeLayers(chain);
  let stepCounter = 0;

  return (
    <div className="flex flex-col gap-2">
      {layers.map((layer, layerIndex) => {
        const isParallel = layer.length > 1;
        const layerStartIndex = stepCounter;

        return (
          <div key={layerIndex}>
            {isParallel && (
              <div className="my-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500">
                  ✛ These {layer.length} steps can happen simultaneously
                </div>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>
            )}

            {isParallel ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-stretch gap-3">
                {layer.map((step, i) => {
                  const idx = layerStartIndex + i;
                  stepCounter++;
                  return (
                    <div
                      key={step.id}
                      className="rounded-lg border border-brand-amber/30 bg-amber-50/30 px-4"
                    >
                      <StepRow
                        step={step}
                        stepIndex={idx}
                        chain={chain}
                        onOpen={() => onOpen(step.id)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100">
                {layer.map((step) => {
                  const idx = stepCounter;
                  stepCounter++;
                  return (
                    <StepRow
                      key={step.id}
                      step={step}
                      stepIndex={idx}
                      chain={chain}
                      onOpen={() => onOpen(step.id)}
                    />
                  );
                })}
              </div>
            )}

            {isParallel && layerIndex < layers.length - 1 && (
              <div className="my-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <div className="text-xs text-zinc-400">then</div>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
