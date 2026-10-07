import { describe, expect, it } from "vitest";

import { greffeJournal } from "@/lib/greffe-journal";

describe("greffeJournal", () => {
  it("orders every register by the last touch, newest first", () => {
    const entries = greffeJournal({
      notes: [
        { id: 1, title: "Clefs", updatedAt: "2026-10-01T10:00:00.000Z", authorName: "Ada", authorJobLabel: "Secrétaire" },
      ],
      decrees: [
        {
          id: 2,
          reference: "DEC-1889-001",
          title: "Couvre-feu",
          updatedAt: "2026-10-03T10:00:00.000Z",
          authorName: "Arthur",
          authorJobLabel: "Maire",
        },
      ],
      events: [{ id: 3, title: "Foire", updatedAt: "2026-10-02T10:00:00.000Z", authorName: null, authorJobLabel: null }],
      appointments: [
        {
          id: 4,
          subject: "Permis",
          citizenName: "Jean",
          updatedAt: "2026-10-04T10:00:00.000Z",
          authorName: "Ada",
          authorJobLabel: null,
        },
      ],
    });

    expect(entries.map((entry) => entry.label)).toEqual([
      "Permis — Jean",
      "DEC-1889-001 — Couvre-feu",
      "Foire",
      "Clefs",
    ]);
    expect(entries[1]?.author).toBe("Maire — Arthur");
    expect(entries[2]?.author).toBe("—");
    expect(entries[0]?.href).toBe("/mairie/rendez-vous");
  });
});
