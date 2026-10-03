import { describe, expect, it } from "vitest";
import { chainOfCommandToFlow } from "../../../src/lib/relationships/chain-of-command-to-flow";
import type { OrgData } from "../../../src/lib/orgapi/types";
import { EDGE_STYLE } from "../../../src/components/edge-styles";
import orgData from "../../fixtures/three-level-org-data.json";

const { teams, people } = orgData as unknown as OrgData;

describe("chainOfCommandToFlow", () => {
  it("builds one person node per link in the chain plus each chain head's deputies, no team nodes", () => {
    const { nodes } = chainOfCommandToFlow("carol-lee", teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:carol-lee", "person:alice-nguyen", "person:bob-diaz", "person:vp-eng", "person:cto"].sort()
    );
    expect(nodes.every((n) => n.type === "person")).toBe(true);
  });

  it("draws edges from manager to report, so the manager lays out above (ELK DOWN direction)", () => {
    const { edges } = chainOfCommandToFlow("carol-lee", teams, people);

    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:alice-nguyen", target: "person:carol-lee" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:vp-eng", target: "person:alice-nguyen" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:cto", target: "person:vp-eng" })
    );
  });

  it("pairs every role on a card with its team name, primary first, and drops the separate unit line", () => {
    const multiRoleTeams = {
      ...teams,
      "interim-squad": {
        ...teams["platform-squad"]!,
        name: "Interim Squad",
        head: "vp-eng",
        head_title: "",
        is_head_primary_team: false,
        head_deputy: null,
        is_head_deputy_primary_team: null,
        members: [],
      },
    };

    const { nodes } = chainOfCommandToFlow("carol-lee", multiRoleTeams, people);

    const vpEng = nodes.find((n) => n.id === "person:vp-eng");
    expect(vpEng?.data).toMatchObject({
      primaryTitle: `${teams["r-and-d"]!.head_title} · R&D`,
      secondaryTitles: ["Head · Interim Squad"],
    });
    expect(vpEng?.data).not.toHaveProperty("teamName");
  });

  it("puts the person's documentation_url on their card", () => {
    const { nodes } = chainOfCommandToFlow("carol-lee", teams, people);

    const carol = nodes.find((n) => n.id === "person:carol-lee");
    expect(carol?.data).toMatchObject({ documentationUrl: "https://example.com/people/carol-lee" });
  });

  it("draws no chain: edges for the root of the org (no manager), only its downward reports", () => {
    const { edges } = chainOfCommandToFlow("cto", teams, people);

    expect(edges.some((e) => e.id.startsWith("chain:"))).toBe(false);
    expect(edges.every((e) => e.id.startsWith("reports:") || e.id.startsWith("deputy:"))).toBe(true);
  });

  it("also includes the selected person's own subordinates, recursively, as person nodes", () => {
    const { nodes } = chainOfCommandToFlow("alice-nguyen", teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:alice-nguyen", "person:vp-eng", "person:cto", "person:bob-diaz", "person:carol-lee"].sort()
    );
  });

  it("draws reports: edges from manager to subordinate for the downward subtree, separate from the chain: edges", () => {
    const { edges } = chainOfCommandToFlow("alice-nguyen", teams, people);

    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "reports:alice-nguyen->bob-diaz",
        source: "person:alice-nguyen",
        target: "person:bob-diaz",
      })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "reports:alice-nguyen->carol-lee",
        source: "person:alice-nguyen",
        target: "person:carol-lee",
      })
    );
    expect(edges.some((e) => e.id.startsWith("chain:"))).toBe(true);
  });

  it("does not duplicate a subordinate that also happens to be an ancestor's other report (recursive descent, no unrelated siblings)", () => {
    const { nodes } = chainOfCommandToFlow("cto", teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:cto", "person:vp-eng", "person:alice-nguyen", "person:bob-diaz", "person:carol-lee"].sort()
    );
  });

  it("draws a Deputy edge, named after the team, from a head above the selection to their deputy", () => {
    const { edges } = chainOfCommandToFlow("carol-lee", teams, people);

    expect(edges).toContainEqual(
      expect.objectContaining({
        source: "person:alice-nguyen",
        target: "person:bob-diaz",
        label: "Deputy (Platform Squad)",
        style: EDGE_STYLE.lineManagementNonHierarchical,
      })
    );
  });

  it("keeps the reports: edge to a deputy who is also a direct report, alongside the Deputy edge", () => {
    const { edges } = chainOfCommandToFlow("alice-nguyen", teams, people);

    const between = edges.filter((e) => e.source === "person:alice-nguyen" && e.target === "person:bob-diaz");
    expect(between.map((e) => e.id.split(":")[0]).sort()).toEqual(["deputy", "reports"]);
  });

  it("draws one Deputy edge per headed team, each naming its team and interim status", () => {
    const multiHeadTeams = {
      ...teams,
      "interim-squad": {
        ...teams["platform-squad"]!,
        name: "Interim Squad",
        parent_team: "platform-squad",
        head: "alice-nguyen",
        is_head_primary_team: false,
        head_deputy: "dana-kim",
        is_head_deputy_primary_team: true,
        is_head_deputy_interim: true,
        members: [],
      },
    };

    const { nodes, edges } = chainOfCommandToFlow("carol-lee", multiHeadTeams, people);

    expect(nodes.map((n) => n.id)).toContain("person:dana-kim");
    expect(edges.filter((e) => e.id.startsWith("deputy:") && e.source === "person:alice-nguyen").map((e) => e.label).sort()).toEqual(
      ["Deputy (Interim Squad) (interim)", "Deputy (Platform Squad)"]
    );
  });

  it("styles manager->report links through a non-hierarchical team as non-hierarchical line management", () => {
    const { edges } = chainOfCommandToFlow("alice-nguyen", teams, people);
    const styleOf = (id: string) => edges.find((e) => e.id === id)?.style;

    expect(styleOf("chain:vp-eng->alice-nguyen")).toEqual(EDGE_STYLE.lineManagementNonHierarchical);
    expect(styleOf("chain:cto->vp-eng")).toEqual(EDGE_STYLE.lineManagement);
    expect(styleOf("reports:alice-nguyen->carol-lee")).toEqual(EDGE_STYLE.lineManagementNonHierarchical);
    expect(edges.find((e) => e.id.startsWith("deputy:") && e.target === "person:bob-diaz")?.style).toEqual(
      EDGE_STYLE.lineManagementNonHierarchical
    );
  });
});
