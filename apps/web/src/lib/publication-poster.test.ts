import { describe, expect, it } from "vitest";

import { containedFrame, PUBLICATION_HEIGHT, PUBLICATION_WIDTH, publicationFileName, wrapLine } from "@/lib/publication-poster";

describe("publication poster", () => {
  it("uses a 3:4 frame, 675 by 900", () => {
    expect(PUBLICATION_WIDTH).toBe(675);
    expect(PUBLICATION_HEIGHT).toBe(900);
    expect(PUBLICATION_WIDTH / PUBLICATION_HEIGHT).toBe(3 / 4);
  });

  it("names the file from the title", () => {
    expect(publicationFileName("Foire d'automne")).toBe("foire-d-automne.png");
    expect(publicationFileName("   ")).toBe("publication.png");
  });

  it("fits a picture inside the frame without stretching it", () => {
    expect(containedFrame({ x: 0, y: 0, width: 675, height: 900 }, { width: 100, height: 100 })).toEqual({
      x: 0,
      y: 112.5,
      width: 675,
      height: 675,
    });
  });

  it("wraps a line when the next word no longer fits", () => {
    const lines = wrapLine("Foire de la ville", 10, (value) => value.length);

    expect(lines).toEqual(["Foire de", "la ville"]);
  });
});
