"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  Background,
  ControlButton,
  Controls,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { layoutElements, type LayoutDirection, type RoutePoint } from "./layout";
import { nodeTypes } from "./node-types";
import { edgeTypes, type OnEdgeRouteChange } from "./edge-types";
import { applyFold, foldableSourceIds } from "../lib/relationships/apply-fold";
import { useFoldState } from "../lib/fold/use-fold-state";
import { computeAutoFoldedIds } from "../lib/fold/auto-fold";
import { applyLayoutOverride, snapshotLayout } from "../lib/layout/layout-override";
import { useLayoutOverride } from "../lib/layout/use-layout-override";
import { graphToMermaid } from "../lib/export/graph-to-mermaid";
import { downloadTextFile } from "../lib/export/download-text-file";

export interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  direction?: LayoutDirection;
  // When given, GraphCanvas owns fold/collapse for this graph, persisted under this key -- fold
  // is a canvas-rendering concern, so it lives here rather than in each view.
  // The same key also scopes any manual node/edge rearrangement -- both are "how this one graph
  // instance currently looks," so they share one storage namespace per instance rather than each
  // view threading two separate keys through.
  foldStorageKey?: string;
  // Node ids that should start folded the first time foldStorageKey is seen (no stored state
  // yet) -- e.g. a person with subordinates in Chain of Command, so a large downward tree
  // doesn't dump onto the screen before the user asks for it.
  defaultFoldedNodeIds?: Set<string>;
  // Node id (e.g. "person:carol-lee") to highlight as the current selection, if any.
  selectedNodeId?: string;
  // Shown in place of the graph when `nodes` is empty (e.g. before a view's picker has a value).
  emptyMessage?: string;
}

