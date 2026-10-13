import { describe, expect, it } from "vitest";
import {
  reverseConnectionSourceKeysFor,
  reverseConnectionsFor,
} from "../../../src/lib/orgapi/reverse-connections";

describe("reverseConnectionSourceKeysFor", () => {
  it("lists only the collections a given entity type's reverse connections actually need", () => {
    expect(reverseConnectionSourceKeysFor("teams")).toEqual(
      expect.arrayContaining(["teams", "components", "authority_lines"])
    );
    expect(reverseConnectionSourceKeysFor("teams")).toHaveLength(3);
    expect(reverseConnectionSourceKeysFor("authority_lines")).toEqual([]);
  });
});

describe("reverseConnectionsFor", () => {
  it("finds child teams, owned components, and authority lines over a team", () => {
    const sources = {
      teams: {
        "r-and-d": { parent_team: null },
        "platform-squad": { parent_team: "r-and-d" },
      },
      components: {
        "billing-api": { team: "platform-squad" },
      },
      authority_lines: {
        "audit-1": { teams: ["platform-squad"], person: "cto", deputy: null, type: "oversight" },
      },
    };

    const connections = reverseConnectionsFor("teams", "platform-squad", sources);

    expect(connections).toContainEqual({ label: "Owned components", targetKey: "components", ids: ["billing-api"] });
    expect(connections).toContainEqual({
      label: "Authority lines over this team",
      targetKey: "authority_lines",
      ids: ["audit-1"],
    });

    const childConnections = reverseConnectionsFor("teams", "r-and-d", sources);
    expect(childConnections).toContainEqual({ label: "Child teams", targetKey: "teams", ids: ["platform-squad"] });
  });

  it("finds a person's team headships, deputy headships, memberships, and authority lines held", () => {
    const sources = {
      teams: {
        "r-and-d": { head: "vp-eng", head_deputy: null, members: [] },
        "platform-squad": {
          head: "someone-else",
          head_deputy: "vp-eng",
          members: [{ person: "carol-lee", role: "backend-owner" }],
        },
      },
      authority_lines: {
        "audit-1": { person: "vp-eng", deputy: null, teams: [] },
        "audit-2": { person: "someone-else", deputy: "vp-eng", teams: [] },
      },
    };

    const connections = reverseConnectionsFor("people", "vp-eng", sources);
    expect(connections).toContainEqual({ label: "Head of", targetKey: "teams", ids: ["r-and-d"] });
    expect(connections).toContainEqual({ label: "Deputy head of", targetKey: "teams", ids: ["platform-squad"] });
    expect(connections).toContainEqual({
      label: "Authority lines held",
      targetKey: "authority_lines",
      ids: ["audit-1", "audit-2"],
    });

    const memberConnections = reverseConnectionsFor("people", "carol-lee", sources);
    expect(memberConnections).toContainEqual({ label: "Member of", targetKey: "teams", ids: ["platform-squad"] });
  });

  it("finds components that depend on a component and roles that use it", () => {
    const sources = {
      components: {
        "billing-api": { dependency_components: [] },
        "billing-ui": { dependency_components: ["billing-api"] },
      },
      roles: {
        "backend-owner": { components: ["billing-api"] },
      },
    };

    const connections = reverseConnectionsFor("components", "billing-api", sources);
    expect(connections).toContainEqual({ label: "Depended on by", targetKey: "components", ids: ["billing-ui"] });
    expect(connections).toContainEqual({ label: "Used by roles", targetKey: "roles", ids: ["backend-owner"] });
  });

  it("finds team memberships using a role", () => {
    const sources = {
      teams: {
        "platform-squad": { members: [{ person: "carol-lee", role: "backend-owner" }] },
      },
    };

    expect(reverseConnectionsFor("roles", "backend-owner", sources)).toContainEqual({
      label: "Used in team memberships",
      targetKey: "teams",
      ids: ["platform-squad"],
    });
  });

  it("finds entities of a given *_type, including people via their position history", () => {
    expect(
      reverseConnectionsFor("team_types", "squad", { teams: { "platform-squad": { type: "squad" } } })
    ).toContainEqual({ label: "Teams of this type", targetKey: "teams", ids: ["platform-squad"] });

    expect(
      reverseConnectionsFor("component_types", "service", { components: { "billing-api": { type: "service" } } })
    ).toContainEqual({ label: "Components of this type", targetKey: "components", ids: ["billing-api"] });

    expect(
      reverseConnectionsFor("authority_line_types", "oversight", {
        authority_lines: { "audit-1": { type: "oversight" } },
      })
    ).toContainEqual({ label: "Authority lines of this type", targetKey: "authority_lines", ids: ["audit-1"] });

    expect(
      reverseConnectionsFor("formal_position_types", "software-engineer", {
        people: { "carol-lee": { positions: [{ type: "software-engineer" }] } },
      })
    ).toContainEqual({ label: "People with this position type", targetKey: "people", ids: ["carol-lee"] });
  });

  it("omits a connection group entirely when nothing matches", () => {
    const connections = reverseConnectionsFor("teams", "platform-squad", {
      teams: { "platform-squad": { parent_team: "r-and-d" } },
    });
    expect(connections).toEqual([]);
  });

  it("skips a spec whose source collection was never loaded", () => {
    const connections = reverseConnectionsFor("teams", "platform-squad", {});
    expect(connections).toEqual([]);
  });
});
