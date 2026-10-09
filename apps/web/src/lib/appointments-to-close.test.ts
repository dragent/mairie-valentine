import { describe, expect, it } from "vitest";

import { appointmentsToClose } from "@/lib/appointments-to-close";

const now = new Date(2026, 9, 8, 11, 0);

function at(day: number, hours: number, minutes = 0): string {
  return new Date(2026, 9, day, hours, minutes).toISOString();
}

describe("appointmentsToClose", () => {
  it("lists scheduled visits whose slot has already ended", () => {
    const open = appointmentsToClose(
      [
        { id: 1, subject: "Hier", citizenName: "Ada", scheduledAt: at(7, 10), durationMinutes: 30, status: "scheduled" },
        { id: 2, subject: "En cours", citizenName: "Jean", scheduledAt: at(8, 10, 45), durationMinutes: 30, status: "scheduled" },
        { id: 3, subject: "Plus tard", citizenName: "Jean", scheduledAt: at(8, 15), durationMinutes: 30, status: "scheduled" },
        { id: 4, subject: "Annulé", citizenName: "Ada", scheduledAt: at(7, 9), durationMinutes: 30, status: "cancelled" },
        { id: 5, subject: "Honoré", citizenName: "Ada", scheduledAt: at(7, 8), durationMinutes: 30, status: "honored" },
      ],
      now,
    );

    expect(open.map((appointment) => appointment.id)).toEqual([1]);
  });
});
