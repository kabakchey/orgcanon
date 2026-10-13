import { describe, expect, it } from "vitest";
import { authorityOverToFlow } from "../../../src/lib/relationships/authority-over-to-flow";
import type { OrgData } from "../../../src/lib/orgapi/types";
import { EDGE_STYLE } from "../../../src/lib/relationships/edge-styles";
import orgData from "../../fixtures/three-level-org-data.json";

const {
  teams,
  people,
  authority_lines: authorityLines,
  authority_line_types: authorityLineTypes,
} = orgData as unknown as OrgData;

describe("authorityOverToFlow", () => {
  it("draws the viewed team's head deputy with a head_deputy_title edge to the team and a team-named Deputy edge from the head", () => {
    const { edges } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:bob-diaz", target: "team:platform-squad", style: EDGE_STYLE.lineManagementNonHierarchical, label: "Deputy Team Lead" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:alice-nguyen", target: "person:bob-diaz", style: EDGE_STYLE.lineManagementNonHierarchical, label: "Deputy (Platform Squad)" })
    );
  });

  it("styles the viewed team's head edge by whether the team is hierarchical", () => {
    const headEdgeStyle = (teamId: string) =>
      authorityOverToFlow(teamId, teams, people, authorityLines, authorityLineTypes).edges.find(
        (e) => e.source === `person:${teams[teamId]!.head}` && e.target === `team:${teamId}`
      )?.style;

    expect(headEdgeStyle("platform-squad")).toEqual(EDGE_STYLE.lineManagementNonHierarchical);
    expect(headEdgeStyle("r-and-d")).toEqual(EDGE_STYLE.lineManagement);
  });

  it("falls back to 'Head' and 'Head Deputy' for the viewed team's head/deputy edges when titles are empty", () => {
    const untitled = { ...teams, "platform-squad": { ...teams["platform-squad"]!, head_title: "", head_deputy_title: null } };

    const { edges } = authorityOverToFlow("platform-squad", untitled, people, authorityLines, authorityLineTypes);

    expect(edges.find((e) => e.source === "person:alice-nguyen" && e.target === "team:platform-squad")?.label).toBe("Head");
    expect(edges.find((e) => e.source === "person:bob-diaz" && e.target === "team:platform-squad")?.label).toBe("Head Deputy");
  });

  it("styles the manager chain's links through a non-hierarchical team as non-hierarchical", () => {
    const { edges } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);
    const styleOf = (id: string) => edges.find((e) => e.id === id)?.style;

    expect(styleOf("chain:vp-eng->alice-nguyen")).toEqual(EDGE_STYLE.lineManagementNonHierarchical);
    expect(styleOf("chain:cto->vp-eng")).toEqual(EDGE_STYLE.lineManagement);
  });

  it("draws a Deputy edge from a manager higher up the chain to their own deputy", () => {
    const withVpDeputy = { ...teams, "r-and-d": { ...teams["r-and-d"]!, head_deputy: "dana-kim", is_head_deputy_primary_team: true, is_head_deputy_interim: false } };

    const { nodes, edges } = authorityOverToFlow("platform-squad", withVpDeputy, people, authorityLines, authorityLineTypes);

    expect(nodes.map((n) => n.id)).toContain("person:dana-kim");
    expect(edges).toContainEqual(expect.objectContaining({ source: "person:vp-eng", target: "person:dana-kim", label: "Deputy (R&D)" }));
    expect(edges.some((e) => e.source === "person:dana-kim" && e.target === "team:platform-squad")).toBe(false);
  });

  it("draws a plain Deputy edge from an authority line's holder to its deputy", () => {
    const withDeputy = {
      "carol-lee-tech-lead": { ...authorityLines["carol-lee-tech-lead"]!, deputy: "dana-kim", is_deputy_interim: true },
    };

    const { edges } = authorityOverToFlow("platform-squad", teams, people, withDeputy, authorityLineTypes);

    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:carol-lee", target: "person:dana-kim", style: EDGE_STYLE.authority, label: "Deputy (interim)" })
    );
  });

  it("labels an authority line's deputy edge with the line type's title plus ' Deputy'", () => {
    const withDeputy = {
      "carol-lee-tech-lead": { ...authorityLines["carol-lee-tech-lead"]!, deputy: "bob-diaz", is_deputy_interim: false },
    };

    const { edges } = authorityOverToFlow("platform-squad", teams, people, withDeputy, authorityLineTypes);

    expect(edges.find((e) => e.id === "authority-deputy:bob-diaz->platform-squad")?.label).toBe("Tech Lead Deputy");
  });

  it("builds the team node, a person node for each authority-holder, and a person node for the team's head and each of its managers up the chain", () => {
    const { nodes } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["team:platform-squad", "person:carol-lee", "person:alice-nguyen", "person:bob-diaz", "person:vp-eng", "person:cto"].sort()
    );
  });

  it("puts the team's and each person's documentation_url on their cards", () => {
    const { nodes } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    const team = nodes.find((n) => n.id === "team:platform-squad");
    expect(team?.data).toMatchObject({ documentationUrl: "https://example.com/teams/platform-squad" });

    const carol = nodes.find((n) => n.id === "person:carol-lee");
    expect(carol?.data).toMatchObject({ documentationUrl: "https://example.com/people/carol-lee" });
  });

  it("draws an authority: edge from each holder to the team, labeled with the authority line's type title", () => {
    const { edges } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "authority:carol-lee->platform-squad",
        source: "person:carol-lee",
        target: "team:platform-squad",
        label: "Tech Lead",
      })
    );
  });

  it("draws a chain: edge from the team's head to the team, labeled with the head's title", () => {
    const { edges } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "chain:alice-nguyen->team:platform-squad",
        source: "person:alice-nguyen",
        target: "team:platform-squad",
        label: "Team Lead",
      })
    );
  });

  it("draws a chain: edge from the head's direct manager to the head, labeled Line manager", () => {
    const { edges } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "chain:vp-eng->alice-nguyen",
        source: "person:vp-eng",
        target: "person:alice-nguyen",
        label: "Line manager",
      })
    );
  });

  it("draws chain: edges up through the rest of the line-management chain to the org root", () => {
    const { edges } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "chain:cto->vp-eng",
        source: "person:cto",
        target: "person:vp-eng",
        label: "Line manager",
      })
    );
  });

  it("returns just the team node and its head, with a chain: edge from head to team, for the org root (no manager above it)", () => {
    const { nodes, edges } = authorityOverToFlow("potuto", teams, people, authorityLines, authorityLineTypes);

    expect(nodes.map((n) => n.id).sort()).toEqual(["team:potuto", "person:cto"].sort());
    expect(edges).toEqual([
      expect.objectContaining({
        id: "chain:cto->team:potuto",
        source: "person:cto",
        target: "team:potuto",
        label: "CTO",
      }),
    ]);
  });

  it("does not cascade to an ancestor team not explicitly named by the authority line", () => {
    const { nodes } = authorityOverToFlow("r-and-d", teams, people, authorityLines, authorityLineTypes);

    expect(nodes.map((n) => n.id).sort()).toEqual(["team:r-and-d", "person:vp-eng", "person:cto"].sort());
  });

  it("does not add an authority holder's own personal line-management chain when they are unrelated to the team", () => {
    const otherTeams = {
      ...teams,
      "other-team": {
        ...teams["platform-squad"]!,
        name: "Other Team",
        parent_team: null,
        head: "other-head",
        head_title: "Other Head",
        head_deputy: null,
        members: [
          { person: "outside-holder", role: "eng", title: "Engineer", is_primary_team: true, is_interim: false, deputy: null, is_deputy_interim: false },
        ],
      },
    };
    const otherAuthorityLines = {
      ...authorityLines,
      "outside-holder-tech-lead": {
        ...authorityLines["carol-lee-tech-lead"]!,
        person: "outside-holder",
        teams: ["platform-squad"],
      },
    };

    const { nodes, edges } = authorityOverToFlow(
      "platform-squad",
      otherTeams,
      people,
      otherAuthorityLines,
      authorityLineTypes
    );

    // outside-holder's own line manager is other-head (their primary team's head) -- they must
    // not appear just because outside-holder holds an authority line over platform-squad.
    expect(nodes.map((n) => n.id)).not.toContain("person:other-head");
    expect(edges.some((e) => e.id.includes("other-head"))).toBe(false);
  });
});
