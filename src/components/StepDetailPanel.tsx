"use client";

import type { Step } from "@/lib/steps";

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

type StepDetailPanelProps = {
  step: Step | null;
  prerequisites?: Step[];
  dependents?: Step[];
  onClose: () => void;
  onSelectStep?: (id: string) => void;
};

export default function StepDetailPanel({
  step,
  prerequisites = [],
  dependents = [],
  onClose,
  onSelectStep,
}: StepDetailPanelProps) {
  if (!step) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium tracking-wide text-zinc-400">
            {step.department ?? "-"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <h2 className="mt-2 font-serif text-xl font-semibold text-zinc-900">
          {step.name}
        </h2>

        <p className="mt-4 whitespace-pre-line text-sm text-zinc-700">
          {step.description || "-"}
        </p>

        <div className="mt-6 flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-t border-zinc-100 pt-3">
            <span className="text-zinc-500">Est. time</span>
            <span className="font-medium text-zinc-800">
              {step.timeToComplete ?? "-"}
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-3">
            <span className="text-zinc-500">Cost</span>
            <span className="font-medium text-zinc-800">{step.cost ?? "-"}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-3">
            <span className="text-zinc-500">Processing time</span>
            <span className="font-medium text-zinc-800">
              {step.processingTime ?? "-"}
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-3">
            <span className="text-zinc-500">Renewal</span>
            <span className="font-medium text-zinc-800">{step.renewal ?? "-"}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-3">
            <span className="text-zinc-500">Government level</span>
            <span className="font-medium text-zinc-800">{step.level ?? "-"}</span>
          </div>
        </div>

        {prerequisites.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <div className="text-xs font-medium tracking-wide text-zinc-400">DEPENDS ON</div>
            <ul className="mt-2 flex flex-col gap-1">
              {prerequisites.map((prereq) => (
                <li key={prereq.id}>
                  {onSelectStep ? (
                    <button
                      type="button"
                      onClick={() => onSelectStep(prereq.id)}
                      className="text-sm text-brand-amber underline"
                    >
                      {prereq.name}
                    </button>
                  ) : (
                    <span className="text-sm text-zinc-700">{prereq.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {dependents.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <div className="text-xs font-medium tracking-wide text-zinc-400">UNLOCKS</div>
            <ul className="mt-2 flex flex-col gap-1">
              {dependents.map((dependent) => (
                <li key={dependent.id}>
                  {onSelectStep ? (
                    <button
                      type="button"
                      onClick={() => onSelectStep(dependent.id)}
                      className="text-sm text-brand-amber underline"
                    >
                      {dependent.name}
                    </button>
                  ) : (
                    <span className="text-sm text-zinc-700">{dependent.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <div className="text-xs font-medium tracking-wide text-zinc-400">
            OFFICIAL RESOURCE{step.formLinks.length > 1 ? "S" : ""}
          </div>
          {step.formLinks.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {step.formLinks.map((entry, index) =>
                isUrl(entry) ? (
                  <li key={index}>
                    <a
                      href={entry}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand-amber underline"
                    >
                      {step.formLinks.length > 1
                        ? `Visit resource ${index + 1} →`
                        : "Visit official resource →"}
                    </a>
                  </li>
                ) : (
                  <li key={index} className="text-sm text-zinc-600">
                    {entry}
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">-</p>
          )}
        </div>
      </aside>
    </>
  );
}
