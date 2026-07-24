import { describe, expect, it } from "vitest";
import { authorityOverToFlow } from "../../../src/lib/relationships/authority-over-to-flow";
import type { OrgData } from "../../../src/lib/orgapi/types";
import orgData from "../../fixtures/three-level-org-data.json";

const {
  teams,
  people,
  authority_lines: authorityLines,
  authority_line_types: authorityLineTypes,
} = orgData as unknown as OrgData;

describe("authorityOverToFlow", () => {
  it("builds the team node, a person node for each authority-holder, and a person node for the team's head and each of its managers up the chain", () => {
    const { nodes } = authorityOverToFlow("platform-squad", teams, people, authorityLines, authorityLineTypes);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["team:platform-squad", "person:carol-lee", "person:alice-nguyen", "person:vp-eng", "person:cto"].sort()
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
          { person: "outside-holder", role: "eng", title: "Engineer", is_primary_team: true, deputy: null },
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
