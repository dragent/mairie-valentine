import type { Appointment, Decree, MunicipalEvent } from "@/lib/api";

export type CalendarEntry = {
  id: string;
  kind: "event" | "appointment" | "decree";
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

export type CalendarKind = CalendarEntry["kind"];

const TOWN_YEAR = 1889;
const CIVIL_YEAR = 2000;

export function townToday(now = new Date()): Date {
  return new Date(TOWN_YEAR, now.getMonth(), now.getDate());
}

export function townLayoutYear(townYear: number, now = new Date()): number {
  return townYear + (now.getFullYear() - TOWN_YEAR);
}

export function townYearOf(year: number, now = new Date()): number {
  if (year < CIVIL_YEAR) {
    return year;
  }

  return year - (now.getFullYear() - TOWN_YEAR);
}

type Placed = CalendarEntry & { sort: number };

const KIND_RANK: Record<CalendarEntry["kind"], number> = {
  decree: 0,
  event: 1,
  appointment: 2,
};

export function countByKind(cells: CalendarCell[]): Record<CalendarKind, number> {
  const seen = new Set<string>();
  const counts: Record<CalendarKind, number> = { event: 0, appointment: 0, decree: 0 };

  for (const cell of cells) {
    if (!cell.inMonth) {
      continue;
    }

    for (const entry of cell.entries) {
      const source = entry.id.replace(/-\d{4}-\d{2}-\d{2}$/, "");

      if (seen.has(source)) {
        continue;
      }

      seen.add(source);
      counts[entry.kind] += 1;
    }
  }

  return counts;
}

export function filterByKind(cells: CalendarCell[], shown: Record<CalendarKind, boolean>): CalendarCell[] {
  return cells.map((cell) => ({
    ...cell,
    entries: cell.entries.filter((entry) => shown[entry.kind]),
  }));
}

export function buildMonth(
  year: number,
  monthIndex: number,
  events: MunicipalEvent[],
  appointments: Appointment[],
  decrees: Decree[] = [],
  layoutYear = year,
): CalendarCell[] {
  const yearShift = layoutYear - year;
  const cells = visibleDays(year, monthIndex, layoutYear);
  const byDay = new Map<string, Placed[]>();

  for (const municipalEvent of events) {
    place(byDay, spanKeys(municipalEvent.startsAt, municipalEvent.endsAt, yearShift), (key, index) => ({
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
    place(byDay, spanKeys(appointment.scheduledAt, null, yearShift), (key) => ({
      id: `appointment-${appointment.id}-${key}`,
      kind: "appointment",
      label: appointment.subject,
      time: formatTime(appointment.scheduledAt),
      href: "/mairie/rendez-vous",
      muted: appointment.status === "cancelled",
      sort: minutes(appointment.scheduledAt),
    }));
  }

  for (const decree of decrees) {
    if (decree.status !== "published" || !decree.startsAt || !decree.endsAt) {
      continue;
    }

    place(byDay, spanKeys(decree.startsAt, decree.endsAt, yearShift), (key) => ({
      id: `decree-${decree.id}-${key}`,
      kind: "decree",
      label: decree.title,
      time: "",
      href: "/mairie/decrets",
      muted: false,
      sort: 0,
    }));
  }

  return cells.map((cell) => ({
    ...cell,
    entries: (byDay.get(cell.key) ?? []).sort(
      (left, right) =>
        KIND_RANK[left.kind] - KIND_RANK[right.kind] ||
        left.sort - right.sort ||
        left.label.localeCompare(right.label, "fr"),
    ),
  }));
}

function visibleDays(year: number, monthIndex: number, layoutYear: number): Omit<CalendarCell, "entries">[] {
  const first = new Date(layoutYear, monthIndex, 1);
  const cursor = new Date(layoutYear, monthIndex, 1 - mondayOffset(first));
  const cells: Omit<CalendarCell, "entries">[] = [];

  do {
    const month = cursor.getMonth();
    const day = cursor.getDate();

    cells.push({
      key: dayKeyParts(year, month, day),
      date: new Date(year, month, day),
      day,
      inMonth: month === monthIndex,
    });
    cursor.setDate(cursor.getDate() + 1);
  } while (cursor.getMonth() === monthIndex || cursor.getDay() !== 1);

  return cells;
}

function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function spanKeys(startIso: string, endIso: string | null | undefined, yearShift: number): string[] {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : start;
  const cursor = project(start, yearShift);
  const last = project(end, yearShift);

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

function project(date: Date, yearShift: number): Date {
  const year = date.getFullYear() >= CIVIL_YEAR ? date.getFullYear() - yearShift : date.getFullYear();

  return new Date(year, date.getMonth(), date.getDate());
}

function dayKey(date: Date): string {
  return dayKeyParts(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKeyParts(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");

  return `${year}-${month}-${dayText}`;
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
