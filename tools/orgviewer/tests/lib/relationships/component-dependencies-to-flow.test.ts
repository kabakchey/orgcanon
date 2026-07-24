import { describe, expect, it } from "vitest";
import { componentDependenciesToFlow, componentNode } from "../../../src/lib/relationships/component-dependencies-to-flow";
import type { Component, Team } from "../../../src/lib/orgapi/types";

function component(overrides: Partial<Component> & { team: string }): Component {
  return {
    name: "C",
    description: "",
    documentation_url: "",
    dependency_components: [],
    is_end_user_facing: false,
    type: "service",
    external_references: {},
    reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
    ...overrides,
  };
}

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

describe("componentNode", () => {
  it("carries owning team and dependency-count data", () => {
    const components: Record<string, Component> = {
      a: component({ name: "A", team: "t1", dependency_components: ["b"] }),
      b: component({ name: "B", team: "t1" }),
    };
    const teams: Record<string, Team> = { t1: team({ name: "Team One", head: "x" }) };

    const node = componentNode("a", components, teams, "RIGHT");

    expect(node.id).toBe("component:a");
    expect(node.data).toMatchObject({
      label: "A",
      ownerTeamId: "t1",
      ownerTeamName: "Team One",
      directDependencies: 1,
      transitiveDependencies: 1,
      directDependees: 0,
      transitiveDependees: 0,
    });
  });
});

describe("componentDependenciesToFlow", () => {
  function threeChainComponents(): Record<string, Component> {
    return {
      a: component({ name: "A", team: "t", dependency_components: ["b"] }),
      b: component({ name: "B", team: "t", dependency_components: ["c"] }),
      c: component({ name: "C", team: "t" }),
      standalone: component({ name: "Standalone", team: "t" }),
    };
  }
  const teams: Record<string, Team> = { t: team({ head: "x" }) };

  it("direct mode shows only the selected component and its immediate neighbors", () => {
    const { nodes, edges } = componentDependenciesToFlow("a", threeChainComponents(), teams, "direct");

    expect(nodes.map((n) => n.id).sort()).toEqual(["component:a", "component:b"].sort());
    expect(edges).toEqual([
      expect.objectContaining({ id: "dependency:a->b", source: "component:a", target: "component:b" }),
    ]);
  });

  it("transitive mode shows the full closure and every edge among visible nodes", () => {
    const { nodes, edges } = componentDependenciesToFlow("a", threeChainComponents(), teams, "transitive");

    expect(nodes.map((n) => n.id).sort()).toEqual(["component:a", "component:b", "component:c"].sort());
    expect(edges.map((e) => e.id).sort()).toEqual(["dependency:a->b", "dependency:b->c"].sort());
  });

  it("never references a node that is not in the returned node list", () => {
    const { nodes, edges } = componentDependenciesToFlow("a", threeChainComponents(), teams, "transitive");
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
