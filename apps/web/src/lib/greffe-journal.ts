export type JournalKind = "note" | "decree" | "event" | "appointment";

export type JournalEntry = {
  id: string;
  at: string;
  kind: JournalKind;
  label: string;
  author: string;
  href: string;
};

export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  note: "Note",
  decree: "Décret",
  event: "Événement",
  appointment: "Rendez-vous",
};

type Touched = {
  id: number;
  updatedAt: string;
  authorName?: string | null;
  authorJobLabel?: string | null;
};

type Sources = {
  notes: (Touched & { title: string })[];
  decrees: (Touched & { reference: string; title: string })[];
  events: (Touched & { title: string })[];
  appointments: (Touched & { subject: string; citizenName: string })[];
};

/** Last touch on each record, newest first. Only the current state is known. */
export function greffeJournal(sources: Sources): JournalEntry[] {
  const entries: JournalEntry[] = [
    ...sources.notes.map((note) => entry(`note-${note.id}`, note, "note", note.title, "/mairie/notes")),
    ...sources.decrees.map((decree) =>
      entry(`decree-${decree.id}`, decree, "decree", `${decree.reference} — ${decree.title}`, "/mairie/decrets"),
    ),
    ...sources.events.map((municipalEvent) =>
      entry(`event-${municipalEvent.id}`, municipalEvent, "event", municipalEvent.title, "/mairie/evenements"),
    ),
    ...sources.appointments.map((appointment) =>
      entry(
        `appointment-${appointment.id}`,
        appointment,
        "appointment",
        `${appointment.subject} — ${appointment.citizenName}`,
        "/mairie/rendez-vous",
      ),
    ),
  ];

  return entries.sort((left, right) => right.at.localeCompare(left.at) || left.label.localeCompare(right.label, "fr"));
}

function entry(id: string, record: Touched, kind: JournalKind, label: string, href: string): JournalEntry {
  const name = record.authorName?.trim();
  const office = record.authorJobLabel?.trim();

  return {
    id,
    at: record.updatedAt,
    kind,
    label,
    href,
    author: office && name ? `${office} — ${name}` : office || name || "—",
  };
}
