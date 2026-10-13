import type { Edge, Node } from "@xyflow/react";
import type { RoutePoint } from "./elk-layout";
import { readStoredJson, writeStored, writeStoredJson } from "../storage";

// A user's manual rearrangement of one graph instance (same storage-key scoping as fold state --
// see use-fold-state.ts): every node's position, plus a route for any edge that's either been
// hand-bent or was auto-routed with actual bend points at the moment the graph was first touched
// (a straight edge never needs an entry -- it always just follows its two nodes live).
export interface StoredLayout {
  nodePositions: Record<string, RoutePoint>;
  edgeRoutes: Record<string, RoutePoint[]>;
}

function storageKeyFor(key: string): string {
  return `orgviewer-layout:${key}`;
}

function isRoutePoint(value: unknown): value is RoutePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RoutePoint).x === "number" &&
    typeof (value as RoutePoint).y === "number"
  );
}

// A route with 2 or fewer points carries no bend worth freezing (see applyLayoutOverride's doc
// on why an unbent edge should always stay live) -- dropped on both the read and write path so
// an in-memory override built by the hook and one round-tripped through storage always agree.
function sanitize(layout: Partial<StoredLayout>): StoredLayout {
  const cleanPositions: Record<string, RoutePoint> = {};
  for (const [id, point] of Object.entries(layout.nodePositions ?? {})) {
    if (isRoutePoint(point)) cleanPositions[id] = point;
  }
  const cleanRoutes: Record<string, RoutePoint[]> = {};
  for (const [id, points] of Object.entries(layout.edgeRoutes ?? {})) {
    if (Array.isArray(points) && points.every(isRoutePoint) && points.length > 2) {
      cleanRoutes[id] = points;
    }
  }
  return { nodePositions: cleanPositions, edgeRoutes: cleanRoutes };
}

export function readLayoutOverride(key: string): StoredLayout | null {
  const stored = readStoredJson(storageKeyFor(key));
  return typeof stored === "object" && stored !== null ? sanitize(stored as Partial<StoredLayout>) : null;
}

export function writeLayoutOverride(key: string, layout: StoredLayout): void {
  writeStoredJson(storageKeyFor(key), sanitize(layout));
}

export function clearLayoutOverride(key: string): void {
  writeStored(storageKeyFor(key), null);
}

// The baseline snapshotted the moment a graph is first touched by hand (see use-layout-override's
// commit doc), so nothing else visually jumps -- every node keeps its current position, and every
// edge that currently has a real bend (length > 2) keeps its exact current shape.
export function snapshotLayout(nodes: Node[], edges: Edge[]): StoredLayout {
  const nodePositions: Record<string, RoutePoint> = {};
  for (const node of nodes) {
    nodePositions[node.id] = { x: node.position.x, y: node.position.y };
  }
  const edgeRoutes: Record<string, RoutePoint[]> = {};
  for (const edge of edges) {
    const route = (edge.data as { route?: RoutePoint[] } | undefined)?.route;
    if (route && route.length > 2) edgeRoutes[edge.id] = route;
  }
  return { nodePositions, edgeRoutes };
}

// Applies a stored override on top of ELK's own layout: an overridden node keeps its stored
// position (ELK's own suggestion is only ever used as a fallback for a node the override doesn't
// know about yet, e.g. a component added to the data after the graph was arranged). An edge with
// its own stored route uses that; otherwise it keeps ELK's route only if *neither* of its
// endpoints is overridden -- a route computed by ELK assumes ELK's own node positions, so once
// either end has moved away from that, ELK's bend points would no longer line up with the node's
// actual (overridden) location, leaving the edge visually detached. Dropping the route there
// falls back to a plain live bezier, which xyflow recomputes every render from the two nodes'
// actual current handle positions -- so it always tracks correctly however those nodes end up.
export function applyLayoutOverride(
  nodes: Node[],
  edges: Edge[],
  override: StoredLayout | null
): { nodes: Node[]; edges: Edge[] } {
  if (!override) return { nodes, edges };

  const overriddenIds = new Set(Object.keys(override.nodePositions));
  const nextNodes = nodes.map((node) => {
    const position = override.nodePositions[node.id];
    return position ? { ...node, position } : node;
  });

  const nextEdges = edges.map((edge) => {
    const customRoute = override.edgeRoutes[edge.id];
    if (customRoute) {
      return { ...edge, data: { ...edge.data, route: customRoute } };
    }
    const bothUnmoved = !overriddenIds.has(edge.source) && !overriddenIds.has(edge.target);
    if (bothUnmoved) return edge;
    return { ...edge, data: { ...edge.data, route: undefined } };
  });

  return { nodes: nextNodes, edges: nextEdges };
}

function distanceToSegment(point: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  const closest = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

// Where a click on an edge's line should insert a new waypoint: the index right after the
// closer endpoint of whichever segment the click landed nearest to (so clicking near the start of
// a 3-segment path inserts right after point 0, not at the very end).
export function nearestSegmentInsertIndex(click: RoutePoint, points: RoutePoint[]): number {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const distance = distanceToSegment(click, points[i]!, points[i + 1]!);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex + 1;
}
