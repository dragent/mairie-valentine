import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const lib = dirname(fileURLToPath(import.meta.url));

describe("public env", () => {
  it("publishes only the API origin to the browser", () => {
    const api = readFileSync(join(lib, "api.ts"), "utf8");
    const published = [...api.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)].map((match) => match[1]);

    expect(published).toEqual(["NEXT_PUBLIC_API_URL"]);
    expect(api).not.toMatch(/APP_SECRET|JWT_|DISCORD_|DATABASE_URL|DB_PASSWORD/);
  });
});
