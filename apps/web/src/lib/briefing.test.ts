import { describe, expect, it } from "vitest";

import { dailyBriefing } from "@/lib/briefing";

const now = new Date(2026, 9, 8, 9, 0);

function at(day: number, hours: number): string {
  return new Date(2026, 9, day, hours).toISOString();
}

describe("dailyBriefing", () => {
  it("keeps today's scheduled appointments, events and desk notes", () => {
    const briefing = dailyBriefing({
      now,
      appointments: [
        { id: 1, subject: "Permis", citizenName: "Jean", scheduledAt: at(8, 10), status: "scheduled" },
        { id: 2, subject: "Hier", citizenName: "Ada", scheduledAt: at(7, 10), status: "scheduled" },
        { id: 3, subject: "Annulé", citizenName: "Jean", scheduledAt: at(8, 11), status: "cancelled" },
      ],
      events: [
        { id: 4, title: "Foire", startsAt: at(8, 14), location: "Place" },
        { id: 5, title: "Demain", startsAt: at(9, 14), location: null },
      ],
      notes: [
        { status: "current" },
        { status: "archived" },
        { status: "current" },
      ],
      decrees: [],
    });

    expect(briefing.appointments.map((line) => line.label)).toEqual(["Permis — Jean"]);
    expect(briefing.events.map((line) => line.label)).toEqual(["Foire"]);
    expect(briefing.events[0]?.detail).toBe("Place");
    expect(briefing.notesAtDesk).toBe(2);
  });

  it("warns when a published decree ends within the week", () => {
    const briefing = dailyBriefing({
      now,
      appointments: [],
      events: [],
      notes: [],
      decrees: [
        { id: 1, reference: "DEC-1889-001", title: "Couvre-feu", status: "published", endsAt: at(10, 0) },
        { id: 2, reference: "DEC-1889-002", title: "Loin", status: "published", endsAt: at(20, 0) },
        { id: 3, reference: "DEC-1889-003", title: "Brouillon", status: "draft", endsAt: at(9, 0) },
        { id: 4, reference: "DEC-1889-004", title: "Passé", status: "published", endsAt: at(7, 0) },
      ],
    });

    expect(briefing.decrees).toEqual([
      { id: 1, label: "DEC-1889-001 — Couvre-feu", detail: "se termine dans 2 jours", href: "/mairie/decrets" },
    ]);
  });

  it("says when the decree ends today or tomorrow", () => {
    const briefing = dailyBriefing({
      now,
      appointments: [],
      events: [],
      notes: [],
      decrees: [
        { id: 1, reference: "DEC-1889-001", title: "A", status: "published", endsAt: at(8, 23) },
        { id: 2, reference: "DEC-1889-002", title: "B", status: "published", endsAt: at(9, 8) },
      ],
    });

    expect(briefing.decrees.map((line) => line.detail)).toEqual([
      "se termine aujourd'hui",
      "se termine demain",
    ]);
  });
});
