export interface Link {
  source: string;
  target: string;
}

// BFS from `nodeId` following edges in their forward direction (source -> target). Cycle-safe:
// the `visited` set means a cycle in the underlying graph (e.g. component-dependencies' allowed
// circular dependencies) is walked at most once per node instead of looping forever.
export function reachableFrom(nodeId: string, edges: Link[]): Set<string> {
  const bySource = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = bySource.get(edge.source) ?? [];
    targets.push(edge.target);
    bySource.set(edge.source, targets);
  }

  const visited = new Set<string>();
  const queue = [...(bySource.get(nodeId) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current) || current === nodeId) continue;
    visited.add(current);
    queue.push(...(bySource.get(current) ?? []));
  }

  return visited;
}
