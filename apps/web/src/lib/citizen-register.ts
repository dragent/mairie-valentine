import type { Appointment } from "@/lib/api";

export type CitizenRecord = {
  name: string;
  visits: number;
  honored: number;
  cancelled: number;
  scheduled: number;
  lastVisit: string;
};

type Visit = Pick<Appointment, "citizenName" | "scheduledAt" | "status">;

/**
 * Visits grouped by the name written at the desk. A different spelling stays a
 * different person; only surrounding spaces are ignored.
 */
export function citizenRegister(appointments: Visit[]): CitizenRecord[] {
  const groups = new Map<string, CitizenRecord>();

  for (const appointment of appointments) {
    const key = appointment.citizenName.trim().toLocaleLowerCase("fr");

    if (key === "") {
      continue;
    }

    const current = groups.get(key) ?? {
      name: appointment.citizenName.trim(),
      visits: 0,
      honored: 0,
      cancelled: 0,
      scheduled: 0,
      lastVisit: appointment.scheduledAt,
    };

    current.visits += 1;
    current[appointment.status] += 1;

    if (appointment.scheduledAt > current.lastVisit) {
      current.lastVisit = appointment.scheduledAt;
      current.name = appointment.citizenName.trim();
    }

    groups.set(key, current);
  }

  return [...groups.values()].sort((left, right) => right.lastVisit.localeCompare(left.lastVisit));
}

/**
 * Names already written at the desk that match what is being typed. An empty
 * field offers nothing; the spelling already in the field is not offered again.
 */
export function citizenSuggestions(appointments: Visit[], query: string): string[] {
  const needle = fold(query);

  if (needle === "") {
    return [];
  }

  const written = query.trim();

  return citizenRegister(appointments)
    .map((citizen) => citizen.name)
    .filter((name) => name !== written && fold(name).includes(needle));
}

function fold(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
