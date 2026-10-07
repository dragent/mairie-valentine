import { afterEach, describe, expect, it, vi } from "vitest";

import { announceMunicipalEvent, posterRejection } from "@/lib/event-poster";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("posterRejection", () => {
  it("accepts a jpeg, png or webp within 5 Mo", () => {
    expect(posterRejection(new File([new Uint8Array([1])], "foire.png", { type: "image/png" }))).toBeNull();
    expect(posterRejection(new File([new Uint8Array([1])], "foire.jpg", { type: "image/jpeg" }))).toBeNull();
    expect(posterRejection(new File([new Uint8Array([1])], "foire.webp", { type: "image/webp" }))).toBeNull();
  });

  it("refuses a file that is not an image", () => {
    expect(posterRejection(new File(["note"], "note.txt", { type: "text/plain" }))).toBe(
      "L'affiche doit être une image JPEG, PNG ou WebP.",
    );
  });

  it("refuses a poster over 5 Mo", () => {
    const oversized = new File([new Uint8Array([1])], "foire.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 5 * 1024 * 1024 + 1 });

    expect(posterRejection(oversized)).toBe("L'affiche ne peut dépasser 5 Mo.");
  });
});

describe("announceMunicipalEvent", () => {
  const input = {
    title: "Foire",
    description: null,
    startsAt: "1889-10-07T12:00:00.000Z",
    endsAt: null,
    location: "Grand-rue",
  };

  it("sends the poster after the event and drops the event if the poster is refused", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 4, title: "Foire" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: "L'affiche doit être une image JPEG, PNG ou WebP." }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    const poster = new File([new Uint8Array([1, 2, 3])], "foire.png", { type: "image/png" });

    await expect(announceMunicipalEvent("jwt", input, poster)).rejects.toThrow(
      "L'affiche doit être une image JPEG, PNG ou WebP.",
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/api\/municipal_events\/4\/poster$/);
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
    expect(String(fetchMock.mock.calls[2][0])).toMatch(/\/api\/municipal_events\/4$/);
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("does not create the event when the poster is already unacceptable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const poster = new File(["note"], "note.txt", { type: "text/plain" });

    await expect(announceMunicipalEvent("jwt", input, poster)).rejects.toThrow(
      "L'affiche doit être une image JPEG, PNG ou WebP.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not upload anything when no poster was chosen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 5, title: "Foire" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await announceMunicipalEvent("jwt", input, null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
