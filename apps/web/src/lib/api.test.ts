import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, promoteMember } from "@/lib/api";
import { toApiDate, toLocalInput, formatDate, formatDateTime } from "@/lib/dates";
import { describe as describeError } from "@/lib/use-resource";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("sends the bearer token and reads a successful JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch<{ id: number }>("/api/me", { token: "jwt" })).resolves.toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/me$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer jwt" }),
      }),
    );
  });

  it("surfaces the message returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Vous ne pouvez pas modifier votre propre fonction." }),
      }),
    );

    await expect(apiFetch("/api/promotions", { method: "POST" })).rejects.toEqual(
      expect.objectContaining({
        status: 403,
        message: "Vous ne pouvez pas modifier votre propre fonction.",
      }),
    );
  });

  it("keeps a plain status when the error is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(apiFetch("/api/guild-members")).rejects.toThrow("GET /api/guild-members a répondu 502");
  });

  it("posts a dismissal as a null job", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 9 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await promoteMember("jwt", "9", null);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/promotions$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ discordId: "9", job: null }),
      }),
    );
  });
});

describe("errors shown to the reader", () => {
  it("keeps an API message and hides anything else", () => {
    expect(describeError(new ApiError(502, "Discord est injoignable."))).toBe("Discord est injoignable.");
    expect(describeError(new Error("stack"))).toBe("Une erreur inattendue est survenue.");
  });
});

describe("dates sent to the API", () => {
  it("turns an empty or invalid local value into null", () => {
    expect(toApiDate("")).toBeNull();
    expect(toApiDate("pas une date")).toBeNull();
  });

  it("sends a local input as an absolute instant", () => {
    expect(toApiDate("2026-10-07T12:00")).toBe(new Date("2026-10-07T12:00").toISOString());
  });

  it("renders a missing date as a dash", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("fills a local input from an instant", () => {
    const iso = new Date(2026, 9, 7, 16, 30).toISOString();

    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput(iso)).toBe("2026-10-07T16:30");
    expect(toLocalInput(iso, false)).toBe("2026-10-07");
  });
});
