import { describe, expect, it } from "vitest";

import { identityCardTally } from "@/lib/identity-cards";

describe("identityCardTally", () => {
  it("describes an empty register after the mayors' meeting", () => {
    expect(identityCardTally(0)).toBe(
      "Aucune carte n'a été délivrée depuis la dernière réunion des maires.",
    );
  });

  it("counts a single issuance", () => {
    expect(identityCardTally(1)).toBe("Une carte a été délivrée depuis la dernière réunion des maires.");
  });

  it("counts several issuances", () => {
    expect(identityCardTally(4)).toBe("4 cartes ont été délivrées depuis la dernière réunion des maires.");
  });
});
