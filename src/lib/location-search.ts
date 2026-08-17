interface SearchableLocation {
  city: string;
  country: string;
}
export function normalizeLocationSearch(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function matchesLocation(location: SearchableLocation, query: string): boolean {
  const search = normalizeLocationSearch(query);
  return !search || normalizeLocationSearch(`${location.city} ${location.country}`).includes(search);
}
