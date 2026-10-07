import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/public-routes";

describe("isPublicPath", () => {
  it("keeps the home page open to visitors", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("keeps the Discord callback reachable so a login can finish", () => {
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/auth/callback/")).toBe(true);
  });

  it("closes every other page to visitors", () => {
    expect(isPublicPath("/personnel")).toBe(false);
    expect(isPublicPath("/mairie")).toBe(false);
    expect(isPublicPath("/mairie/calendrier")).toBe(false);
    expect(isPublicPath("/mairie/notes")).toBe(false);
    expect(isPublicPath("/compte")).toBe(false);
  });
});
