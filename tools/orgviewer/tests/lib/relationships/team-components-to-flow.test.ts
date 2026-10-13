import { describe, expect, it } from "vitest";
import { teamComponentsToFlow } from "../../../src/lib/relationships/team-components-to-flow";
import { EDGE_STYLE } from "../../../src/lib/relationships/edge-styles";
import type { Component, Team } from "../../../src/lib/orgapi/types";
import { component, team } from "../../fixtures/entities";

describe("teamComponentsToFlow", () => {
  function orgWithSubteam(): { teams: Record<string, Team>; components: Record<string, Component> } {
    const teams: Record<string, Team> = {
      "r-and-d": team({ name: "R&D", head: "vp-eng", head_title: "VP Eng" }),
      "platform-squad": team({
        name: "Platform Squad",
        parent_team: "r-and-d",
        head: "alice-nguyen",
        head_title: "Lead",
        head_deputy: "bob-diaz",
        head_deputy_title: "Deputy",
        members: [
          {
            person: "carol-lee",
            role: "eng",
            title: "Engineer",
            is_primary_team: true,
            deputy: null,
            is_interim: false,
            is_deputy_interim: null,
          },
        ],
      }),
    };
    const components: Record<string, Component> = {
      "r-and-d-tool": component({ name: "R&D Tool", team: "r-and-d" }),
      "billing-api": component({ name: "Billing API", team: "platform-squad" }),
    };
    return { teams, components };
  }

  it("direct mode: only the team itself and its own components, no people and no ancestor/sibling teams", () => {
    const { teams, components } = orgWithSubteam();
    const { nodes, edges } = teamComponentsToFlow("platform-squad", teams, components, "direct");

    expect(nodes.map((n) => n.id).sort()).toEqual(["team:platform-squad", "component:billing-api"].sort());
    expect(nodes.some((n) => n.id === "team:r-and-d")).toBe(false);
    expect(nodes.some((n) => n.id === "component:r-and-d-tool")).toBe(false);
    expect(nodes.some((n) => n.type === "person")).toBe(false);
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "team:platform-squad", target: "component:billing-api" })
    );
  });

  it("indirect mode: also includes descendant teams and their components, with a real hierarchy path", () => {
    const { teams, components } = orgWithSubteam();
    const { nodes, edges } = teamComponentsToFlow("r-and-d", teams, components, "indirect");

    expect(nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(["team:r-and-d", "team:platform-squad", "component:billing-api", "component:r-and-d-tool"])
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "team:r-and-d", target: "team:platform-squad" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "team:platform-squad", target: "component:billing-api" })
    );

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("direct mode on the same ancestor team excludes the subteam's own components", () => {
    const { teams, components } = orgWithSubteam();
    const { nodes } = teamComponentsToFlow("r-and-d", teams, components, "direct");

    expect(nodes.some((n) => n.id === "team:platform-squad")).toBe(false);
    expect(nodes.some((n) => n.id === "component:billing-api")).toBe(false);
    expect(nodes.some((n) => n.id === "component:r-and-d-tool")).toBe(true);
  });

  it("component cards carry owning-team and dependency-count data", () => {
    const { teams, components } = orgWithSubteam();
    const { nodes } = teamComponentsToFlow("platform-squad", teams, components, "direct");

    const billingApi = nodes.find((n) => n.id === "component:billing-api");
    expect(billingApi?.data).toMatchObject({ ownerTeamId: "platform-squad", ownerTeamName: "Platform Squad" });
  });

  it("puts the team's and component's documentation_url on their cards", () => {
    const teams: Record<string, Team> = {
      "platform-squad": team({
        name: "Platform Squad",
        head: "alice-nguyen",
        head_title: "Lead",
        documentation_url: "https://example.com/teams/platform-squad",
      }),
    };
    const components: Record<string, Component> = {
      "billing-api": component({
        name: "Billing API",
        team: "platform-squad",
        documentation_url: "https://example.com/components/billing-api",
      }),
    };
    const { nodes } = teamComponentsToFlow("platform-squad", teams, components, "direct");

    const platformSquad = nodes.find((n) => n.id === "team:platform-squad");
    expect(platformSquad?.data).toMatchObject({ documentationUrl: "https://example.com/teams/platform-squad" });

    const billingApi = nodes.find((n) => n.id === "component:billing-api");
    expect(billingApi?.data).toMatchObject({ documentationUrl: "https://example.com/components/billing-api" });
  });
});

describe("teamComponentsToFlow non-hierarchical team edges", () => {
  it("styles an indirect-mode team edge as non-hierarchical when either end is non-hierarchical", () => {
    const teams: Record<string, Team> = {
      root: team({ name: "Root", head: "a", is_hierarchical: true }),
      group: team({ name: "Working Group", head: "b", parent_team: "root", is_hierarchical: false }),
      squad: team({ name: "Squad", head: "d", parent_team: "root", is_hierarchical: true }),
    };

    const { edges } = teamComponentsToFlow("root", teams, {}, "indirect");
    const styleOf = (id: string) => edges.find((e) => e.id === id)?.style;

    expect(styleOf("hierarchy:root->group")).toEqual(EDGE_STYLE.nonHierarchical);
    expect(styleOf("hierarchy:root->squad")).toEqual(EDGE_STYLE.parentChild);
  });
});
