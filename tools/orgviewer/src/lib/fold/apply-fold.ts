import type { Edge, Node } from "@xyflow/react";
import { reachableFrom } from "../relationships/graph-reachability";

// Only the base structural edges of each view's graph are foldable -- hierarchy (team.parent_team),
// membership (team -> person, but only a person's PRIMARY team relationship -- see
// org-tree-to-flow.ts's "membership-secondary:" prefix for the excluded non-primary case),
// dependency (component -> component), and reports (chain-of-command-to-flow.ts's downward
// subordinate tree, manager -> report). Overlay relationship edges (chain-of-command's own
// upward "chain:" links, authority, ownership) describe a relationship *on top of* the
// structure, not the structure itself, so folding never treats them as something to collapse.
const FOLDABLE_EDGE_PREFIXES = ["hierarchy:", "membership:", "dependency:", "reports:"];

export function isFoldableEdgeId(edgeId: string): boolean {
  return FOLDABLE_EDGE_PREFIXES.some((prefix) => edgeId.startsWith(prefix));
}

export function foldableSourceIds(edges: Edge[]): Set<string> {
  return new Set(edges.filter((edge) => isFoldableEdgeId(edge.id)).map((edge) => edge.source));
}

interface FoldResult {
  nodes: Node[];
  edges: Edge[];
  // Everything hidden by folding this node, transitively.
  hiddenCounts: Map<string, number>;
  // The subset of hiddenCounts one hop out of this node.
  directHiddenCounts: Map<string, number>;
}

export function applyFold(nodes: Node[], edges: Edge[], foldedNodeIds: Set<string>): FoldResult {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const validFolded = new Set([...foldedNodeIds].filter((id) => nodeIds.has(id)));

  // Two incoming-edge maps, not one: an overlay edge often points against the structural graph
  // ("authority:" runs person -> team, while that team reaches the person through "membership:"),
  // so in one combined map two nodes could keep each other open and the fold would never close.
  const incomingFoldableBySource = new Map<string, Edge[]>();
  const incomingOverlayBySource = new Map<string, Edge[]>();
  for (const edge of edges) {
    const map = isFoldableEdgeId(edge.id) ? incomingFoldableBySource : incomingOverlayBySource;
    const list = map.get(edge.target) ?? [];
    list.push(edge);
    map.set(edge.target, list);
  }

  // A folded node's visibility check ignores incoming edges from its own descendants: otherwise
  // a node whose only incoming edge loops back through the subtree it just collapsed (an isolated
  // dependency cycle) would hide itself.
  const descendantsOfFolded = new Map<string, Set<string>>();
  for (const id of validFolded) {
    descendantsOfFolded.set(id, reachableFrom(id, edges));
  }

  // Fixed-point relaxation: a node stays visible while some incoming foldable edge comes from a
  // source that is visible and not folded. A node reachable from several roots therefore
  // survives as long as one path to it stays open.
  //
  // A node with no incoming foldable edge (e.g. a component reached only through "ownership:")
  // uses its overlay edges instead, with a looser test: the source only has to be visible, folded
  // or not. Folding a team does not hide the components it owns, but hiding that team does.
  //
  // A node with no incoming edge of either kind, own descendants excluded, is never hidden.
  const visible = new Set(nodes.map((node) => node.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      const ownDescendants = descendantsOfFolded.get(node.id);
      const notOwnDescendant = (edge: Edge) => !ownDescendants || !ownDescendants.has(edge.source);
      const foldableIncoming = incomingFoldableBySource.get(node.id)?.filter(notOwnDescendant) ?? [];
      const hasOpenPath =
        foldableIncoming.length > 0
          ? foldableIncoming.some((edge) => visible.has(edge.source) && !validFolded.has(edge.source))
          : (incomingOverlayBySource.get(node.id)?.filter(notOwnDescendant).some((edge) => visible.has(edge.source)) ??
            true);
      if (!hasOpenPath && visible.has(node.id)) {
        visible.delete(node.id);
        changed = true;
      }
    }
  }

  const hiddenCounts = new Map<string, number>();
  const directHiddenCounts = new Map<string, number>();
  for (const foldedId of validFolded) {
    let hiddenCount = 0;
    for (const id of descendantsOfFolded.get(foldedId)!) {
      if (!visible.has(id)) hiddenCount++;
    }
    hiddenCounts.set(foldedId, hiddenCount);

    const directTargets = new Set(
      edges.filter((edge) => edge.source === foldedId).map((edge) => edge.target)
    );
    let directHiddenCount = 0;
    for (const id of directTargets) {
      if (!visible.has(id)) directHiddenCount++;
    }
    directHiddenCounts.set(foldedId, directHiddenCount);
  }

  const visibleNodes = nodes.filter((node) => visible.has(node.id));
  const visibleEdges = edges.filter(
    (edge) => visible.has(edge.source) && visible.has(edge.target)
  );

  return { nodes: visibleNodes, edges: visibleEdges, hiddenCounts, directHiddenCounts };
}
