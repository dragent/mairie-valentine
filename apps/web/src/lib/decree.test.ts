import { afterEach, describe, expect, it, vi } from "vitest";

import { decreeSubmission, recordDecree } from "@/lib/decree";
import { toApiDate } from "@/lib/dates";

const form = {
  title: "Arrêté",
  body: "Texte",
  status: "draft" as const,
  startsOn: "1889-10-07",
  endsOn: "1889-10-09",
};

describe("decreeSubmission", () => {
  it("drops dates from a draft", () => {
    expect(decreeSubmission(form)).toEqual({
      input: {
        title: "Arrêté",
        body: "Texte",
        status: "draft",
        startsAt: null,
        endsAt: null,
      },
    });
  });

  it("drops dates from a repeal", () => {
    expect(decreeSubmission({ ...form, status: "repealed" })).toEqual({
      input: {
        title: "Arrêté",
        body: "Texte",
        status: "repealed",
        startsAt: null,
        endsAt: null,
      },
    });
  });

  it("asks for both dates before a publication", () => {
    expect(decreeSubmission({ ...form, status: "published", startsOn: "", endsOn: "" })).toEqual({
      error: "Indiquez la date de début et la date de fin.",
    });
  });

  it("refuses an end that precedes the start", () => {
    expect(
      decreeSubmission({ ...form, status: "published", startsOn: "1889-10-09", endsOn: "1889-10-07" }),
    ).toEqual({
      error: "La date de fin ne peut précéder la date de début.",
    });
  });

  it("sends a publication as local midnights, including a single day", () => {
    expect(decreeSubmission({ ...form, status: "published", endsOn: "1889-10-07" })).toEqual({
      input: {
        title: "Arrêté",
        body: "Texte",
        status: "published",
        startsAt: toApiDate("1889-10-07T00:00"),
        endsAt: toApiDate("1889-10-07T00:00"),
      },
    });
  });
});

const draft = {
  title: "Arrêté",
  body: "Texte",
  status: "draft" as const,
  startsAt: null,
  endsAt: null,
};

describe("recordDecree", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the poster after the decree and drops the decree if the poster is refused", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 4, reference: "DEC-2026-001", ...draft }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: "L'affiche doit être une image JPEG, PNG ou WebP." }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    const poster = new File([new Uint8Array([1, 2, 3])], "arrete.png", { type: "image/png" });

    await expect(recordDecree("jwt", draft, poster)).rejects.toThrow(
      "L'affiche doit être une image JPEG, PNG ou WebP.",
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/api\/decrees\/4\/poster$/);
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
    expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/api\/decrees\/4$/);
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("does not create the decree when the poster is already unacceptable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const poster = new File(["note"], "note.txt", { type: "text/plain" });

    await expect(recordDecree("jwt", draft, poster)).rejects.toThrow(
      "L'affiche doit être une image JPEG, PNG ou WebP.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not upload anything when no poster was chosen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 5, reference: "DEC-2026-002", ...draft }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(recordDecree("jwt", draft, null)).resolves.toMatchObject({ reference: "DEC-2026-002" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
