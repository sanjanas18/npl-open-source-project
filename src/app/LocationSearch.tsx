"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cityLabel } from "@/lib/cities";

// the location dropdown on the landing page — shows exactly which cities
// have data, and routes to the selected one
export default function LocationSearch({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState(cities[0] ?? "");

  function handleExplore() {
    if (!selectedCity) return;
    router.push("/select-type");
  }

  return (
    <div className="mt-10 w-full max-w-md text-left">
      <label className="mb-1 block text-xs font-medium tracking-wide text-zinc-500">
        WHERE ARE YOU PLANNING TO OPERATE?
      </label>
      <div className="flex gap-2">
        <select
          value={selectedCity}
          onChange={(event) => setSelectedCity(event.target.value)}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
        >
          {cities.length === 0 && <option value="">No locations available</option>}
          {cities.map((city) => (
            <option key={city} value={city}>
              {cityLabel(city)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExplore}
          disabled={!selectedCity}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Explore the process →
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Child care requirements can vary by state and locality.{" "}
        {cities.length > 0
          ? `${cities.map(cityLabel).join(", ")} ${cities.length === 1 ? "is" : "are"} the only location${cities.length === 1 ? "" : "s"} available right now.`
          : "No locations are available yet."}
      </p>
    </div>
  );
}
