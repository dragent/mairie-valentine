import { describe, expect, it } from "vitest";

import { knownLocations } from "@/lib/known-locations";

describe("knownLocations", () => {
  it("keeps the first spelling and drops blanks", () => {
    expect(knownLocations([" Place ", "guichet", "place", "", null, "  "])).toEqual(["guichet", "Place"]);
  });
});
