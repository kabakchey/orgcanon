import { reachableFrom, type Link } from "./graph-reachability";
import type { Component } from "../orgapi/types";

// One link per dependency, pointing from a component to what it depends on.
export function dependencyLinks(components: Record<string, Component>): Link[] {
  return Object.entries(components).flatMap(([id, component]) =>
    component.dependency_components.map((dependencyId) => ({ source: id, target: dependencyId }))
  );
}

function reversed(links: Link[]): Link[] {
  return links.map((link) => ({ source: link.target, target: link.source }));
}

interface DependencyCounts {
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
  const forward = dependencyLinks(components);

  return {
    direct: components[componentId]?.dependency_components.length ?? 0,
    transitive: reachableFrom(componentId, forward).size,
    directDependees: forward.filter((link) => link.target === componentId).length,
    transitiveDependees: reachableFrom(componentId, reversed(forward)).size,
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

  const forward = dependencyLinks(components);
  return new Set([...reachableFrom(componentId, forward), ...reachableFrom(componentId, reversed(forward))]);
}
