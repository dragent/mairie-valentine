import { describe, expect, it } from "vitest";

import { noteByline, splitNotes } from "@/lib/notes";

describe("noteByline", () => {
  it("names the office before the signatory", () => {
    expect(noteByline({ authorJobLabel: "Maire", authorName: "Arthur Callahan" })).toBe(
      "Maire — Arthur Callahan",
    );
  });

  it("falls back when the author left no office", () => {
    expect(noteByline({ authorName: "Ada" })).toBe("Ada");
  });
});

describe("splitNotes", () => {
  it("keeps desk memos apart from the archive", () => {
    const current = { id: 1, status: "current" as const };
    const archived = { id: 2, status: "archived" as const };

    expect(splitNotes([archived, current])).toEqual({
      current: [current],
      archived: [archived],
    });
  });
});
