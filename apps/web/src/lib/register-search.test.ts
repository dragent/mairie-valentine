import { describe, expect, it } from "vitest";

import { searchRegisters } from "@/lib/register-search";

const sources = {
  notes: [{ id: 1, title: "Clefs", body: "Les clefs du greffe sont au clou." }],
  decrees: [{ id: 2, reference: "DEC-1889-004", title: "Couvre-feu", body: "À partir de dix heures." }],
  events: [{ id: 3, title: "Foire", description: "Marché aux bestiaux sur la place." }],
  appointments: [{ id: 4, subject: "Permis", citizenName: "Jean Dupont", notes: "Apporter le livret." }],
};

describe("searchRegisters", () => {
  it("returns nothing until a word is typed", () => {
    expect(searchRegisters("   ", sources)).toEqual([]);
  });

  it("finds a word across notes, decrees, events and appointments", () => {
    expect(searchRegisters("clefs", sources).map((hit) => hit.label)).toEqual(["Clefs"]);
    expect(searchRegisters("DEC-1889-004", sources).map((hit) => hit.kind)).toEqual(["decree"]);
    expect(searchRegisters("bestiaux", sources).map((hit) => hit.href)).toEqual(["/mairie/evenements"]);
    expect(searchRegisters("dupont", sources).map((hit) => hit.label)).toEqual(["Permis — Jean Dupont"]);
  });
});
