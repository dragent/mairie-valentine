export type SearchKind = "note" | "decree" | "event" | "appointment";

export type SearchHit = {
  id: string;
  kind: SearchKind;
  label: string;
  excerpt: string;
  href: string;
};

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  note: "Note",
  decree: "Décret",
  event: "Événement",
  appointment: "Rendez-vous",
};

type Sources = {
  notes: { id: number; title: string; body: string }[];
  decrees: { id: number; reference: string; title: string; body: string }[];
  events: { id: number; title: string; description?: string | null }[];
  appointments: { id: number; subject: string; citizenName: string; notes?: string | null }[];
};

/** One query over the registers the caller is allowed to pass in. */
export function searchRegisters(query: string, sources: Sources): SearchHit[] {
  const needle = query.trim().toLocaleLowerCase("fr");

  if (needle === "") {
    return [];
  }

  const hits: SearchHit[] = [];

  for (const note of sources.notes) {
    const excerpt = matching(needle, [note.title, note.body]);

    if (excerpt !== null) {
      hits.push({ id: `note-${note.id}`, kind: "note", label: note.title, excerpt, href: "/mairie/notes" });
    }
  }

  for (const decree of sources.decrees) {
    const excerpt = matching(needle, [decree.reference, decree.title, decree.body]);

    if (excerpt !== null) {
      hits.push({
        id: `decree-${decree.id}`,
        kind: "decree",
        label: `${decree.reference} — ${decree.title}`,
        excerpt,
        href: "/mairie/decrets",
      });
    }
  }

  for (const municipalEvent of sources.events) {
    const excerpt = matching(needle, [municipalEvent.title, municipalEvent.description]);

    if (excerpt !== null) {
      hits.push({
        id: `event-${municipalEvent.id}`,
        kind: "event",
        label: municipalEvent.title,
        excerpt,
        href: "/mairie/evenements",
      });
    }
  }

  for (const appointment of sources.appointments) {
    const excerpt = matching(needle, [appointment.subject, appointment.citizenName, appointment.notes]);

    if (excerpt !== null) {
      hits.push({
        id: `appointment-${appointment.id}`,
        kind: "appointment",
        label: `${appointment.subject} — ${appointment.citizenName}`,
        excerpt,
        href: "/mairie/rendez-vous",
      });
    }
  }

  return hits;
}

function matching(needle: string, fields: (string | null | undefined)[]): string | null {
  for (const field of fields) {
    const text = field?.trim() ?? "";

    if (text.toLocaleLowerCase("fr").includes(needle)) {
      return text.length > 180 ? `${text.slice(0, 177)}…` : text;
    }
  }

  return null;
}
