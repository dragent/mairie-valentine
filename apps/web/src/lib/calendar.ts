import type { Appointment, MunicipalEvent } from "@/lib/api";

export type CalendarEntry = {
  id: string;
  kind: "event" | "appointment";
  label: string;
  time: string;
  href: string;
  muted: boolean;
};

export type CalendarCell = {
  key: string;
  date: Date;
  day: number;
  inMonth: boolean;
  entries: CalendarEntry[];
};

type Placed = CalendarEntry & { sort: number };

export function buildMonth(
  year: number,
  monthIndex: number,
  events: MunicipalEvent[],
  appointments: Appointment[],
): CalendarCell[] {
  const cells = visibleDays(year, monthIndex);
  const byDay = new Map<string, Placed[]>();

  for (const municipalEvent of events) {
    place(byDay, spanKeys(municipalEvent.startsAt, municipalEvent.endsAt), (key, index) => ({
      id: `event-${municipalEvent.id}-${key}`,
      kind: "event",
      label: municipalEvent.title,
      time: index === 0 ? formatTime(municipalEvent.startsAt) : "",
      href: "/mairie/evenements",
      muted: false,
      sort: index === 0 ? minutes(municipalEvent.startsAt) : 0,
    }));
  }

  for (const appointment of appointments) {
    place(byDay, spanKeys(appointment.scheduledAt, null), (key) => ({
      id: `appointment-${appointment.id}-${key}`,
      kind: "appointment",
      label: appointment.subject,
      time: formatTime(appointment.scheduledAt),
      href: "/mairie/rendez-vous",
      muted: appointment.status === "cancelled",
      sort: minutes(appointment.scheduledAt),
    }));
  }

  return cells.map((cell) => ({
    ...cell,
    entries: (byDay.get(cell.key) ?? []).sort((left, right) => left.sort - right.sort || left.label.localeCompare(right.label, "fr")),
  }));
}

function visibleDays(year: number, monthIndex: number): Omit<CalendarCell, "entries">[] {
  const first = new Date(year, monthIndex, 1);
  const cursor = new Date(year, monthIndex, 1 - mondayOffset(first));
  const cells: Omit<CalendarCell, "entries">[] = [];

  do {
    cells.push({
      key: dayKey(cursor),
      date: new Date(cursor),
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === monthIndex,
    });
    cursor.setDate(cursor.getDate() + 1);
  } while (cursor.getMonth() === monthIndex || cursor.getDay() !== 1);

  return cells;
}

function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function spanKeys(startIso: string, endIso: string | null | undefined): string[] {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : start;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (Number.isNaN(cursor.getTime())) {
    return [];
  }

  if (Number.isNaN(last.getTime()) || last < cursor) {
    return [dayKey(cursor)];
  }

  const keys: string[] = [];

  while (cursor <= last) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function place(
  byDay: Map<string, Placed[]>,
  keys: string[],
  entry: (key: string, index: number) => Placed,
): void {
  keys.forEach((key, index) => {
    const list = byDay.get(key) ?? [];
    list.push(entry(key, index));
    byDay.set(key, list);
  });
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutesOfHour = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutesOfHour}`;
}

function minutes(iso: string): number {
  const date = new Date(iso);

  return date.getHours() * 60 + date.getMinutes();
}
