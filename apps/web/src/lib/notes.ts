import type { Note } from "@/lib/api";

/** Desk memos stay on the register; archived ones are filed below. */
export function splitNotes<T extends { status: Note["status"] }>(
  notes: T[],
): { current: T[]; archived: T[] } {
  return {
    current: notes.filter((note) => note.status !== "archived"),
    archived: notes.filter((note) => note.status === "archived"),
  };
}

/** Byline shown under a memo: office first, then the signatory. */
export function noteByline(note: Pick<Note, "authorName" | "authorJobLabel">): string {
  const name = note.authorName?.trim();
  const office = note.authorJobLabel?.trim();

  if (office && name) {
    return `${office} — ${name}`;
  }

  return office || name || "—";
}
