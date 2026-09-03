"use client";

import type { Step } from "@/lib/steps";

type StepDetailPanelProps = {
  step: Step | null;
  onClose: () => void;
};

export default function StepDetailPanel({ step, onClose }: StepDetailPanelProps) {
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
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <div className="text-xs font-medium tracking-wide text-zinc-400">
            OFFICIAL RESOURCE
          </div>
          {step.formLink ? (
            <a
              href={step.formLink}
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
  );
}
