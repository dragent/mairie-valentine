import { describe, expect, it } from "vitest";

import type { GuildMember } from "@/lib/api";
import {
  OFFICES,
  canDismiss,
  cessionHint,
  cessionWarning,
  filterMembers,
  isRowLocked,
  lastVisitText,
  officeChoices,
  showMemberSearch,
  staffLead,
  withLastVisits,
} from "@/lib/personnel";

const MAYOR_ID = "1";

function member(discordId: string, job: GuildMember["job"], name?: Partial<GuildMember>): GuildMember {
  return {
    discordId,
    username: name?.username ?? discordId,
    displayName: name?.displayName ?? null,
    avatarUrl: null,
    job,
    jobLabel: null,
  };
}

describe("who may be dismissed", () => {
  it("lets the mayor dismiss a deputy without asking them", () => {
    expect(canDismiss(member("9", "adjoint"), MAYOR_ID, true)).toBe(true);
  });

  it("lets the mayor and a deputy dismiss a secretary without asking them", () => {
    const secretary = member("2", "secretaire");

    expect(canDismiss(secretary, MAYOR_ID, true)).toBe(true);
    expect(canDismiss(secretary, "7", false)).toBe(true);
  });

  it("stops a deputy from dismissing another deputy or the mayor", () => {
    expect(canDismiss(member("9", "adjoint"), "7", false)).toBe(false);
    expect(canDismiss(member(MAYOR_ID, "maire"), "7", false)).toBe(false);
  });

  it("stops anyone from dismissing themselves or a citizen", () => {
    expect(canDismiss(member("9", "adjoint"), "9", true)).toBe(false);
    expect(canDismiss(member("2", "secretaire"), "2", false)).toBe(false);
    expect(canDismiss(member("3", null), MAYOR_ID, true)).toBe(false);
  });
});

describe("who can be given another office", () => {
  it("locks your own row, the mayor, and a deputy seen by another deputy", () => {
    expect(isRowLocked(member("9", "adjoint"), "9", true)).toBe(true);
    expect(isRowLocked(member(MAYOR_ID, "maire"), "7", false)).toBe(true);
    expect(isRowLocked(member("9", "adjoint"), "7", false)).toBe(true);
    expect(isRowLocked(member("9", "adjoint"), MAYOR_ID, true)).toBe(false);
  });

  it("offers the mayor every office except the seat itself", () => {
    expect(officeChoices(member("3", null), MAYOR_ID, true).map((choice) => choice.label)).toEqual([
      "Citoyen",
      "Secrétaire de mairie",
      "Maire adjoint",
    ]);
    expect(officeChoices(member("9", "adjoint"), MAYOR_ID, true).map((choice) => choice.value)).toEqual([
      "adjoint",
      "secretaire",
    ]);
  });

  it("lets a deputy recruit a secretary and nothing else", () => {
    expect(officeChoices(member("3", null), "7", false).map((choice) => choice.value)).toEqual([
      "citoyen",
      "secretaire",
    ]);
    expect(officeChoices(member("2", "secretaire"), "7", false)).toEqual([]);
    expect(officeChoices(member("9", "adjoint"), "7", false)).toEqual([]);
  });
});

describe("the roster", () => {
  const people = [
    member(MAYOR_ID, "maire", { username: "dragent0", displayName: "William Harrington" }),
    member("9", "adjoint", { username: "ada" }),
    member("2", "secretaire", { username: "clerk" }),
    member("3", null, { username: "citizen" }),
  ];

  it("lists the offices from the mayor down to the citizens", () => {
    expect(OFFICES.map((office) => office.job)).toEqual(["maire", "adjoint", "secretaire", null]);
  });

  it("matches a character name or an account, ignoring case", () => {
    expect(filterMembers(people, "  HARRINGTON ").map((person) => person.discordId)).toEqual([MAYOR_ID]);
    expect(filterMembers(people, "clerk").map((person) => person.discordId)).toEqual(["2"]);
    expect(filterMembers(people, "")).toHaveLength(4);
  });

  it("shows the search once the town is large enough to need it", () => {
    expect(showMemberSearch(6)).toBe(false);
    expect(showMemberSearch(7)).toBe(true);
  });
});

describe("the wording", () => {
  it("speaks as the town hall, including when only registered citizens are listed", () => {
    expect(staffLead(true, false)).toContain("compose son administration");
    expect(staffLead(false, false)).toContain("sans qu'ils aient à accepter");
    expect(staffLead(true, true)).toContain("déjà connus de la mairie");
    expect(staffLead(false, true)).toContain("déjà connus de la mairie");
  });

  it("warns the sitting mayor that ceding the seat makes them a citizen", () => {
    expect(cessionWarning("Ada", true)).toContain("Vous redeviendrez citoyen");
    expect(cessionHint(true)).toContain("Vous retombez citoyen");
    expect(cessionWarning("Ada", false)).not.toContain("Vous redeviendrez citoyen");
  });

  it("keeps the last portal visit next to the Discord member", () => {
    const merged = withLastVisits(
      [{ discordId: "1" }, { discordId: "2" }],
      [{ discordId: "1", lastLoginAt: "2026-10-07T07:35:00.000Z" }],
    );

    expect(merged[0]?.lastLoginAt).toBe("2026-10-07T07:35:00.000Z");
    expect(merged[1]?.lastLoginAt).toBeNull();
    expect(lastVisitText(null, () => "unused")).toBe("N'a pas encore ouvert le portail");
    expect(lastVisitText("2026-10-07T07:35:00.000Z", () => "7 oct.")).toBe("Dernière visite : 7 oct.");
  });
});
