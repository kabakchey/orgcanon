import { describe, expect, it } from "vitest";
import { findRootTeamId, orgTreeToFlow } from "../../../src/lib/relationships/org-tree-to-flow";
import { EDGE_STYLE } from "../../../src/components/edge-styles";
import type { AuthorityLine, AuthorityLineType, Person, Team } from "../../../src/lib/orgapi/types";

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

describe("orgTreeToFlow", () => {
  it("builds team and person nodes with hierarchy and membership edges", () => {
    const teams: Record<string, Team> = {
      "r-and-d": team({
        name: "R&D",
        type: "department",
        head: "vp-eng",
        head_title: "VP Eng",
      }),
      "platform-squad": team({
        name: "Platform Squad",
        type: "squad",
        parent_team: "r-and-d",
        head: "alice-nguyen",
        head_title: "Lead",
        head_deputy: "bob-diaz",
        head_deputy_title: "Deputy",
        members: [
          { person: "carol-lee", role: "eng", title: "Engineer", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
        ],
      }),
    };
    const people: Record<string, Person> = {};

    const { nodes, edges } = orgTreeToFlow(teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      [
        "team:r-and-d",
        "team:platform-squad",
        "person:vp-eng",
        "person:alice-nguyen",
        "person:bob-diaz",
        "person:carol-lee",
      ].sort()
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "team:r-and-d", target: "team:platform-squad" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({
        source: "team:platform-squad",
        target: "person:alice-nguyen",
        type: "labeled",
      })
    );
  });

  it("carries team type/description, each membership title on its edge, and the person's current position title into node data", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        name: "Platform Squad",
        type: "squad",
        description: "Owns platform billing components.",
        documentation_url: "https://example.com/teams/platform-squad",
        head: "alice-nguyen",
        head_title: "Team Lead",
        members: [
          { person: "carol-lee", role: "backend-owner", title: "Backend Owner", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
          { person: "carol-lee", role: "frontend-owner", title: "Frontend Owner", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
        ],
      }),
    };
    const people: Record<string, Person> = {
      "alice-nguyen": {
        name: "Alice Nguyen",
        email: "",
        primary_specialization: "backend",
        secondary_specializations: [],
        external_references: {},
        documentation_url: "",
        positions: [],
        extensions: {},
        reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
      },
      "carol-lee": {
        name: "Carol Lee",
        email: "",
        primary_specialization: "backend",
        secondary_specializations: [],
        external_references: {},
        documentation_url: "https://example.com/people/carol-lee",
        positions: [
          {
            type: "senior-engineer",
            title: "Senior Software Engineer",
            start_date: "2024-01-01",
            end_date: null,
            reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
          },
        ],
        extensions: {},
        reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
      },
    };

    const { nodes, edges } = orgTreeToFlow(teams, people);

    const teamNode = nodes.find((n) => n.id === "team:platform-squad");
    expect(teamNode?.data).toMatchObject({
      type: "squad",
      description: "Owns platform billing components.",
      documentationUrl: "https://example.com/teams/platform-squad",
    });

    const carolNode = nodes.find((n) => n.id === "person:carol-lee");
    expect(carolNode?.data).toMatchObject({
      label: "Carol Lee",
      positionTitle: "Senior Software Engineer",
      documentationUrl: "https://example.com/people/carol-lee",
    });
    expect(carolNode?.data).not.toHaveProperty("primaryTitle");
    expect(carolNode?.data).not.toHaveProperty("secondaryTitles");

    expect(edges.map((edge) => edge.label)).toEqual(
      expect.arrayContaining(["Backend Owner", "Frontend Owner"])
    );
  });

  it("styles the head and deputy edges like a line-management link, ordinary members like membership", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        head_deputy: "bob-diaz",
        members: [{ person: "carol-lee", role: "eng", title: "Engineer", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null }],
      }),
    };
    const people: Record<string, Person> = {};

    const { edges } = orgTreeToFlow(teams, people);

    const headEdge = edges.find((e) => e.target === "person:alice-nguyen");
    const deputyEdge = edges.find((e) => e.target === "person:bob-diaz");
    const memberEdge = edges.find((e) => e.target === "person:carol-lee");

    expect(headEdge?.style).toEqual(EDGE_STYLE.lineManagement);
    expect(deputyEdge?.style).toEqual(EDGE_STYLE.lineManagement);
    expect(memberEdge?.style).toEqual(EDGE_STYLE.membership);
    // Styling change only -- head/deputy edges keep the foldable "membership:" prefix.
    expect(headEdge?.id).toMatch(/^membership:/);
    expect(deputyEdge?.id).toMatch(/^membership:/);
  });

  it("marks a non-primary team membership with a distinct, non-foldable edge id prefix", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        members: [
          { person: "dana-kim", role: "eng", title: "Engineer", is_primary_team: false, deputy: null, is_interim: false, is_deputy_interim: null },
        ],
      }),
    };
    const people: Record<string, Person> = {};

    const { edges } = orgTreeToFlow(teams, people);

    const membershipEdge = edges.find((e) => e.target === "person:dana-kim");
    expect(membershipEdge?.id).toMatch(/^membership-secondary:/);
  });

  it("appends ' (interim)' to the head/deputy/member edge labels whose flag is true", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        head_title: "Lead",
        is_head_interim: true,
        head_deputy: "bob-diaz",
        head_deputy_title: "Deputy Lead",
        is_head_deputy_interim: true,
        members: [
          { person: "carol-lee", role: "eng", title: "Engineer", is_primary_team: true, deputy: null, is_interim: true, is_deputy_interim: null },
        ],
      }),
    };
    const people: Record<string, Person> = {};

    const { edges } = orgTreeToFlow(teams, people);

    expect(edges.find((e) => e.target === "person:alice-nguyen")?.label).toBe("Lead (interim)");
    expect(edges.find((e) => e.target === "person:bob-diaz")?.label).toBe("Deputy Lead (interim)");
    expect(edges.find((e) => e.target === "person:carol-lee")?.label).toBe("Engineer (interim)");
  });

  it("adds a Deputy node/edge for a members[] row's deputy, suffixed when is_deputy_interim is true", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        members: [
          {
            person: "carol-lee",
            role: "eng",
            title: "Engineer",
            is_primary_team: true,
            deputy: "dana-kim",
            is_interim: false,
            is_deputy_interim: true,
          },
        ],
      }),
    };
    const people: Record<string, Person> = {};

    const { nodes, edges } = orgTreeToFlow(teams, people);

    expect(nodes.map((n) => n.id)).toContain("person:dana-kim");
    const deputyEdge = edges.find((e) => e.target === "person:dana-kim");
    expect(deputyEdge?.label).toBe("Deputy (interim)");
    expect(deputyEdge?.style).toEqual(EDGE_STYLE.membership);
  });
});

