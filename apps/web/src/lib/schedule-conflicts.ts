import type { Appointment, MunicipalEvent } from "@/lib/api";

const TOWN_YEAR = 1889;
const CIVIL_YEAR = 2000;

export type ScheduleConflict = {
  id: string;
  message: string;
};

type Meeting = Pick<Appointment, "id" | "subject" | "scheduledAt" | "durationMinutes" | "location" | "status">;
type Gathering = Pick<MunicipalEvent, "id" | "title" | "startsAt" | "endsAt" | "location">;

/** Overlapping desk slots, and a visit that shares a room with an event. */
export function scheduleConflicts(appointments: Meeting[], events: Gathering[], now = new Date()): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const open = appointments.filter((appointment) => appointment.status !== "cancelled");

  for (let index = 0; index < open.length; index += 1) {
    const left = open[index];

    for (const right of open.slice(index + 1)) {
      if (overlaps(span(left.scheduledAt, left.durationMinutes, now), span(right.scheduledAt, right.durationMinutes, now))) {
        const [first, second] = [left, right].sort((a, b) => a.id - b.id);
        conflicts.push({
          id: `appointment-${first.id}-${second.id}`,
          message: `« ${first.subject} » et « ${second.subject} » se chevauchent.`,
        });
      }
    }

    const place = normalizePlace(left.location);

    if (place === "") {
      continue;
    }

    for (const municipalEvent of events) {
      if (normalizePlace(municipalEvent.location) !== place) {
        continue;
      }

      const eventSpan = interval(municipalEvent.startsAt, municipalEvent.endsAt, now);

      if (overlaps(span(left.scheduledAt, left.durationMinutes, now), eventSpan)) {
        conflicts.push({
          id: `appointment-${left.id}-event-${municipalEvent.id}`,
          message: `« ${left.subject} » et l'événement « ${municipalEvent.title} » occupent le même lieu.`,
        });
      }
    }
  }

  return conflicts;
}

function span(iso: string, durationMinutes: number, now: Date): { start: number; end: number } | null {
  const start = townMillis(iso, now);

  if (start === null) {
    return null;
  }

  return { start, end: start + Math.max(durationMinutes, 1) * 60_000 };
}

function interval(startIso: string, endIso: string | null | undefined, now: Date): { start: number; end: number } | null {
  const start = townMillis(startIso, now);
  const end = endIso ? townMillis(endIso, now) : null;

  if (start === null) {
    return null;
  }

  return { start, end: end !== null && end > start ? end : start + 60_000 };
}

function overlaps(left: { start: number; end: number } | null, right: { start: number; end: number } | null): boolean {
  if (left === null || right === null) {
    return false;
  }

  return left.start < right.end && right.start < left.end;
}

function normalizePlace(location: string | null | undefined): string {
  return (location ?? "").trim().toLocaleLowerCase("fr").replace(/\s+/g, " ");
}

function townMillis(iso: string, now: Date): number | null {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year =
    date.getFullYear() >= CIVIL_YEAR ? date.getFullYear() - (now.getFullYear() - TOWN_YEAR) : date.getFullYear();

  return new Date(year, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).getTime();
}
