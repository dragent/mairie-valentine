import type { Appointment, MunicipalEvent } from "@/lib/api";

const TOWN_YEAR = 1889;
const CIVIL_YEAR = 2000;

export type DaySheetLine = {
  id: string;
  kind: "appointment" | "event";
  time: string;
  label: string;
  place: string;
};

type Meeting = Pick<Appointment, "id" | "subject" | "citizenName" | "scheduledAt" | "location" | "status">;
type Gathering = Pick<MunicipalEvent, "id" | "title" | "startsAt" | "endsAt" | "location">;

/** Appointments and events that fall on the town's current day, by the clock. */
export function daySheet(appointments: Meeting[], events: Gathering[], now = new Date()): DaySheetLine[] {
  const today = todayKey(now);
  const lines: (DaySheetLine & { sort: number })[] = [];

  for (const appointment of appointments) {
    if (appointment.status === "cancelled" || townKey(appointment.scheduledAt, now) !== today) {
      continue;
    }

    lines.push({
      id: `appointment-${appointment.id}`,
      kind: "appointment",
      time: clock(appointment.scheduledAt),
      label: `${appointment.subject} — ${appointment.citizenName}`,
      place: appointment.location?.trim() || "—",
      sort: minutes(appointment.scheduledAt),
    });
  }

  for (const municipalEvent of events) {
    const start = townKey(municipalEvent.startsAt, now);
    const end = municipalEvent.endsAt ? townKey(municipalEvent.endsAt, now) : start;

    if (start === null || end === null || start > today || end < today) {
      continue;
    }

    const startedEarlier = start < today;

    lines.push({
      id: `event-${municipalEvent.id}`,
      kind: "event",
      time: startedEarlier ? "en cours" : clock(municipalEvent.startsAt),
      label: municipalEvent.title,
      place: municipalEvent.location?.trim() || "—",
      sort: startedEarlier ? -1 : minutes(municipalEvent.startsAt),
    });
  }

  return lines
    .sort((left, right) => left.sort - right.sort || left.label.localeCompare(right.label, "fr"))
    .map(({ sort: _sort, ...line }) => line);
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

function minutes(iso: string): number {
  const date = new Date(iso);

  return date.getHours() * 60 + date.getMinutes();
}
