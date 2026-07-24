import type { Edge } from "@xyflow/react";
import { reachableFrom } from "./graph-reachability";
import type { Component } from "../orgapi/types";

export interface ComponentGraphEdge {
  from: string;
  to: string;
}

export function buildComponentDependencyGraph(components: Record<string, Component>): {
  nodeIds: string[];
  edges: ComponentGraphEdge[];
} {
  const nodeIds = Object.keys(components);
  const edges: ComponentGraphEdge[] = [];
  for (const [id, component] of Object.entries(components)) {
    for (const dependencyId of component.dependency_components) {
      edges.push({ from: id, to: dependencyId });
    }
  }
  return { nodeIds, edges };
}

function toFlowEdges(pairs: ComponentGraphEdge[]): Edge[] {
  return pairs.map(({ from, to }) => ({ id: `${from}->${to}`, source: from, target: to }));
}

function reversed(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({ id: edge.id, source: edge.target, target: edge.source }));
}

export interface DependencyCounts {
  direct: number;
  transitive: number;
  directDependees: number;
  transitiveDependees: number;
}

// Direct counts read Component.dependency_components (and its inverse) directly; transitive
// counts walk the full dependency graph via reachableFrom, which is cycle-safe -- circular
// dependencies are legitimate data, not an error.
export function computeDependencyCounts(
  componentId: string,
  components: Record<string, Component>
): DependencyCounts {
  const { edges } = buildComponentDependencyGraph(components);
  const forward = toFlowEdges(edges);
  const backward = reversed(forward);

  return {
    direct: components[componentId]?.dependency_components.length ?? 0,
    transitive: reachableFrom(componentId, forward).size,
    directDependees: edges.filter((edge) => edge.to === componentId).length,
    transitiveDependees: reachableFrom(componentId, backward).size,
  };
}

// The neighborhood of one component for Component Dependencies' related-only graph: everything
// it depends on plus everything that depends on it, either just the immediate neighbors
// ("direct") or the full closure in both directions ("transitive"). Never includes componentId
// itself -- the caller adds that separately, same as chain-of-command-to-flow.ts's own root node.
export function relatedComponentIds(
  componentId: string,
  components: Record<string, Component>,
  mode: "direct" | "transitive"
): Set<string> {
  if (mode === "direct") {
    const dependencies = components[componentId]?.dependency_components ?? [];
    const dependees = Object.entries(components)
      .filter(([id, component]) => id !== componentId && component.dependency_components.includes(componentId))
      .map(([id]) => id);
    return new Set([...dependencies, ...dependees]);
  }

  const { edges } = buildComponentDependencyGraph(components);
  const forward = toFlowEdges(edges);
  const backward = reversed(forward);
  return new Set([...reachableFrom(componentId, forward), ...reachableFrom(componentId, backward)]);
}
