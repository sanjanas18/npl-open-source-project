// compare page, lets you pick home or center based and see them side by side
import Link from "next/link";
import { tracks, stepsForTrack, keyAgencies } from "@/lib/steps";

// this page isn't city-aware in the URL yet, so it just shows NYC directly
const CITY = "nyc";

const TRACK_COPY: Record<
  string,
  {
    label: string;
    tagline: string;
    accent: string;
    location: string;
    registeredWith: string;
  }
> = {
  Home: {
    label: "Home-Based Child Care",
    tagline: "Care provided from your home.",
    accent: "border-brand-green",
    location: "Personal residence, such as a one- or two-family dwelling or an apartment unit in a legally classified residential building",
    registeredWith: "-",
  },
  Center: {
    label: "Center-Based Child Care",
    tagline: "Care provided from a dedicated facility.",
    accent: "border-navy",
    location: "Dedicated non-residential facility",
    registeredWith: "-",
  },
};

export default function ComparePage() {
  const allTracks = tracks(CITY);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4">
        <span className="text-sm font-semibold tracking-wide">
          NEW PRACTICE LAB <span className="font-normal text-zinc-400">| Child Care Navigator</span>
        </span>
        <Link href="/" className="text-sm text-zinc-500">
          ← Back
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <h1 className="font-serif text-3xl font-semibold text-zinc-900">
          Compare Child Care Options
        </h1>
        <p className="mt-2 text-zinc-600">
          Choose a pathway to explore the full licensing or registration process for New York
          City, NY.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {allTracks.map((track) => {
            const copy = TRACK_COPY[track];
            const steps = stepsForTrack(CITY, track);
            const agencies = keyAgencies(CITY, track);
            return (
              <div
                key={track}
                className={`flex flex-col rounded-lg border-t-4 bg-white p-6 ${copy?.accent ?? "border-zinc-300"}`}
              >
                <span className="text-xs font-semibold tracking-wide text-zinc-400">
                  {track.toUpperCase()}-BASED CHILD CARE
                </span>
                <h2 className="mt-1 font-serif text-xl font-semibold text-zinc-900">
                  {copy?.tagline ?? track}
                </h2>

                <dl className="mt-4 flex flex-col divide-y divide-zinc-100 rounded-md border border-zinc-100 text-sm">
                  <div className={`px-3 py-2 ${(copy?.location ?? "").length > 50 ? "flex flex-col gap-1" : "flex justify-between"}`}>
                    <dt className="text-zinc-500">Location</dt>
                    <dd className="font-medium text-zinc-800">{copy?.location ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-zinc-500">Key agencies</dt>
                    <dd className="font-medium text-zinc-800">{agencies.join(", ") || "-"}</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-zinc-500">Estimated timeline</dt>
                    <dd className="text-zinc-400">-</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-zinc-500">Estimated cost</dt>
                    <dd className="text-zinc-400">-</dd>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <dt className="text-zinc-500">Total steps</dt>
                    <dd className="font-medium text-zinc-800">{steps.length}</dd>
                  </div>
                </dl>

                <Link
                  href={`/pathway/${CITY}/${encodeURIComponent(track)}`}
                  className={`mt-6 rounded-md px-4 py-2 text-center text-sm font-medium text-white ${track === "Home" ? "bg-brand-green" : "bg-navy"
                    }`}
                >
                  Explore {track}-Based Path →
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-12 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="px-4 py-3 font-semibold text-zinc-900">Key differences</th>
                {allTracks.map((track) => (
                  <th key={track} className="px-4 py-3 font-semibold text-zinc-900">
                    {track}-Based
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Key agencies", values: allTracks.map((t) => keyAgencies(CITY, t).join(", ") || "-") },
                { label: "Total steps", values: allTracks.map((t) => String(stepsForTrack(CITY, t).length)) },
                { label: "Regulatory complexity", values: allTracks.map(() => "-") },
                { label: "Facility investment", values: allTracks.map(() => "-") },
              ].map((row) => (
                <tr key={row.label} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 text-zinc-500">{row.label}</td>
                  {row.values.map((value, i) => (
                    <td key={i} className="px-4 py-3 text-zinc-800">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <span className="text-xs font-semibold tracking-wide text-zinc-400">
            OTHER CHILD CARE TYPES
          </span>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900">School-Based Child Care</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Child care operated within or in partnership with an accredited school or
                educational institution. Not yet covered by this data set.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900">Legally Exempt Child Care</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Some arrangements are exempt from standard licensing. Not yet covered by this
                data set.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
