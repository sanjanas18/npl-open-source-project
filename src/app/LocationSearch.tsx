"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cityLabel, matchCity } from "@/lib/cities";

// the location search box on the landing page — matches what's typed
// against the cities that actually have data and routes there
export default function LocationSearch({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleExplore() {
    // empty input just goes to the only available city, same as the button
    // always did before search existed
    if (!query.trim() && cities.length > 0) {
      setError(null);
      router.push("/select-type");
      return;
    }

    const matched = matchCity(query, cities);
    if (!matched) {
      setError(`"${query.trim()}" isn't available yet.`);
      return;
    }
    setError(null);
    router.push("/select-type");
  }

  return (
    <div className="mt-10 w-full max-w-md text-left">
      <label className="mb-1 block text-xs font-medium tracking-wide text-zinc-500">
        WHERE ARE YOU PLANNING TO OPERATE?
      </label>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleExplore();
          }}
          placeholder="e.g. New York City, NY"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
        />
        <button
          type="button"
          onClick={handleExplore}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white"
        >
          Explore the process →
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-400">
          Child care requirements can vary by state and locality.{" "}
          {cities.map(cityLabel).join(", ")} {cities.length === 1 ? "is" : "are"} the only
          location{cities.length === 1 ? "" : "s"} available right now.
        </p>
      )}
    </div>
  );
}
