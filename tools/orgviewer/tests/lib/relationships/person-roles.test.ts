import { describe, expect, it } from "vitest";
import { collectPersonRoles, derivePersonCardRoles } from "../../../src/lib/relationships/person-roles";
import type { Team } from "../../../src/lib/orgapi/types";
import { team } from "../../fixtures/entities";

describe("collectPersonRoles", () => {
  it("collects one role per matching team, including multiple member entries in the same team", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        members: [
          { person: "carol-lee", role: "backend-owner", title: "Backend Owner", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
          { person: "carol-lee", role: "frontend-owner", title: "Frontend Owner", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
        ],
      }),
    };

    expect(collectPersonRoles("carol-lee", teams)).toEqual([
      { teamId: "platform-squad", title: "Backend Owner", kind: "primary-member" },
      { teamId: "platform-squad", title: "Frontend Owner", kind: "primary-member" },
    ]);
  });

  it("returns an empty list for a person with no team roles", () => {
    expect(collectPersonRoles("nobody", {})).toEqual([]);
  });
});

describe("derivePersonCardRoles", () => {
  it("prefers a head_deputy role over a head role over a primary-member role", () => {
    const teams: Record<string, Team> = {
      a: team({
        head: "x",
        members: [{ person: "p", role: "r", title: "Member Role", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null }],
      }),
      b: team({ head: "p", head_title: "Head Role" }),
      c: team({ head: "x", head_deputy: "p", head_deputy_title: "Deputy Role", is_head_deputy_primary_team: true }),
    };

    const { primary, secondary } = derivePersonCardRoles("p", teams);
    expect(primary?.title).toBe("Deputy Role");
    expect(secondary.map((role) => role.title)).toEqual(["Head Role", "Member Role"]);
  });

  it("prefers the primary-team headship over a non-primary headship listed first", () => {
    const teams: Record<string, Team> = {
      a: team({ head: "p", head_title: "Interim Head", is_head_primary_team: false }),
      b: team({ head: "p", head_title: "Primary Head" }),
    };

    const { primary, secondary } = derivePersonCardRoles("p", teams);
    expect(primary?.teamId).toBe("b");
    expect(secondary.map((role) => role.teamId)).toEqual(["a"]);
  });

  it("prefers the primary-team deputyship over a non-primary deputyship listed first", () => {
    const teams: Record<string, Team> = {
      a: team({ head: "x", head_deputy: "p", head_deputy_title: "Other Deputy", is_head_deputy_primary_team: false }),
      b: team({ head: "x", head_deputy: "p", head_deputy_title: "Primary Deputy", is_head_deputy_primary_team: true }),
    };

    expect(derivePersonCardRoles("p", teams).primary?.teamId).toBe("b");
  });

  it("splits two primary-team memberships in the same team into primary + secondary", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        members: [
          { person: "carol-lee", role: "backend-owner", title: "Backend Owner", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
          { person: "carol-lee", role: "frontend-owner", title: "Frontend Owner", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
        ],
      }),
    };

    const { primary, secondary } = derivePersonCardRoles("carol-lee", teams);
    expect(primary?.title).toBe("Backend Owner");
    expect(secondary.map((role) => role.title)).toEqual(["Frontend Owner"]);
  });

  it("returns a null primary and empty secondary for a person with no team roles", () => {
    expect(derivePersonCardRoles("nobody", {})).toEqual({ primary: null, secondary: [] });
  });
});

describe("empty titles", () => {
  it("falls back to 'Head', '<head fallback> Deputy' and 'Member' so no role title is blank", () => {
    const teams: Record<string, Team> = {
      a: team({
        head: "p",
        head_title: "",
        head_deputy: "q",
        is_head_deputy_primary_team: true,
        members: [{ person: "r", role: "x", title: "", is_primary_team: true, deputy: "s", is_interim: false, is_deputy_interim: false }],
      }),
    };

    expect(collectPersonRoles("p", teams)[0]?.title).toBe("Head");
    expect(collectPersonRoles("q", teams)[0]?.title).toBe("Head Deputy");
    expect(collectPersonRoles("r", teams)[0]?.title).toBe("Member");
    expect(collectPersonRoles("s", teams)[0]?.title).toBe("Member Deputy");
  });
});

describe("deputy titles", () => {
  it("titles a head_deputy with no head_deputy_title as the head's title plus ' Deputy'", () => {
    const teams: Record<string, Team> = {
      a: team({ head: "x", head_title: "Lead", head_deputy: "p", is_head_deputy_primary_team: true }),
    };

    expect(collectPersonRoles("p", teams)).toEqual([{ teamId: "a", title: "Lead Deputy", kind: "deputy" }]);
  });
});

describe("interim suffixing", () => {
  it("appends ' (interim)' to a head's title when is_head_interim is true", () => {
    const teams: Record<string, Team> = {
      a: team({ head: "p", head_title: "Head Role", is_head_interim: true }),
    };

    expect(collectPersonRoles("p", teams)).toEqual([{ teamId: "a", title: "Head Role (interim)", kind: "head" }]);
  });

  it("appends ' (interim)' to a head_deputy's title when is_head_deputy_interim is true", () => {
    const teams: Record<string, Team> = {
      a: team({
        head: "x",
        head_deputy: "p",
        head_deputy_title: "Deputy Role",
        is_head_deputy_primary_team: true,
        is_head_deputy_interim: true,
      }),
    };

    expect(collectPersonRoles("p", teams)).toEqual([{ teamId: "a", title: "Deputy Role (interim)", kind: "deputy" }]);
  });

  it("appends ' (interim)' to a member's title when that row's is_interim is true", () => {
    const teams: Record<string, Team> = {
      a: team({
        head: "x",
        members: [
          { person: "p", role: "r", title: "Member Role", is_primary_team: true, deputy: null, is_interim: true, is_deputy_interim: null },
        ],
      }),
    };

    expect(collectPersonRoles("p", teams)).toEqual([
      { teamId: "a", title: "Member Role (interim)", kind: "primary-member" },
    ]);
  });

  it("surfaces a role's deputy as its own role-deputy entry, suffixed when is_deputy_interim is true", () => {
    const teams: Record<string, Team> = {
      a: team({
        head: "x",
        members: [
          {
            person: "owner",
            role: "r",
            title: "Owner Role",
            is_primary_team: true,
            deputy: "p",
            is_interim: false,
            is_deputy_interim: true,
          },
        ],
      }),
    };

    expect(collectPersonRoles("p", teams)).toEqual([{ teamId: "a", title: "Owner Role Deputy (interim)", kind: "role-deputy" }]);
  });
});
