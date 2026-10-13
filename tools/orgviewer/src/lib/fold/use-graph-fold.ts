import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import { applyFold, foldableSourceIds } from "./apply-fold";
import { computeAutoFoldedIds } from "./auto-fold";
import { useFoldState } from "./use-fold-state";

// Fold state for one graph, persisted under graphKey, and the part of the graph it leaves visible.
export function useGraphFold(
  graphKey: string,
  nodes: Node[],
  edges: Edge[],
  defaultFoldedNodeIds: Set<string> | undefined
) {
  const autoFoldedIds = useMemo(
    () => computeAutoFoldedIds(nodes, edges, defaultFoldedNodeIds ?? new Set()),
    [nodes, edges, defaultFoldedNodeIds]
  );
  const nodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const { foldedIds, toggleFold, setFolded } = useFoldState(graphKey, autoFoldedIds, nodeIds);

  const visible = useMemo(() => applyFold(nodes, edges, foldedIds), [nodes, edges, foldedIds]);
  const foldableIds = useMemo(() => foldableSourceIds(edges), [edges]);

  return { visible, foldedIds, foldableIds, toggleFold, setFolded };
}
