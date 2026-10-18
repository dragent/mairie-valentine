import { describe, expect, it } from "vitest";

import { ROLE_ELU, ROLE_MAIRE, ROLE_SECRETAIRE } from "@/lib/api";
import { isPublicPath, showsPublicBoard } from "@/lib/public-routes";

describe("isPublicPath", () => {
  it("keeps the home page open to visitors", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("keeps the Discord callback reachable so a login can finish", () => {
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/auth/callback/")).toBe(true);
  });

  it("keeps the public board open to visitors", () => {
    expect(isPublicPath("/affichage")).toBe(true);
    expect(isPublicPath("/affichage/")).toBe(true);
  });

  it("hides the public board from the mayor, the deputy and the secretary", () => {
    expect(showsPublicBoard([])).toBe(true);
    expect(showsPublicBoard(["ROLE_USER"])).toBe(true);
    expect(showsPublicBoard([ROLE_SECRETAIRE, "ROLE_USER"])).toBe(false);
    expect(showsPublicBoard([ROLE_ELU, ROLE_SECRETAIRE, "ROLE_USER"])).toBe(false);
    expect(showsPublicBoard([ROLE_MAIRE, ROLE_ELU, ROLE_SECRETAIRE, "ROLE_USER"])).toBe(false);
  });

  it("closes every other page to visitors", () => {
    expect(isPublicPath("/personnel")).toBe(false);
    expect(isPublicPath("/mairie")).toBe(false);
    expect(isPublicPath("/mairie/calendrier")).toBe(false);
    expect(isPublicPath("/mairie/notes")).toBe(false);
    expect(isPublicPath("/compte")).toBe(false);
  });
});
