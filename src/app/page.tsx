// landing page, first thing you see, has the location search
import { listCities } from "@/lib/steps";
import LocationSearch from "./LocationSearch";

export default function Home() {
  const cities = listCities();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4">
        <span className="text-sm font-semibold tracking-wide">
          NEW PRACTICE LAB <span className="font-normal text-zinc-400">| Child Care Navigator</span>
        </span>
        <span className="text-sm text-zinc-400">New America</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center">
        <span className="mb-6 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600">
          New York City, NY — Guide available
        </span>
        <h1 className="max-w-2xl font-serif text-5xl font-semibold tracking-tight text-zinc-900">
          Understand what it takes to open a child care program.
        </h1>
        <p className="mt-4 max-w-xl text-zinc-600">
          Explore the steps, expected timeline, costs, agencies, and official resources involved
          in opening a child care business.
        </p>

        <LocationSearch cities={cities} />
      </main>

      <footer className="border-t border-zinc-200 bg-white px-8 py-6 text-center text-xs text-zinc-400">
        Requirements and estimates may vary by jurisdiction and individual circumstances.
      </footer>
    </div>
  );
}
