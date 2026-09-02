// phase specific page that shows the steps (only shown if 4 or more steps in a phase)
import Link from "next/link";
import { notFound } from "next/navigation";
import { dependencyChains, phasesForTrack, stepsForPhase, tracks } from "@/lib/steps";
import PhaseWorkstreams from "./PhaseWorkstreams";

export function generateStaticParams() {
  return tracks().flatMap((track) =>
    phasesForTrack(track).map((phase) => ({ track, phase })),
  );
}

export default async function PhaseDetail({
  params,
}: {
  params: Promise<{ track: string; phase: string }>;
}) {
  const { track: encodedTrack, phase: encodedPhase } = await params;
  const track = decodeURIComponent(encodedTrack);
  const phase = decodeURIComponent(encodedPhase);

  if (!tracks().includes(track)) {
    notFound();
  }

  const steps = stepsForPhase(track, phase);
  if (steps.length === 0) {
    notFound();
  }

  const chains = dependencyChains(track, phase);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4">
        <span className="text-sm font-semibold tracking-wide">
          NEW PRACTICE LAB <span className="font-normal text-zinc-400">| Child Care Navigator</span>
        </span>
        <Link href="/select-type" className="text-sm text-zinc-500">
          All Pathways
        </Link>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-8 py-12">
        <Link href={`/pathway/${encodeURIComponent(track)}`} className="text-xs text-zinc-400">
          {track}-Based Care
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-zinc-900">{phase}</h1>

        <PhaseWorkstreams chains={chains} phaseIds={steps.map((step) => step.id)} />

        <Link
          href={`/pathway/${encodeURIComponent(track)}`}
          className="mt-10 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          ← Back to pathway overview
        </Link>
      </main>
    </div>
  );
}
