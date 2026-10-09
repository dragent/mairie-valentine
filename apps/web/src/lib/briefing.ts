import type { Appointment, Decree, MunicipalEvent, Note } from "@/lib/api";

const TOWN_YEAR = 1889;
const CIVIL_YEAR = 2000;
const HORIZON_DAYS = 7;

export type BriefingLine = {
  id: number;
  label: string;
  detail: string;
  href: string;
};

export type DailyBriefing = {
  appointments: BriefingLine[];
  events: BriefingLine[];
  notesAtDesk: number;
  decrees: BriefingLine[];
};

type BriefingInput = {
  appointments: Pick<Appointment, "id" | "subject" | "citizenName" | "scheduledAt" | "status">[];
  events: Pick<MunicipalEvent, "id" | "title" | "startsAt" | "location">[];
  notes: Pick<Note, "status">[];
  decrees: Pick<Decree, "id" | "reference" | "title" | "status" | "endsAt">[];
  now?: Date;
};

/** What the desk should see for the town's current day, from registers already kept. */
export function dailyBriefing({ appointments, events, notes, decrees, now = new Date() }: BriefingInput): DailyBriefing {
  const today = todayKey(now);
  const last = addDays(today, HORIZON_DAYS);

  return {
    appointments: appointments
      .filter((appointment) => appointment.status === "scheduled" && townKey(appointment.scheduledAt, now) === today)
      .map((appointment) => ({
        id: appointment.id,
        label: `${appointment.subject} — ${appointment.citizenName}`,
        detail: clock(appointment.scheduledAt),
        href: "/mairie/rendez-vous",
      })),
    events: events
      .filter((municipalEvent) => townKey(municipalEvent.startsAt, now) === today)
      .map((municipalEvent) => ({
        id: municipalEvent.id,
        label: municipalEvent.title,
        detail: municipalEvent.location?.trim() || clock(municipalEvent.startsAt),
        href: "/mairie/evenements",
      })),
    notesAtDesk: notes.filter((note) => note.status !== "archived").length,
    decrees: decrees
      .filter((decree) => {
        if (decree.status !== "published" || !decree.endsAt) {
          return false;
        }

        const end = townKey(decree.endsAt, now);

        return end !== null && end >= today && end <= last;
      })
      .map((decree) => ({
        id: decree.id,
        label: `${decree.reference} — ${decree.title}`,
        detail: deadlinePhrase(townKey(decree.endsAt ?? "", now) ?? today, today),
        href: "/mairie/decrets",
      })),
  };
}

function deadlinePhrase(end: string, today: string): string {
  const days = dayDistance(today, end);

  if (days <= 0) {
    return "se termine aujourd'hui";
  }

  if (days === 1) {
    return "se termine demain";
  }

  return `se termine dans ${days} jours`;
}

function dayDistance(from: string, to: string): number {
  const start = keyToDate(from).getTime();
  const end = keyToDate(to).getTime();

  return Math.round((end - start) / 86_400_000);
}

function keyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function addDays(key: string, days: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);

  return stamp(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayKey(now: Date): string {
  return stamp(TOWN_YEAR, now.getMonth(), now.getDate());
}

function townKey(iso: string, now: Date): string | null {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year =
    date.getFullYear() >= CIVIL_YEAR ? date.getFullYear() - (now.getFullYear() - TOWN_YEAR) : date.getFullYear();

  return stamp(year, date.getMonth(), date.getDate());
}

function stamp(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clock(iso: string): string {
  const date = new Date(iso);

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
