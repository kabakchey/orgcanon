import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE } from "../../components/edge-styles";
import type { LayoutDirection } from "../../components/layout";
import { buildComponentDependencyGraph, computeDependencyCounts, relatedComponentIds } from "./component-dependencies";
import type { Component, Team } from "../orgapi/types";

// Shared by Component Dependencies and Team Components -- both render component cards and both
// need the owning team plus the four dependency counts on every card, not just the selected
// component's (see docs/orgcanon's Team Components discussion for why this landed on the node type
// itself rather than being view-specific).
export function componentNode(
  componentId: string,
  components: Record<string, Component>,
  teams: Record<string, Team>,
  direction: LayoutDirection
): Node {
  const component = components[componentId];
  const counts = computeDependencyCounts(componentId, components);
  return {
    id: `component:${componentId}`,
    type: "component",
    data: {
      label: component?.name ?? componentId,
      type: component?.type ?? "",
      isEndUserFacing: component?.is_end_user_facing ?? false,
      documentationUrl: component?.documentation_url,
      ownerTeamId: component?.team,
      ownerTeamName: component ? (teams[component.team]?.name ?? component.team) : undefined,
      directDependencies: counts.direct,
      transitiveDependencies: counts.transitive,
      directDependees: counts.directDependees,
      transitiveDependees: counts.transitiveDependees,
      direction,
    },
    position: { x: 0, y: 0 },
  };
}

// A component plus its dependency neighborhood -- direct neighbors only, or the full closure in
// both directions -- and nothing else: no unrelated components. Edges are every dependency edge
// among the visible nodes (not just a BFS tree), so a cycle or a shared dependency between two
// visible neighbors still shows up (cycles are legitimate data, not an error).
export function componentDependenciesToFlow(
  componentId: string,
  components: Record<string, Component>,
  teams: Record<string, Team>,
  mode: "direct" | "transitive"
): { nodes: Node[]; edges: Edge[] } {
  const nodeIds = [componentId, ...relatedComponentIds(componentId, components, mode)];
  const nodeIdSet = new Set(nodeIds);

  const { edges: pairs } = buildComponentDependencyGraph(components);
  const edges: Edge[] = pairs
    .filter((pair) => nodeIdSet.has(pair.from) && nodeIdSet.has(pair.to))
    .map((pair) => ({
      id: `dependency:${pair.from}->${pair.to}`,
      source: `component:${pair.from}`,
      target: `component:${pair.to}`,
      style: EDGE_STYLE.dependency,
    }));

  const nodes = nodeIds.map((id) => componentNode(id, components, teams, "RIGHT"));

  return { nodes, edges };
}