describe("orgTreeToFlow options", () => {
  const teams: Record<string, Team> = {
    "platform-squad": team({
      head: "alice-nguyen",
      members: [
        { person: "carol-lee", role: "eng", title: "Engineer", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null },
      ],
    }),
  };
  const people: Record<string, Person> = {};
  const authorityLines: Record<string, AuthorityLine> = {
    "carol-lee-tech-lead": {
      person: "carol-lee",
      deputy: "dana-kim",
      type: "tech-lead",
      start_date: "2025-01-01",
      end_date: null,
      teams: ["platform-squad"],
      documentation_url: "",
      is_interim: false,
      is_deputy_interim: true,
      reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
    },
  };
  const authorityLineTypes: Record<string, AuthorityLineType> = {
    "tech-lead": { title: "Tech Lead", description: "", documentation_url: "", reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" } },
  };

  it("omits person nodes and membership edges when showPeople is false", () => {
    const { nodes, edges } = orgTreeToFlow(teams, people, "DOWN", { showPeople: false });

    expect(nodes.map((n) => n.id)).toEqual(["team:platform-squad"]);
    expect(edges).toEqual([]);
  });

  it("adds authority-line and deputy edges styled like Authority Over's when showAuthorityLines is true", () => {
    const { nodes, edges } = orgTreeToFlow(teams, people, "DOWN", {
      showPeople: false,
      showAuthorityLines: true,
      authorityLines,
      authorityLineTypes,
    });

    expect(nodes.map((n) => n.id).sort()).toEqual(["person:carol-lee", "person:dana-kim", "team:platform-squad"].sort());
    const authorityEdge = edges.find((e) => e.source === "person:carol-lee");
    expect(authorityEdge).toMatchObject({ target: "team:platform-squad", style: EDGE_STYLE.authority, label: "Tech Lead" });
    const deputyEdge = edges.find((e) => e.source === "person:dana-kim");
    expect(deputyEdge).toMatchObject({ target: "team:platform-squad", style: EDGE_STYLE.authority, label: "Deputy (interim)" });
  });

  it("dedupes a person who is both a member and an authority-line holder into one node", () => {
    const { nodes, edges } = orgTreeToFlow(teams, people, "DOWN", {
      showPeople: true,
      showAuthorityLines: true,
      authorityLines,
      authorityLineTypes,
    });

    expect(nodes.filter((n) => n.id === "person:carol-lee")).toHaveLength(1);
    expect(edges.filter((e) => e.target === "person:carol-lee" || e.source === "person:carol-lee")).toHaveLength(2);
  });
});

describe("findRootTeamId", () => {
  it("returns the id of the team with no parent_team", () => {
    const teams: Record<string, Team> = {
      "r-and-d": team({ head: "vp-eng", parent_team: "potuto" }),
      potuto: team({ head: "cto", parent_team: null }),
    };

    expect(findRootTeamId(teams)).toBe("potuto");
  });

  it("returns undefined when no team is rootless", () => {
    expect(findRootTeamId({})).toBeUndefined();
  });
});
