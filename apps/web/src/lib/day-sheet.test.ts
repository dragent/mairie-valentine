import { describe, expect, it } from "vitest";

import { daySheet } from "@/lib/day-sheet";

const now = new Date(2026, 9, 8, 9);

function at(day: number, hours: number): string {
  return new Date(2026, 9, day, hours).toISOString();
}

describe("daySheet", () => {
  it("lists today's visits and events, and skips cancelled visits", () => {
    const lines = daySheet(
      [
        { id: 1, subject: "Permis", citizenName: "Jean", scheduledAt: at(8, 10), location: "Guichet", status: "scheduled" },
        { id: 2, subject: "Hier", citizenName: "Ada", scheduledAt: at(7, 10), location: null, status: "scheduled" },
        { id: 3, subject: "Annulé", citizenName: "Jean", scheduledAt: at(8, 11), location: null, status: "cancelled" },
      ],
      [
        { id: 4, title: "Foire", startsAt: at(8, 14), endsAt: at(8, 18), location: "Place" },
        { id: 5, title: "Conseil", startsAt: at(7, 18), endsAt: at(9, 12), location: "Salle" },
        { id: 6, title: "Demain", startsAt: at(9, 9), endsAt: null, location: null },
      ],
      now,
    );

    expect(lines.map((line) => line.label)).toEqual(["Conseil", "Permis — Jean", "Foire"]);
    expect(lines[0]?.time).toBe("en cours");
    expect(lines[1]?.place).toBe("Guichet");
    expect(lines[1]?.time).toBe("10:00");
  });
});
