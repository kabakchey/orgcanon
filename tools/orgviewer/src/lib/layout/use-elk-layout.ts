import { useEffect, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { layoutElements, type LayoutDirection } from "./elk-layout";

interface ElkLayout {
  // null until the first layout resolves.
  result: { nodes: Node[]; edges: Edge[] } | null;
  error: unknown;
  // Counts resolved layouts; 0 means none yet.
  generation: number;
}

// Lays the graph out again whenever `relayoutOn` changes -- not whenever `nodes`/`edges` do, since
// callers derive those afresh on every render.
export function useElkLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection,
  relayoutOn: unknown[]
): ElkLayout {
  const [layout, setLayout] = useState<ElkLayout>({ result: null, error: null, generation: 0 });

  useEffect(() => {
    let cancelled = false;
    setLayout((current) => ({ ...current, error: null }));
    layoutElements(nodes, edges, direction).then(
      (result) => {
        if (!cancelled) setLayout((current) => ({ result, error: null, generation: current.generation + 1 }));
      },
      (error: unknown) => {
        console.error("GraphCanvas: layoutElements failed", error);
        if (!cancelled) setLayout((current) => ({ ...current, error }));
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, relayoutOn);

  return layout;
}
