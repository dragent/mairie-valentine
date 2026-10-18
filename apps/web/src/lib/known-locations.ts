/** Places already written on an event or an appointment, in French alphabetical order. */
export function knownLocations(places: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const place of places) {
    const trimmed = place?.trim() ?? "";
    const key = trimmed.toLocaleLowerCase("fr");

    if (key === "" || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(trimmed);
  }

  return unique.sort((left, right) => left.localeCompare(right, "fr"));
}
