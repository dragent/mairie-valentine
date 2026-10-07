import { describe, expect, it } from "vitest";

import type { Appointment, Decree, DecreeStatus, MunicipalEvent } from "@/lib/api";
import { buildMonth, countByKind, filterByKind, townToday } from "@/lib/calendar";

function at(year: number, monthIndex: number, day: number, hours: number, minutes = 0): string {
  return new Date(year, monthIndex, day, hours, minutes).toISOString();
}

function event(
  id: number,
  title: string,
  startsAt: string,
  endsAt: string | null = null,
): MunicipalEvent {
  return {
    id,
    title,
    description: null,
    startsAt,
    endsAt,
    location: null,
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}

function decree(
  id: number,
  reference: string,
  title: string,
  status: DecreeStatus,
  startsAt: string | null,
  endsAt: string | null = startsAt,
): Decree {
  return {
    id,
    reference,
    title,
    body: "Texte",
    status,
    startsAt,
    endsAt,
    createdAt: startsAt ?? at(2026, 9, 1, 8),
    updatedAt: startsAt ?? at(2026, 9, 1, 8),
  };
}

function appointment(
  id: number,
  subject: string,
  scheduledAt: string,
  status: Appointment["status"] = "scheduled",
): Appointment {
  return {
    id,
    subject,
    citizenName: "Jean",
    scheduledAt,
    durationMinutes: 30,
    location: null,
    status,
    notes: null,
    createdAt: scheduledAt,
    updatedAt: scheduledAt,
  };
}

describe("month calendar", () => {
  it("opens October 2026 on the Monday before the 1st and closes on the Sunday after the 31st", () => {
    const cells = buildMonth(2026, 9, [], []);

    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({ key: "2026-09-28", inMonth: false });
    expect(cells[0].date.getDay()).toBe(1);
    expect(cells.find((cell) => cell.key === "2026-10-01")).toMatchObject({ inMonth: true, day: 1 });
    expect(cells.at(-1)).toMatchObject({ key: "2026-11-01", inMonth: false });
    expect(cells.at(-1)?.date.getDay()).toBe(0);
  });

  it("lists an event and a rendez-vous on their local day, earliest first", () => {
    const cells = buildMonth(
      2026,
      9,
      [event(1, "Conseil", at(2026, 9, 7, 16))],
      [appointment(2, "Permis", at(2026, 9, 7, 9, 30))],
    );
    const day = cells.find((cell) => cell.key === "2026-10-07");

    expect(day?.entries.map((entry) => entry.label)).toEqual(["Permis", "Conseil"]);
    expect(day?.entries.map((entry) => entry.time)).toEqual(["09:30", "16:00"]);
    expect(day?.entries.map((entry) => entry.href)).toEqual(["/mairie/rendez-vous", "/mairie/evenements"]);
  });

  it("keeps a cancelled rendez-vous on the day, marked aside", () => {
    const cells = buildMonth(2026, 9, [], [appointment(3, "Annulé", at(2026, 9, 7, 11), "cancelled")]);
    const day = cells.find((cell) => cell.key === "2026-10-07");

    expect(day?.entries).toEqual([
      expect.objectContaining({ label: "Annulé", muted: true }),
    ]);
  });

  it("repeats an event on every local day it covers", () => {
    const cells = buildMonth(
      2026,
      9,
      [event(4, "Foire", at(2026, 9, 7, 18), at(2026, 9, 9, 9))],
      [],
    );
    const labels = ["2026-10-07", "2026-10-08", "2026-10-09"].map(
      (key) => cells.find((cell) => cell.key === key)?.entries.map((entry) => entry.label),
    );

    expect(labels).toEqual([["Foire"], ["Foire"], ["Foire"]]);
    expect(cells.find((cell) => cell.key === "2026-10-07")?.entries[0]?.time).toBe("18:00");
    expect(cells.find((cell) => cell.key === "2026-10-08")?.entries[0]?.time).toBe("");
  });

  it("repeats a published decree on every day from its start through its end", () => {
    const cells = buildMonth(
      2026,
      9,
      [],
      [],
      [decree(6, "DEC-2026-004", "Foire", "published", at(2026, 9, 7, 0), at(2026, 9, 9, 0))],
    );
    const labels = ["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"].map(
      (key) => cells.find((cell) => cell.key === key)?.entries.map((entry) => entry.label) ?? [],
    );

    expect(labels).toEqual([["Foire"], ["Foire"], ["Foire"], []]);
  });

  it("places a decree in force ahead of timed entries", () => {
    const cells = buildMonth(
      2026,
      9,
      [event(1, "Conseil", at(2026, 9, 7, 16))],
      [appointment(2, "Permis", at(2026, 9, 7, 9, 30))],
      [decree(6, "DEC-2026-004", "Foire", "published", at(2026, 9, 7, 14))],
    );
    const day = cells.find((cell) => cell.key === "2026-10-07");

    expect(day?.entries.map((entry) => entry.label)).toEqual(["Foire", "Permis", "Conseil"]);
    expect(day?.entries[0]).toMatchObject({
      kind: "decree",
      time: "",
      href: "/mairie/decrets",
      muted: false,
    });
  });

  it("leaves drafts and repealed decrees off the month", () => {
    const cells = buildMonth(2026, 9, [], [], [
      decree(7, "DEC-2026-005", "Brouillon", "draft", null),
      decree(8, "DEC-2026-006", "Abrogé", "repealed", at(2026, 9, 7, 11)),
    ]);

    expect(cells.flatMap((cell) => cell.entries)).toEqual([]);
  });

  it("keeps every kind until one is switched off", () => {
    const cells = buildMonth(
      2026,
      9,
      [event(1, "Conseil", at(2026, 9, 7, 16))],
      [appointment(2, "Permis", at(2026, 9, 7, 9, 30))],
      [decree(6, "DEC-2026-004", "Foire", "published", at(2026, 9, 7, 14))],
    );
    const labels = (shown: { event: boolean; appointment: boolean; decree: boolean }) =>
      filterByKind(cells, shown)
        .find((cell) => cell.key === "2026-10-07")
        ?.entries.map((entry) => entry.label);

    expect(labels({ event: true, appointment: true, decree: true })).toEqual(["Foire", "Permis", "Conseil"]);
    expect(labels({ event: true, appointment: false, decree: true })).toEqual(["Foire", "Conseil"]);
  });

  it("counts each category once for the days inside the month", () => {
    const cells = buildMonth(
      1889,
      9,
      [
        event(4, "Foire", at(1889, 9, 7, 18), at(1889, 9, 9, 9)),
        event(5, "Veille", at(1889, 8, 28, 10)),
      ],
      [
        appointment(2, "Permis", at(1889, 9, 7, 9, 30)),
        appointment(3, "Annulé", at(1889, 9, 8, 11), "cancelled"),
      ],
      [
        decree(6, "DEC-1889-004", "Arrêté", "published", at(1889, 9, 7, 14)),
        decree(7, "DEC-1889-005", "Brouillon", "draft", null),
      ],
    );

    expect(countByKind(cells)).toEqual({ event: 1, appointment: 2, decree: 1 });
  });

  it("keeps today's month and day, and sets the year to 1889", () => {
    expect(townToday(new Date(2026, 9, 7, 15, 30))).toEqual(new Date(1889, 9, 7));
  });

  it("drops an entry that falls outside the visible weeks", () => {
    const cells = buildMonth(2026, 9, [event(5, "Ailleurs", at(2026, 11, 1, 10))], []);

    expect(cells.flatMap((cell) => cell.entries)).toEqual([]);
  });
});
