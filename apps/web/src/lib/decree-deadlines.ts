import type { Decree } from "@/lib/api";

const TOWN_YEAR = 1889;
const CIVIL_YEAR = 2000;
const HORIZON_DAYS = 7;

export type DecreeDeadline = {
  id: number;
  label: string;
  detail: string;
};

type DatedDecree = Pick<Decree, "id" | "reference" | "title" | "status" | "endsAt">;

/** Published decrees whose last day falls inside the coming week, soonest first. */
export function decreeDeadlines(decrees: DatedDecree[], now = new Date()): DecreeDeadline[] {
  const today = todayKey(now);
  const last = addDays(today, HORIZON_DAYS);

  return decrees
    .flatMap((decree) => {
      if (decree.status !== "published" || !decree.endsAt) {
        return [];
      }

      const end = townKey(decree.endsAt, now);

      if (end === null || end < today || end > last) {
        return [];
      }

      return [{ id: decree.id, label: `${decree.reference} — ${decree.title}`, detail: phrase(end, today), end }];
    })
    .sort((left, right) => left.end.localeCompare(right.end))
    .map(({ end: _end, ...line }) => line);
}

function phrase(end: string, today: string): string {
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
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / 86_400_000);
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
