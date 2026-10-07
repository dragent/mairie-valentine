import { describe, expect, it } from "vitest";

import { noteMentions } from "@/lib/note-links";

describe("noteMentions", () => {
  it("links a decree reference and a citizen name that already exist", () => {
    const mentions = noteMentions("Voir DEC-1889-004 pour Jean Dupont, pas Jeanne.", {
      decrees: [{ reference: "DEC-1889-004" }, { reference: "DEC-1889-001" }],
      citizens: ["Jean", "Jean Dupont", "Jeanne"],
    });

    expect(mentions).toEqual([
      { kind: "decree", label: "DEC-1889-004", href: "/mairie/decrets" },
      { kind: "citizen", label: "Jean Dupont", href: "/mairie/rendez-vous" },
      { kind: "citizen", label: "Jeanne", href: "/mairie/rendez-vous" },
    ]);
  });

  it("ignores a reference or a name the registers do not know", () => {
    expect(
      noteMentions("DEC-1889-999 et Zoé.", {
        decrees: [{ reference: "DEC-1889-001" }],
        citizens: ["Zo"],
      }),
    ).toEqual([]);
  });
});
