// pathway overview page, lists the phases for a track (home or center)
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  dependencyLayers,
  keyAgencies,
  phasesForTrack,
  stepsForPhase,
  tracks,
} from "@/lib/steps";
import PathwayAccordion from "./PathwayAccordion";

export function generateStaticParams() {
  return tracks().map((track) => ({ track }));
}

export default async function PathwayOverview({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track: encodedTrack } = await params;
  const track = decodeURIComponent(encodedTrack);

  if (!tracks().includes(track)) {
    notFound();
  }

  const phaseNames = phasesForTrack(track);
  const phases = phaseNames.map((phase) => ({
    phase,
    steps: stepsForPhase(track, phase),
    layers: dependencyLayers(track, phase),
  }));

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4">
        <span className="text-sm font-semibold tracking-wide">
          NEW PRACTICE LAB <span className="font-normal text-zinc-400">| Child Care Navigator</span>
        </span>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/select-type">All Pathways</Link>
          <span>New York City, NY</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Link href="/select-type" className="text-xs text-zinc-400">
              All pathways
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md border border-zinc-300 px-2 py-0.5 text-xs font-medium tracking-wide text-zinc-600">
                {track.toUpperCase()}-BASED
              </span>
              <span className="text-xs text-zinc-400">New York City, NY</span>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-zinc-900">
              Pathway Overview
            </h1>
            <p className="mt-2 max-w-xl text-zinc-600">
              Opening a {track.toLowerCase()}-based child care program in New York City involves{" "}
              {phases.length} phases and multiple regulatory agencies.
            </p>
          </div>

          <div className="flex gap-8 text-right">
            <div>
              <div className="text-xs text-zinc-400">Phases</div>
              <div className="text-xl font-semibold text-zinc-900">{phases.length}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Key agencies</div>
              <div className="text-xl font-semibold text-zinc-900">{keyAgencies(track).length}</div>
            </div>
          </div>
        </div>

        {track === "Home" && (
          <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Limited data available for this pathway.</strong> Detailed timeline, cost,
            and processing-time fields are not consistently populated for home-based care in
            this data set. This overview shows the real registration steps as recorded.
          </div>
        )}

        <PathwayAccordion track={track} phases={phases} />

        <Link
          href="/select-type"
          className="mt-8 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600"
        >
          ← Compare pathways
        </Link>
      </main>
    </div>
  );
}