// Rendered as a child of <ReactFlow> so it can reach the flow instance via useReactFlow (per
// xyflow's own pattern for imperative calls after render). `fitView` only auto-runs once on
// mount; re-running it here whenever `trigger` changes identity is what re-centers the camera
// after a view swaps in a newly-laid-out graph (a different selection, a fold toggle, a "Reset
// graph" click, ...) -- but deliberately NOT after every drag commit, so the camera doesn't jump
// out from under someone mid-rearrangement (see graph-canvas's own fitTrigger state).
function FitViewOnChange({ trigger }: { trigger: unknown }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

export function GraphCanvas({
  nodes,
  edges,
  direction = "DOWN",
  foldStorageKey,
  defaultFoldedNodeIds,
  selectedNodeId,
  emptyMessage = "Select an entity above to see its graph.",
}: GraphCanvasProps) {
  const graphKey = foldStorageKey ?? "graph";
  // Recomputed fresh from the current graph every render, same as defaultFoldedNodeIds itself --
  // useFoldState only reads this on a fold key's first-ever mount (see its own doc), so this never
  // fights with a user's own later toggles.
  const autoDefaultFoldedNodeIds = useMemo(
    () => (foldStorageKey ? computeAutoFoldedIds(nodes, edges, defaultFoldedNodeIds ?? new Set()) : undefined),
    [foldStorageKey, nodes, edges, defaultFoldedNodeIds]
  );
  // Lets useFoldState tell a stale stored fold set (leftover from a different graph that once
  // shared this same storage key) apart from a real user preference for THIS graph -- see its own
  // doc for why that distinction matters.
  const currentNodeIds = useMemo(() => (foldStorageKey ? new Set(nodes.map((n) => n.id)) : undefined), [foldStorageKey, nodes]);
  const { foldedIds, toggleFold } = useFoldState(foldStorageKey ?? "disabled", autoDefaultFoldedNodeIds, currentNodeIds);
  const { override, save, reset } = useLayoutOverride(graphKey);

  const [elkResult, setElkResult] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [layoutError, setLayoutError] = useState<unknown>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  // The nodes/edges actually handed to <ReactFlow>. Local state (not derived inline) because
  // dragging has to update them immediately, every pointer move, without waiting on ELK or a
  // localStorage round-trip -- see onNodesChange and edge-types.tsx's onRouteChange.
  const [canvasNodes, setCanvasNodes] = useState<Node[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<Edge[]>([]);
  const canvasNodesRef = useRef(canvasNodes);
  const canvasEdgesRef = useRef(canvasEdges);
  canvasNodesRef.current = canvasNodes;
  canvasEdgesRef.current = canvasEdges;
  const overrideRef = useRef(override);
  overrideRef.current = override;

  const folded = useMemo(
    () =>
      foldStorageKey
        ? applyFold(nodes, edges, foldedIds)
        : { nodes, edges, hiddenCounts: new Map<string, number>(), directHiddenCounts: new Map<string, number>() },
    [nodes, edges, foldedIds, foldStorageKey]
  );
  const foldableIds = useMemo(
    () => (foldStorageKey ? foldableSourceIds(edges) : new Set<string>()),
    [edges, foldStorageKey]
  );

  // Memoized so a node whose selection/fold state hasn't actually changed keeps the exact same
  // object reference across renders -- @xyflow/react caches each node's measured DOM dimensions
  // keyed by object identity (see its adoptUserNodes), so handing it a "new" object with identical
  // content on every render throws away that cache and leaves the node stuck in its unmeasured
  // (invisible) state forever, racing against a remeasurement that never wins.
  const renderNodes: Node[] = useMemo(
    () =>
      folded.nodes.map((node) => {
        const selected = selectedNodeId !== undefined && node.id === selectedNodeId;
        const foldProps =
          foldStorageKey && foldableIds.has(node.id)
            ? {
                foldable: true,
                folded: foldedIds.has(node.id),
                hiddenCount: folded.hiddenCounts.get(node.id) ?? 0,
                directHiddenCount: folded.directHiddenCounts.get(node.id) ?? 0,
                onToggleFold: () => toggleFold(node.id),
              }
            : undefined;
        if (!selected && !foldProps) return node;
        return {
          ...node,
          data: { ...node.data, selected, ...foldProps },
        };
      }),
    [folded, foldableIds, foldStorageKey, foldedIds, selectedNodeId, toggleFold]
  );

  // Always computed, override or not: an override only ever wins per-node/per-edge, so ELK's own
  // result is still needed as the fallback position for anything the override doesn't know about
  // yet (e.g. a component added after the graph was last arranged by hand).
  useEffect(() => {
    let cancelled = false;
    setLayoutError(null);
    layoutElements(renderNodes, folded.edges, direction).then(
      (result) => {
        if (cancelled) return;
        setElkResult(result);
        setFitTrigger((v) => v + 1);
      },
      (error) => {
        console.error("GraphCanvas: layoutElements failed", error);
        if (!cancelled) setLayoutError(error);
      }
    );
    return () => {
      cancelled = true;
    };
    // renderNodes/folded.edges are recomputed fresh every render from nodes/edges/foldedIds;
    // keying on those primitives (not the derived arrays, which are new references every
    // render) avoids re-laying-out when nothing actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, direction, foldedIds, foldStorageKey]);

  const handleEdgeRouteChangeRef = useRef<(edgeId: string, points: RoutePoint[], commit: boolean) => void>(
    () => {}
  );

  // Snapshots the current on-screen layout as the new baseline the first time this graph is
  // touched (so nothing else visually jumps), then applies the one change on top.
  const commitLayout = useCallback(
    (patch: { nodePositions?: Record<string, RoutePoint>; edgeRoutes?: Record<string, RoutePoint[]> }) => {
      const base = overrideRef.current ?? snapshotLayout(canvasNodesRef.current, canvasEdgesRef.current);
      save({
        nodePositions: { ...base.nodePositions, ...patch.nodePositions },
        edgeRoutes: { ...base.edgeRoutes, ...patch.edgeRoutes },
      });
    },
    [save]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges(changes, canvasNodesRef.current);
      canvasNodesRef.current = nextNodes;
      setCanvasNodes(nextNodes);

      const finishedIds = changes
        .filter((change) => change.type === "position" && change.dragging === false)
        .map((change) => (change as { id: string }).id);
      if (finishedIds.length === 0) return;

      const nodePositions: Record<string, RoutePoint> = {};
      for (const id of finishedIds) {
        const node = nextNodes.find((n) => n.id === id);
        if (node) nodePositions[id] = { x: node.position.x, y: node.position.y };
      }
      commitLayout({ nodePositions });
    },
    [commitLayout]
  );

  handleEdgeRouteChangeRef.current = (edgeId, points, commit) => {
    setCanvasEdges((current) =>
      current.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, route: points.length > 2 ? points : undefined } } : edge
      )
    );
    if (commit) {
      commitLayout({ edgeRoutes: { [edgeId]: points } });
    }
  };

  useEffect(() => {
    if (!elkResult) return;
    const merged = applyLayoutOverride(elkResult.nodes, elkResult.edges, override);
    const edgesWithHandlers = merged.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onRouteChange: ((points: RoutePoint[], commit: boolean) =>
          handleEdgeRouteChangeRef.current(edge.id, points, commit)) satisfies OnEdgeRouteChange,
      },
    }));
    setCanvasNodes(merged.nodes);
    setCanvasEdges(edgesWithHandlers);
  }, [elkResult, override]);

  const handleReset = useCallback(() => {
    reset();
    setFitTrigger((v) => v + 1);
  }, [reset]);

  if (layoutError) {
    return (
      <div style={{ width: "100%", flex: 1, minHeight: 0, padding: 16 }}>
        Failed to lay out graph -- see console for details.
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const displayNodes = canvasNodes.length > 0 ? canvasNodes : renderNodes;
  const displayEdges = canvasEdges.length > 0 ? canvasEdges : folded.edges;

  // Timestamped down to the minute so repeated exports of the same view/selection don't
  // overwrite each other in the browser's downloads folder.
  function handleExportMermaid() {
    const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const mermaid = graphToMermaid(displayNodes, displayEdges, { direction, getCssVar });
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:]/g, "");
    const safeKey = graphKey.replace(/[^A-Za-z0-9_-]+/g, "-");
    downloadTextFile(`${safeKey}-${timestamp}.mmd`, mermaid);
  }

  return (
    <div style={{ width: "100%", flex: 1, minHeight: 0 }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "labeled" }}
        // A graph too big for the screen otherwise has no way to move around it besides
        // click-dragging the canvas -- panOnScroll makes the mouse wheel/trackpad pan (both
        // axes) like any normal scrollable content; Ctrl/Cmd+scroll still zooms.
        panOnScroll
        // xyflow's own default (0.5) can be tighter than the scale a big org's full graph needs
        // to fit on screen at once -- fitView (FitViewOnChange above) and manual zoom-out both
        // silently stop short of showing the whole thing once they hit it.
        minZoom={0.05}
      >
        <FitViewOnChange trigger={fitTrigger} />
        <Background />
        <Controls>
          <ControlButton
            className="export-mermaid-button"
            onClick={handleExportMermaid}
            title="Export as Mermaid"
            aria-label="Export as Mermaid"
          >
            ⇩
          </ControlButton>
          {override && (
            <ControlButton className="reset-graph-button" onClick={handleReset} title="Reset graph" aria-label="Reset graph">
              ↺
            </ControlButton>
          )}
        </Controls>
      </ReactFlow>
    </div>
  );
}
