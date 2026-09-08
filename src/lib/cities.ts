// display names for known city slugs — falls back to a title-cased version
// of the slug itself for any city that doesn't have a nicer label yet
export const CITY_LABELS: Record<string, string> = {
  nyc: "New York City, NY",
};

export function cityLabel(city: string): string {
  return CITY_LABELS[city] ?? city.charAt(0).toUpperCase() + city.slice(1);
}

// matches free-typed text (e.g. "New York City", "NYC", "nyc") against the
// list of cities that actually have data, case-insensitive
export function matchCity(query: string, availableCities: string[]): string | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  for (const city of availableCities) {
    const label = cityLabel(city).toLowerCase();
    if (city.toLowerCase() === normalized || label.includes(normalized)) {
      return city;
    }
  }
  return null;
}
