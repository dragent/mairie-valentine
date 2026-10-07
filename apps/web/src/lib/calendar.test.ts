import { describe, expect, it } from "vitest";

import type { Appointment, MunicipalEvent } from "@/lib/api";
import { buildMonth } from "@/lib/calendar";

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

  it("drops an entry that falls outside the visible weeks", () => {
    const cells = buildMonth(2026, 9, [event(5, "Ailleurs", at(2026, 11, 1, 10))], []);

    expect(cells.flatMap((cell) => cell.entries)).toEqual([]);
  });
});
