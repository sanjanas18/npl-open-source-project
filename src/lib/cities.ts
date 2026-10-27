// display names for known cities, falls back to a title-cased version
// of the label itself for any city that doesn't have a nicer label yet
export const CITY_LABELS: Record<string, string> = {
  nyc: "New York City, NY",
};

export function cityLabel(city: string): string {
  return CITY_LABELS[city] ?? city.charAt(0).toUpperCase() + city.slice(1);
}
