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

  it("styles a non-hierarchical team's head and deputy edges as non-hierarchical line management", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({ head: "alice-nguyen", head_deputy: "bob-diaz", is_hierarchical: false }),
    };

    const { edges } = orgTreeToFlow(teams, {});

    expect(edges.find((e) => e.target === "person:alice-nguyen")?.style).toEqual(EDGE_STYLE.lineManagementNonHierarchical);
    expect(edges.find((e) => e.id.startsWith("membership:") && e.target === "person:bob-diaz")?.style).toEqual(
      EDGE_STYLE.lineManagementNonHierarchical
    );
  });

  it("styles the head and deputy edges like a line-management link, ordinary members like membership", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        is_hierarchical: true,
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
    expect(deputyEdge?.label).toBe("Engineer Deputy (interim)");
    expect(deputyEdge?.style).toEqual(EDGE_STYLE.membership);
  });

  it("labels a head_deputy with no head_deputy_title as the head's title plus ' Deputy'", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({ head: "alice-nguyen", head_title: "Lead", head_deputy: "bob-diaz", head_deputy_title: null }),
    };

    const { edges } = orgTreeToFlow(teams, {});

    expect(edges.find((e) => e.target === "person:bob-diaz")?.label).toBe("Lead Deputy");
  });
});

describe("orgTreeToFlow non-hierarchical team edges", () => {
  it("styles a team edge as non-hierarchical when either the parent or the child is non-hierarchical", () => {
    const teams: Record<string, Team> = {
      root: team({ name: "Root", head: "a", is_hierarchical: true }),
      group: team({ name: "Working Group", head: "b", parent_team: "root", is_hierarchical: false }),
      "group-sub": team({ name: "Group Sub", head: "c", parent_team: "group", is_hierarchical: true }),
      squad: team({ name: "Squad", head: "d", parent_team: "root", is_hierarchical: true }),
    };

    const { edges } = orgTreeToFlow(teams, {}, "DOWN", { showPeople: false });
    const styleOf = (id: string) => edges.find((e) => e.id === id)?.style;

    expect(styleOf("hierarchy:root->group")).toEqual(EDGE_STYLE.nonHierarchical);
    expect(styleOf("hierarchy:group->group-sub")).toEqual(EDGE_STYLE.nonHierarchical);
    expect(styleOf("hierarchy:root->squad")).toEqual(EDGE_STYLE.parentChild);
  });
});

describe("orgTreeToFlow non-hierarchical head-deputy edge", () => {
  it("styles a head->deputy edge as non-hierarchical line management when the team is non-hierarchical", () => {
    const teams: Record<string, Team> = {
      group: team({ head: "a", head_deputy: "b", is_head_deputy_primary_team: true, is_hierarchical: false }),
      squad: team({ head: "c", head_deputy: "d", is_head_deputy_primary_team: true, is_hierarchical: true }),
    };

    const { edges } = orgTreeToFlow(teams, {});

    expect(edges.find((e) => e.id === "deputy:group:a->b")?.style).toEqual(EDGE_STYLE.lineManagementNonHierarchical);
    expect(edges.find((e) => e.id === "deputy:squad:c->d")?.style).toEqual(EDGE_STYLE.lineManagement);
  });
});

describe("orgTreeToFlow empty titles", () => {
  it("falls back to 'Head', 'Head Deputy', 'Member' and 'Member Deputy' edge labels instead of blank ones", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        head_title: "",
        head_deputy: "bob-diaz",
        head_deputy_title: null,
        is_head_deputy_primary_team: true,
        members: [
          { person: "carol-lee", role: "eng", title: "", is_primary_team: true, deputy: "dana-kim", is_interim: false, is_deputy_interim: false },
        ],
      }),
    };

    const { edges } = orgTreeToFlow(teams, {});
    const labelTo = (personId: string) => edges.find((e) => e.source === "team:platform-squad" && e.target === `person:${personId}`)?.label;

    expect(labelTo("alice-nguyen")).toBe("Head");
    expect(labelTo("bob-diaz")).toBe("Head Deputy");
    expect(labelTo("carol-lee")).toBe("Member");
    expect(labelTo("dana-kim")).toBe("Member Deputy");
  });
});

describe("orgTreeToFlow holder-to-deputy edges", () => {
  it("draws a Deputy edge in each deputized relationship's own style, holder to deputy", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        head: "alice-nguyen",
        head_deputy: "bob-diaz",
        is_head_deputy_primary_team: true,
        is_head_deputy_interim: true,
        is_hierarchical: true,
        members: [
          { person: "carol-lee", role: "eng", title: "Engineer", is_primary_team: true, deputy: "dana-kim", is_interim: false, is_deputy_interim: false },
        ],
      }),
    };
    const authorityLines: Record<string, AuthorityLine> = {
      "carol-lee-tech-lead": {
        person: "carol-lee",
        deputy: "erin-fox",
        type: "tech-lead",
        start_date: "2025-01-01",
        end_date: null,
        teams: ["platform-squad"],
        documentation_url: "",
        is_interim: false,
        is_deputy_interim: false,
        reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
      },
    };
    const authorityLineTypes: Record<string, AuthorityLineType> = {
      "tech-lead": { title: "Tech Lead", description: "", documentation_url: "", reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" } },
    };

    const { edges } = orgTreeToFlow(teams, {}, "DOWN", { showPeople: true, showAuthorityLines: true, authorityLines, authorityLineTypes });

    const deputyEdges = edges.filter((e) => e.id.startsWith("deputy:"));
    expect(deputyEdges).toHaveLength(3);
    expect(deputyEdges).toContainEqual(
      expect.objectContaining({ source: "person:alice-nguyen", target: "person:bob-diaz", style: EDGE_STYLE.lineManagement, label: "Deputy (interim)" })
    );
    expect(deputyEdges).toContainEqual(
      expect.objectContaining({ source: "person:carol-lee", target: "person:dana-kim", style: EDGE_STYLE.membership, label: "Deputy" })
    );
    expect(deputyEdges).toContainEqual(
      expect.objectContaining({ source: "person:carol-lee", target: "person:erin-fox", style: EDGE_STYLE.authority, label: "Deputy" })
    );
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
    expect(deputyEdge).toMatchObject({ target: "team:platform-squad", style: EDGE_STYLE.authority, label: "Tech Lead Deputy (interim)" });
  });

  it("dedupes a person who is both a member and an authority-line holder into one node", () => {
    const { nodes, edges } = orgTreeToFlow(teams, people, "DOWN", {
      showPeople: true,
      showAuthorityLines: true,
      authorityLines,
      authorityLineTypes,
    });

    expect(nodes.filter((n) => n.id === "person:carol-lee")).toHaveLength(1);
    expect(
      edges.filter((e) => !e.id.startsWith("deputy:") && (e.target === "person:carol-lee" || e.source === "person:carol-lee"))
    ).toHaveLength(2);
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
