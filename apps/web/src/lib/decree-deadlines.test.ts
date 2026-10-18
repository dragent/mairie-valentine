import { describe, expect, it } from "vitest";

import { decreeDeadlines } from "@/lib/decree-deadlines";

const now = new Date(2026, 9, 8, 9);

function at(day: number): string {
  return new Date(2026, 9, day, 18).toISOString();
}

describe("decreeDeadlines", () => {
  it("keeps published decrees that end within the week", () => {
    const lines = decreeDeadlines(
      [
        { id: 1, reference: "DEC-1889-001", title: "Couvre-feu", status: "published", endsAt: at(10) },
        { id: 2, reference: "DEC-1889-002", title: "Loin", status: "published", endsAt: at(20) },
        { id: 3, reference: "DEC-1889-003", title: "Brouillon", status: "draft", endsAt: at(9) },
        { id: 4, reference: "DEC-1889-004", title: "Passé", status: "published", endsAt: at(7) },
        { id: 5, reference: "DEC-1889-005", title: "Aujourd'hui", status: "published", endsAt: at(8) },
      ],
      now,
    );

    expect(lines.map((line) => line.detail)).toEqual(["se termine aujourd'hui", "se termine dans 2 jours"]);
    expect(lines[0]?.label).toBe("DEC-1889-005 — Aujourd'hui");
  });
});
