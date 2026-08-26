// landing page, first thing you see, just static copy and a link to explore
import Link from "next/link";

export default function Home() {
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

        <div className="mt-10 w-full max-w-md text-left">
          <label className="mb-1 block text-xs font-medium tracking-wide text-zinc-500">
            WHERE ARE YOU PLANNING TO OPERATE?
          </label>
          <div className="flex gap-2">
            <input
              disabled
              placeholder="e.g. New York City, NY"
              className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-500"
            />
            <Link
              href="/select-type"
              className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white"
            >
              Explore the process →
            </Link>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Child care requirements can vary by state and locality. NYC is the only location
            available right now.
          </p>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white px-8 py-6 text-center text-xs text-zinc-400">
        Requirements and estimates may vary by jurisdiction and individual circumstances.
      </footer>
    </div>
  );
}
