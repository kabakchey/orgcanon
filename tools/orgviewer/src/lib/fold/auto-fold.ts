import type { Edge, Node } from "@xyflow/react";
import { applyFold, foldableSourceIds, isFoldableEdgeId } from "../relationships/apply-fold";

// How many nodes a view should show on a first-ever visit before auto-folding kicks in. Tune this
// single constant to change the default density across every foldable view.
export const DEFAULT_VISIBLE_NODE_LIMIT = 15;

// BFS depth (over foldable edges only) from whichever nodes have no foldable parent. Ties within a
// depth, and nodes unreachable from any root (an isolated cycle with no external entry point), sort
// last by depth (Infinity) -- they're "leaf-like" from the outside, so folding one first is exactly
// as safe as folding an actual leaf.
function foldableDepths(nodes: Node[], edges: Edge[]): Map<string, number> {
  const foldableEdges = edges.filter((edge) => isFoldableEdgeId(edge.id));
  const childrenBySource = new Map<string, string[]>();
  const hasFoldableParent = new Set<string>();
  for (const edge of foldableEdges) {
    const children = childrenBySource.get(edge.source) ?? [];
    children.push(edge.target);
    childrenBySource.set(edge.source, children);
    hasFoldableParent.add(edge.target);
  }

  const depths = new Map<string, number>();
  const queue: string[] = [];
  for (const node of nodes) {
    if (!hasFoldableParent.has(node.id)) {
      depths.set(node.id, 0);
      queue.push(node.id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const depth = depths.get(current)!;
    for (const child of childrenBySource.get(current) ?? []) {
      if (depths.has(child)) continue;
      depths.set(child, depth + 1);
      queue.push(child);
    }
  }

  for (const node of nodes) {
    if (!depths.has(node.id)) depths.set(node.id, Infinity);
  }
  return depths;
}

// Starting from a view's own default-folded set (if any), folds foldable nodes deepest-first --
// smallest subtrees closest to the leaves collapse before anything nearer the root -- until at
// most `limit` nodes are visible or there is nothing left to fold. Only meant to seed a *default*:
// callers should hand the result to useFoldState's default parameter, which only applies it the
// first time a given fold key is ever seen.
export function computeAutoFoldedIds(
  nodes: Node[],
  edges: Edge[],
  baseFoldedIds: Set<string>,
  limit: number = DEFAULT_VISIBLE_NODE_LIMIT
): Set<string> {
  const folded = new Set(baseFoldedIds);
  if (applyFold(nodes, edges, folded).nodes.length <= limit) return folded;

  const depths = foldableDepths(nodes, edges);
  const candidates = [...foldableSourceIds(edges)]
    .filter((id) => !folded.has(id))
    .sort((a, b) => depths.get(b)! - depths.get(a)! || a.localeCompare(b));

  for (const candidateId of candidates) {
    const beforeVisible = applyFold(nodes, edges, folded).nodes.map((n) => n.id);
    if (!beforeVisible.includes(candidateId)) continue;

    folded.add(candidateId);
    if (applyFold(nodes, edges, folded).nodes.length <= limit) break;
  }

  return folded;
}
