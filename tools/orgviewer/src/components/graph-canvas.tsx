import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  Background,
  ControlButton,
  Controls,
  Panel,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { LayoutDirection, RoutePoint } from "../lib/layout/elk-layout";
import { useElkLayout } from "../lib/layout/use-elk-layout";
import { LayoutDirectionContext, nodeTypes } from "./node-types";
import { GraphLegend } from "./graph-legend";
import { edgeTypes, type OnEdgeRouteChange } from "./edge-types";
import { useGraphFold } from "../lib/fold/use-graph-fold";
import { applyLayoutOverride, snapshotLayout } from "../lib/layout/layout-override";
import { useLayoutOverride } from "../lib/layout/use-layout-override";
import { anchoredViewport } from "../lib/layout/anchor-viewport";
import { useCameraParam } from "../lib/use-camera-param";
import { graphToMermaid } from "../lib/export/graph-to-mermaid";
import { downloadTextFile } from "../lib/export/download-text-file";

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  direction?: LayoutDirection;
  // Names this graph instance: its fold state and manual node/edge arrangement persist under it.
  graphKey: string;
  // Node ids that should start folded the first time graphKey is seen (no stored state
  // yet) -- e.g. a person with subordinates in Chain of Command, so a large downward tree
  // doesn't dump onto the screen before the user asks for it.
  defaultFoldedNodeIds?: Set<string>;
  // Node id (e.g. "person:carol-lee") to highlight as the current selection, if any.
  selectedNodeId?: string;
  // Shown in place of the graph when `nodes` is empty (e.g. before a view's picker has a value).
  emptyMessage?: string;
}

