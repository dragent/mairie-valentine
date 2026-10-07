import { describe, expect, it } from "vitest";

import { citizenRegister } from "@/lib/citizen-register";

function visit(id: number, name: string, day: number, status: "scheduled" | "honored" | "cancelled") {
  return {
    id,
    citizenName: name,
    scheduledAt: new Date(2026, 9, day, 10).toISOString(),
    status,
  };
}

describe("citizenRegister", () => {
  it("groups the same spelling and keeps a different name apart", () => {
    const register = citizenRegister([
      visit(1, "Jean", 1, "honored"),
      visit(2, "  jean ", 3, "cancelled"),
      visit(3, "Jean Dupont", 2, "scheduled"),
    ]);

    expect(register.map((citizen) => citizen.name)).toEqual(["jean", "Jean Dupont"]);
    expect(register[0]).toMatchObject({ visits: 2, honored: 1, cancelled: 1, scheduled: 0 });
    expect(register[1]).toMatchObject({ visits: 1, scheduled: 1 });
  });

  it("keeps the spelling of the latest visit", () => {
    const register = citizenRegister([
      visit(1, "ada", 1, "honored"),
      visit(2, "Ada Lovelace", 4, "scheduled"),
      visit(3, "Ada", 2, "honored"),
    ]);

    expect(register[0]?.name).toBe("Ada Lovelace");
    expect(register[1]?.name).toBe("Ada");
  });
});
