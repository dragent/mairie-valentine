import { describe, expect, it } from "vitest";

import type { Appointment, Decree, MunicipalEvent } from "@/lib/api";
import { calendarSheet, formatTownDateTime, formatTownWhen } from "@/lib/calendar-sheet";
import type { CalendarEntry } from "@/lib/calendar";

function at(year: number, monthIndex: number, day: number, hours: number, minutes = 0): string {
  return new Date(year, monthIndex, day, hours, minutes).toISOString();
}

const now = new Date(2026, 9, 7, 15, 30);

function entry(id: string, kind: CalendarEntry["kind"]): CalendarEntry {
  return { id, kind, label: "Fiche", time: "", href: "/mairie", muted: false };
}

function municipalEvent(overrides: Partial<MunicipalEvent> = {}): MunicipalEvent {
  return {
    id: 4,
    title: "Foire",
    description: "Place du marché",
    startsAt: at(2026, 9, 7, 18),
    endsAt: at(2026, 9, 9, 9),
    location: "Valentine",
    posterPath: "uploads/events/foire.png",
    createdAt: at(2026, 9, 1, 8),
    updatedAt: at(2026, 9, 1, 8),
    ...overrides,
  };
}

describe("town date labels", () => {
  it("keeps the real weekday and rewrites only the year", () => {
    expect(formatTownDateTime(at(2026, 9, 7, 18), now)).toBe("mercredi 7 octobre 1889, 18:00");
    expect(formatTownWhen(at(2026, 9, 7, 0), now)).toBe("mercredi 7 octobre 1889");
  });
});

describe("calendar sheet", () => {
  it("puts an event poster beside its town dates", () => {
    const sheet = calendarSheet(entry("event-4-1889-10-07", "event"), [municipalEvent()], [], [], now);

    expect(sheet).toMatchObject({
      kind: "event",
      kindLabel: "Événement",
      recordId: 4,
      title: "Foire",
      posterUrl: "http://localhost:8080/uploads/events/foire.png",
    });
    expect(sheet?.fields.map((field) => field.label)).toEqual(["Début", "Fin", "Lieu", "Description"]);
    expect(sheet?.fields[0]?.value).toBe("mercredi 7 octobre 1889, 18:00");
    expect(sheet?.fields[1]?.value).toContain("1889");
  });

  it("treats an event with only a start as a single day", () => {
    const sheet = calendarSheet(
      entry("event-4-1889-10-07", "event"),
      [municipalEvent({ endsAt: null, description: null, location: null })],
      [],
      [],
      now,
    );

    expect(sheet?.fields).toEqual([{ label: "Date", value: "mercredi 7 octobre 1889, 18:00" }]);
  });

  it("leaves the poster empty for a rendez-vous", () => {
    const meeting: Appointment = {
      id: 2,
      subject: "Permis",
      citizenName: "Jean",
      scheduledAt: at(2026, 9, 7, 9, 30),
      durationMinutes: 30,
      location: null,
      status: "scheduled",
      notes: null,
      createdAt: at(2026, 9, 7, 8),
      updatedAt: at(2026, 9, 7, 8),
    };
    const sheet = calendarSheet(entry("appointment-2-1889-10-07", "appointment"), [], [meeting], [], now);

    expect(sheet).toMatchObject({
      kind: "appointment",
      kindLabel: "Rendez-vous",
      title: "Permis",
      posterUrl: null,
    });
    expect(sheet?.fields.map((field) => [field.label, field.value])).toEqual([
      ["Citoyen", "Jean"],
      ["Date et heure", "mercredi 7 octobre 1889, 09:30"],
      ["Durée", "30 minutes"],
      ["État", "Prévu"],
    ]);
  });

  it("shows a decree poster with its reference and period", () => {
    const decree: Decree = {
      id: 6,
      reference: "DEC-2026-004",
      title: "Foire",
      body: "Texte de l'arrêté",
      status: "published",
      startsAt: at(2026, 9, 7, 0),
      endsAt: at(2026, 9, 9, 0),
      posterPath: "uploads/decrees/arrete.png",
      createdAt: at(2026, 9, 1, 8),
      updatedAt: at(2026, 9, 1, 8),
    };
    const sheet = calendarSheet(entry("decree-6-1889-10-07", "decree"), [], [], [decree], now);

    expect(sheet?.posterUrl).toBe("http://localhost:8080/uploads/decrees/arrete.png");
    expect(sheet?.fields.map((field) => field.label)).toEqual(["Référence", "Début", "Fin", "Texte"]);
    expect(sheet?.fields[1]?.value).toBe("mercredi 7 octobre 1889");
    expect(sheet?.record).toMatchObject({ id: 6, reference: "DEC-2026-004" });
  });

  it("returns nothing when the entry does not match a record", () => {
    expect(calendarSheet(entry("event-9-1889-10-07", "event"), [municipalEvent()], [], [], now)).toBeNull();
    expect(calendarSheet(entry("event-4", "event"), [municipalEvent()], [], [], now)).toBeNull();
  });
});
