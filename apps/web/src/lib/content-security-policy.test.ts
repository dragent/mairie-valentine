import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "@/lib/content-security-policy";

describe("contentSecurityPolicy", () => {
  it("allows the town hall scripts only through a nonce", () => {
    const policy = contentSecurityPolicy("abc", "https://api.valentine.test", false);

    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' https://api.valentine.test");
    expect(policy).toContain("https://cdn.discordapp.com");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("allows the development compiler to evaluate scripts", () => {
    const policy = contentSecurityPolicy("abc", "http://localhost:8080", true);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("ws://localhost:3000");
  });
});
