import type { Edge, Node } from "@xyflow/react";
import { reachableFrom } from "./graph-reachability";

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

export interface FoldResult {
  nodes: Node[];
  edges: Edge[];
  // Total items hidden by folding this node -- everything reachable from it, transitively (see
  // the loop below).
  hiddenCounts: Map<string, number>;
  // Items hidden one hop directly out of this node, a subset of hiddenCounts -- lets the fold
  // toggle show "3 direct / 12 total" instead of just the transitive total.
  directHiddenCounts: Map<string, number>;
}

export function applyFold(nodes: Node[], edges: Edge[], foldedNodeIds: Set<string>): FoldResult {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const validFolded = new Set([...foldedNodeIds].filter((id) => nodeIds.has(id)));

  // Two separate incoming-edge maps, not one combined one -- mixing them into a single list
  // creates false cycles. An overlay edge often points the opposite way from the structural graph
  // (e.g. "authority:" runs person -> team, while that same team reaches the person via a
  // "membership:" edge the other direction), so a node with a foldable parent AND an overlay
  // edge could end up "kept open" by the overlay edge, which is itself only open because *this*
  // node is still visible -- two nodes propping each other up, so the fold never actually closes.
  // Keeping the maps separate and preferring the foldable one (below) avoids that entirely.
  const incomingFoldableBySource = new Map<string, Edge[]>();
  const incomingOverlayBySource = new Map<string, Edge[]>();
  for (const edge of edges) {
    const map = isFoldableEdgeId(edge.id) ? incomingFoldableBySource : incomingOverlayBySource;
    const list = map.get(edge.target) ?? [];
    list.push(edge);
    map.set(edge.target, list);
  }

  // A folded node's own visibility check has to ignore incoming edges from its OWN descendants --
  // otherwise a node whose only incoming edge loops back through a subtree it just collapsed (an
  // isolated dependency cycle, see the test below) would see its one path close because of its own
  // now-hidden subtree, and erase itself. Precomputed once per folded node, independent of the
  // relaxation below (it's a structural property, not something that changes as nodes get hidden).
  const descendantsOfFolded = new Map<string, Set<string>>();
  for (const id of validFolded) {
    descendantsOfFolded.set(id, reachableFrom(id, edges));
  }

  // Fixed-point relaxation: a node is visible unless every incoming foldable edge's source is
  // itself hidden or a folded node. This correctly handles a node reachable from more than one
  // root -- e.g. a person who is a primary member of one team and also appears via another
  // still-visible path, or a component two other components both depend on -- which a naive "hide
  // everything reachable from a folded node" pass would otherwise remove even though another,
  // still-visible path reaches it too.
  //
  // A node with NO incoming foldable edge at all (e.g. a component reachable only via a
  // non-foldable "ownership:" edge) falls back to its incoming overlay edges instead, using a
  // looser test -- open as long as the source is actually visible, regardless of whether the
  // source is itself folded. That asymmetry is deliberate: folding a team directly should not by
  // itself hide the components it owns (an overlay edge was never something a fold toggle
  // collapsed), but once that team is later hidden outright by an ancestor's fold, the component
  // has nothing left to hang off and disappears too -- instead of staying rendered with its one
  // connecting edge filtered out from under it.
  //
  // A node with no incoming edges of either kind, once its own descendants are excluded (a true
  // root, or an isolated cyclic cluster with no external entry point), is never hidden -- but a
  // folded node with a real external ancestor is evaluated exactly like any other node, so folding
  // that ancestor still correctly hides it: a folded node is exempt only from its own subtree
  // closing it off, not from an ancestor's.
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
    const descendants = reachableFrom(foldedId, edges);
    let hiddenCount = 0;
    for (const id of descendants) {
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
