// step detail page, shows everything about one single step (one csv row)
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDependents, getPrerequisites, stepsById } from "@/lib/steps";

export default async function StepDetail({
  params,
}: {
  params: Promise<{ track: string; id: string }>;
}) {
  const { track: encodedTrack, id: encodedId } = await params;
  const track = decodeURIComponent(encodedTrack);
  const id = decodeURIComponent(encodedId);

  const step = stepsById.get(id);
  if (!step || step.track !== track) {
    notFound();
  }

  const prerequisites = getPrerequisites(step.id);
  const dependents = getDependents(step.id);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4">
        <span className="text-sm font-semibold tracking-wide">
          NEW PRACTICE LAB <span className="font-normal text-zinc-400">| Child Care Navigator</span>
        </span>
        <Link href="/select-type" className="text-sm text-zinc-500">
          Switch care type
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 px-8 py-12 sm:grid-cols-[1fr_280px]">
        <div>
          <Link
            href={`/pathway/${encodeURIComponent(track)}/phase/${encodeURIComponent(step.phase)}`}
            className="text-xs text-zinc-400"
          >
            ← Back to {step.phase}
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-zinc-900">{step.name}</h1>
          <p className="mt-3 whitespace-pre-line text-zinc-700">{step.description || "-"}</p>

          {prerequisites.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-zinc-900">Prerequisites</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {prerequisites.map((prereq) => (
                  <li key={prereq.id}>
                    <Link
                      href={`/pathway/${encodeURIComponent(prereq.track)}/step/${encodeURIComponent(prereq.id)}`}
                      className="text-sm text-zinc-600 underline"
                    >
                      {prereq.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dependents.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-zinc-900">Unlocks</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {dependents.map((dependent) => (
                  <li key={dependent.id}>
                    <Link
                      href={`/pathway/${encodeURIComponent(dependent.track)}/step/${encodeURIComponent(dependent.id)}`}
                      className="text-sm text-zinc-600 underline"
                    >
                      {dependent.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <div className="text-xs font-medium tracking-wide text-zinc-400">
              OFFICIAL RESOURCE
            </div>
            {step.formLink ? (
              <a
                href={step.formLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-md bg-navy px-4 py-2 text-sm font-medium text-white"
              >
                Continue on official resource →
              </a>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">-</p>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 text-sm">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium tracking-wide text-zinc-400">KEY FACTS</div>
            <div className="mt-3">
              <div className="text-xs text-zinc-400">Estimated time</div>
              <div className="text-zinc-800">{step.timeToComplete ?? "-"}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-zinc-400">Estimated cost</div>
              <div className="text-zinc-800">{step.cost ?? "-"}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-zinc-400">Processing time</div>
              <div className="text-zinc-800">{step.processingTime ?? "-"}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-zinc-400">Renewal</div>
              <div className="text-zinc-800">{step.renewal ?? "-"}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-zinc-400">Government level</div>
              <div className="text-zinc-800">{step.level ?? "-"}</div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-xs font-medium tracking-wide text-zinc-400">
              RESPONSIBLE AGENCY
            </div>
            <div className="mt-2 text-zinc-800">{step.department ?? "-"}</div>
          </div>
        </aside>
      </main>
    </div>
  );
}
