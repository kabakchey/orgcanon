import { describe, expect, it } from "vitest";
import { componentDependenciesToFlow } from "../../../src/lib/relationships/component-dependencies-to-flow";
import { componentNode } from "../../../src/lib/relationships/flow-elements";
import type { Component, Team } from "../../../src/lib/orgapi/types";
import { component, team } from "../../fixtures/entities";

describe("componentNode", () => {
  it("carries owning team and dependency-count data", () => {
    const components: Record<string, Component> = {
      a: component({ name: "A", team: "t1", dependency_components: ["b"] }),
      b: component({ name: "B", team: "t1" }),
    };
    const teams: Record<string, Team> = { t1: team({ name: "Team One", head: "x" }) };

    const node = componentNode("a", components, teams);

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
