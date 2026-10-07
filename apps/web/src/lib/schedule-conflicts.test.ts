import { describe, expect, it } from "vitest";

import { scheduleConflicts } from "@/lib/schedule-conflicts";

const now = new Date(2026, 9, 8, 8);

function at(hours: number, minutes = 0): string {
  return new Date(2026, 9, 8, hours, minutes).toISOString();
}

describe("scheduleConflicts", () => {
  it("flags two scheduled appointments that overlap", () => {
    const conflicts = scheduleConflicts(
      [
        { id: 1, subject: "Permis", scheduledAt: at(10), durationMinutes: 60, location: null, status: "scheduled" },
        { id: 2, subject: "État civil", scheduledAt: at(10, 30), durationMinutes: 30, location: "Guichet", status: "scheduled" },
        { id: 3, subject: "Après", scheduledAt: at(11), durationMinutes: 30, location: null, status: "scheduled" },
        { id: 4, subject: "Annulé", scheduledAt: at(10), durationMinutes: 60, location: null, status: "cancelled" },
      ],
      [],
      now,
    );

    expect(conflicts).toEqual([
      { id: "appointment-1-2", message: "« Permis » et « État civil » se chevauchent." },
    ]);
  });

  it("flags an appointment and an event that share a place", () => {
    const conflicts = scheduleConflicts(
      [{ id: 1, subject: "Permis", scheduledAt: at(10), durationMinutes: 60, location: "Salle du conseil", status: "scheduled" }],
      [
        { id: 8, title: "Conseil", startsAt: at(10, 30), endsAt: at(12), location: "  salle   du conseil " },
        { id: 9, title: "Foire", startsAt: at(10, 30), endsAt: at(12), location: "Place" },
        { id: 10, title: "Plus tard", startsAt: at(14), endsAt: at(15), location: "Salle du conseil" },
      ],
      now,
    );

    expect(conflicts.map((conflict) => conflict.message)).toEqual([
      "« Permis » et l'événement « Conseil » occupent le même lieu.",
    ]);
  });

  it("ignores events and appointments that have no place", () => {
    const conflicts = scheduleConflicts(
      [{ id: 1, subject: "Permis", scheduledAt: at(10), durationMinutes: 60, location: "  ", status: "scheduled" }],
      [{ id: 8, title: "Conseil", startsAt: at(10), endsAt: at(11), location: null }],
      now,
    );

    expect(conflicts).toEqual([]);
  });
});
