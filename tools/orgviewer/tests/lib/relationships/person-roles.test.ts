import { describe, expect, it } from "vitest";
import { collectPersonRoles, derivePersonCardRoles } from "../../../src/lib/relationships/person-roles";
import type { Team } from "../../../src/lib/orgapi/types";

function team(overrides: Partial<Team> & { head: string }): Team {
  return {
    name: "T",
    type: "squad",
    description: "",
    documentation_url: "",
    contact_email: "t@example.com",
    parent_team: null,
    head_title: "Head",
    head_deputy: null,
    head_deputy_title: null,
    is_head_primary_team: true,
    is_head_deputy_primary_team: null,
    is_head_interim: false,
    is_head_deputy_interim: null,
    external_references: {},
    members: [],
    reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
    is_hierarchical: false,
    is_cross_functional: false,
    is_temporary: false,
    ...overrides,
  };
}

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
      c: team({ head: "x", head_deputy: "p", head_deputy_title: "Deputy Role" }),
    };

    const { primary, secondary } = derivePersonCardRoles("p", teams);
    expect(primary?.title).toBe("Deputy Role");
    expect(secondary.map((role) => role.title)).toEqual(["Head Role", "Member Role"]);
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

    expect(collectPersonRoles("p", teams)).toEqual([{ teamId: "a", title: "Deputy (interim)", kind: "role-deputy" }]);
  });
});
