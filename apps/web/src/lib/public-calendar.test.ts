import { describe, expect, it } from "vitest";

import { buildMonth } from "@/lib/calendar";
import type { PublicBoard } from "@/lib/api";
import { calendarSources } from "@/lib/public-calendar";

const board: PublicBoard = {
  decrees: [
    {
      reference: "DEC-2026-001",
      title: "Couvre-feu",
      startsAt: "2026-10-16T00:00:00.000Z",
      endsAt: "2026-10-18T00:00:00.000Z",
    },
  ],
  events: [
    {
      title: "Foire",
      startsAt: "2026-10-16T16:00:00.000Z",
      endsAt: null,
      location: "Place",
    },
  ],
};

describe("public calendar", () => {
  it("keeps published decrees and events, and leaves appointments out", () => {
    const { events, decrees } = calendarSources(board);
    const cells = buildMonth(1889, 9, events, [], decrees, 2026);
    const day = cells.find((cell) => cell.key === "1889-10-16");

    expect(day?.entries.map((entry) => entry.label)).toEqual(["Couvre-feu", "Foire"]);
    expect(cells.flatMap((cell) => cell.entries).some((entry) => entry.kind === "appointment")).toBe(false);
  });
});
