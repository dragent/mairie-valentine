export type NoteMention = {
  kind: "decree" | "citizen";
  label: string;
  href: string;
};

const REFERENCE = /\bDEC-\d{4}-\d{3}\b/gi;

/** Decree references and citizen names already written elsewhere, in reading order. */
export function noteMentions(
  body: string,
  sources: { decrees: { reference: string }[]; citizens: string[] },
): NoteMention[] {
  const known = new Map(sources.decrees.map((decree) => [decree.reference.toUpperCase(), decree.reference]));
  const mentions: (NoteMention & { at: number })[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(REFERENCE)) {
    const found = known.get(match[0].toUpperCase());

    if (found === undefined || seen.has(found)) {
      continue;
    }

    seen.add(found);
    mentions.push({ kind: "decree", label: found, href: "/mairie/decrets", at: match.index ?? 0 });
  }

  const ranges: { start: number; end: number }[] = [];
  const names = [...new Set(sources.citizens.map((name) => name.trim()).filter((name) => name.length >= 3))].sort(
    (left, right) => right.length - left.length,
  );

  for (const name of names) {
    for (const range of phraseRanges(body, name)) {
      if (ranges.some((taken) => range.start < taken.end && taken.start < range.end)) {
        continue;
      }

      ranges.push(range);
      const key = name.toLocaleLowerCase("fr");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      mentions.push({ kind: "citizen", label: name, href: "/mairie/rendez-vous", at: range.start });
    }
  }

  return mentions.sort((left, right) => left.at - right.at).map(({ at: _at, ...mention }) => mention);
}

function phraseRanges(body: string, name: string): { start: number; end: number }[] {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`, "giu");
  const ranges: { start: number; end: number }[] = [];

  for (const match of body.matchAll(pattern)) {
    const boundary = match[1]?.length ?? 0;
    const start = (match.index ?? 0) + boundary;
    ranges.push({ start, end: start + name.length });
  }

  return ranges;
}