// Rendered as a child of <ReactFlow> so it can reach the flow instance via useReactFlow (per
// xyflow's own pattern for imperative calls after render). Only the first real layout places the
// camera -- from the URL when it has one, else by fitting; every later relayout keeps the user's
// zoom and pins an anchor node instead (see GraphCanvas's pendingViewport).
function PlaceCameraOnFirstLayout({
  trigger,
  camera,
  onFitted,
}: {
  trigger: number;
  camera: Viewport | null;
  onFitted: (camera: Viewport) => void;
}) {
  const { fitView, setViewport, getViewport } = useReactFlow();
  const placed = useRef(false);
  useEffect(() => {
    if (placed.current) return;
    // Trigger 0 is the mount before ELK's first result, so the graph isn't laid out yet.
    const laidOut = trigger !== 0;
    placed.current = laidOut;
    if (camera) {
      void setViewport(camera);
      return;
    }
    void Promise.resolve(fitView()).then(() => {
      if (laidOut) onFitted(getViewport());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

export function GraphCanvas({
  nodes,
  edges,
  direction = "DOWN",
  graphKey,
  defaultFoldedNodeIds,
  selectedNodeId,
  emptyMessage = "Select an entity above to see its graph.",
}: GraphCanvasProps) {
  const { visible: folded, foldedIds, foldableIds, toggleFold, setFolded } = useGraphFold(
    graphKey,
    nodes,
    edges,
    defaultFoldedNodeIds
  );
  const { override, save, reset } = useLayoutOverride(graphKey);

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
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const flowRef = useRef<ReactFlowInstance | null>(null);
  // The node whose fold button was just clicked; it outranks the selection as the anchor.
  const touchedNodeIdRef = useRef<string | undefined>(undefined);
  const pendingViewportRef = useRef<Viewport | null>(null);
  const [camera, setCamera] = useCameraParam();

  // Memoized so a node whose selection/fold state hasn't actually changed keeps the exact same
  // object reference across renders -- @xyflow/react caches each node's measured DOM dimensions
  // keyed by object identity (see its adoptUserNodes), so handing it a "new" object with identical
  // content on every render throws away that cache and leaves the node stuck in its unmeasured
  // (invisible) state forever, racing against a remeasurement that never wins.
  const renderNodes: Node[] = useMemo(
    () =>
      folded.nodes.map((node) => {
        const selected = selectedNodeId !== undefined && node.id === selectedNodeId;
        const foldProps = foldableIds.has(node.id)
          ? {
              foldable: true,
              folded: foldedIds.has(node.id),
              hiddenCount: folded.hiddenCounts.get(node.id) ?? 0,
              directHiddenCount: folded.directHiddenCounts.get(node.id) ?? 0,
              onToggleFold: () => {
                touchedNodeIdRef.current = node.id;
                toggleFold(node.id);
              },
            }
          : undefined;
        if (!selected && !foldProps) return node;
        return {
          ...node,
          data: { ...node.data, selected, ...foldProps },
        };
      }),
    [folded, foldableIds, foldedIds, selectedNodeId, toggleFold]
  );

  // Always computed, override or not: an override only ever wins per-node/per-edge, so ELK's own
  // result is still needed as the fallback position for anything the override doesn't know about
  // yet (e.g. a component added after the graph was last arranged by hand).
  const {
    result: elkResult,
    error: layoutError,
    generation: layoutGeneration,
  } = useElkLayout(renderNodes, folded.edges, direction, [nodes, edges, direction, foldedIds]);

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
    const flow = flowRef.current;
    if (flow) {
      pendingViewportRef.current = anchoredViewport(flow.getViewport(), canvasNodesRef.current, merged.nodes, [
        touchedNodeIdRef.current,
        selectedNodeIdRef.current,
      ]);
    }
    touchedNodeIdRef.current = undefined;
    setCanvasNodes(merged.nodes);
    setCanvasEdges(edgesWithHandlers);
  }, [elkResult, override]);

  // A layout effect, so the camera moves in the same frame the nodes do and the anchor never jumps.
  useLayoutEffect(() => {
    const pending = pendingViewportRef.current;
    pendingViewportRef.current = null;
    if (!pending) return;
    void flowRef.current?.setViewport(pending);
    setCamera(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasNodes]);

  const handleReset = useCallback(() => reset(), [reset]);

  if (layoutError) {
    return (
      <div className="graph-canvas graph-canvas-message">Failed to lay out graph -- see console for details.</div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="graph-canvas graph-canvas-message graph-canvas-empty">{emptyMessage}</div>
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
    <LayoutDirectionContext.Provider value={direction}>
    <div className="graph-canvas">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onMoveEnd={(_event, viewport) => setCamera(viewport)}
        onInit={(instance) => {
          flowRef.current = instance;
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "labeled" }}
        // A graph too big for the screen otherwise has no way to move around it besides
        // click-dragging the canvas -- panOnScroll makes the mouse wheel/trackpad pan (both
        // axes) like any normal scrollable content; Ctrl/Cmd+scroll still zooms.
        panOnScroll
        // xyflow's own default (0.5) can be tighter than the scale a big org's full graph needs
        // to fit on screen at once -- fitView (PlaceCameraOnFirstLayout above) and manual zoom-out both
        // silently stop short of showing the whole thing once they hit it.
        minZoom={0.05}
      >
        <PlaceCameraOnFirstLayout trigger={layoutGeneration} camera={camera} onFitted={setCamera} />
        <Background />
        <Panel position="bottom-right" className="graph-legend-panel">
          <GraphLegend edges={displayEdges} />
        </Panel>
        <Controls>
          <ControlButton
            className="export-mermaid-button"
            onClick={handleExportMermaid}
            title="Export as Mermaid"
            aria-label="Export as Mermaid"
          >
            ⇩
          </ControlButton>
          {foldableIds.size > 0 && (
            <>
              <ControlButton className="fold-all-button" onClick={() => setFolded(foldableIds)} title="Fold all" aria-label="Fold all">
                ⊟
              </ControlButton>
              <ControlButton className="unfold-all-button" onClick={() => setFolded(new Set())} title="Unfold all" aria-label="Unfold all">
                ⊞
              </ControlButton>
            </>
          )}
          {override && (
            <ControlButton className="reset-graph-button" onClick={handleReset} title="Reset graph" aria-label="Reset graph">
              ↺
            </ControlButton>
          )}
        </Controls>
      </ReactFlow>
    </div>
    </LayoutDirectionContext.Provider>
  );
}
