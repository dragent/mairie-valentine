import type { Appointment } from "@/lib/api";

const TOWN_YEAR = 1889;
const CIVIL_YEAR = 2000;

type Closable = Pick<Appointment, "id" | "subject" | "citizenName" | "scheduledAt" | "durationMinutes" | "status">;

/** Scheduled visits whose slot is already over, oldest first. */
export function appointmentsToClose<T extends Closable>(appointments: T[], now = new Date()): T[] {
  const clock = townNow(now);

  return appointments
    .filter((appointment) => {
      if (appointment.status !== "scheduled") {
        return false;
      }

      const start = townMillis(appointment.scheduledAt, now);

      if (start === null) {
        return false;
      }

      return start + appointment.durationMinutes * 60_000 <= clock;
    })
    .sort((left, right) => (townMillis(left.scheduledAt, now) ?? 0) - (townMillis(right.scheduledAt, now) ?? 0));
}

function townNow(now: Date): number {
  return new Date(TOWN_YEAR, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()).getTime();
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
