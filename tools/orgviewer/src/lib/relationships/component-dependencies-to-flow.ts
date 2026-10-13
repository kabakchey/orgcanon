import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE } from "./edge-styles";
import { dependencyLinks, relatedComponentIds } from "./component-dependencies";
import { componentNode, flowEdge } from "./flow-elements";
import type { Component, Team } from "../orgapi/types";

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

  const edges = dependencyLinks(components)
    .filter((link) => nodeIdSet.has(link.source) && nodeIdSet.has(link.target))
    .map((link) =>
      flowEdge(
        `dependency:${link.source}->${link.target}`,
        `component:${link.source}`,
        `component:${link.target}`,
        EDGE_STYLE.dependency
      )
    );

  const nodes = nodeIds.map((id) => componentNode(id, components, teams));

  return { nodes, edges };
}
