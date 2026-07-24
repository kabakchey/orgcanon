import { useRef } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { CopyButton } from "./copy-button";
import type { RoutePoint } from "./layout";
import { nearestSegmentInsertIndex } from "../lib/layout/layout-override";

// A callback threaded through an edge's `data`, built once per edge by graph-canvas.tsx and
// closed over that edge's id -- passing state-setters this way, rather than each edge
// reading/writing shared state directly, keeps a mid-drag point update from re-deriving the
// whole canvas on every pointer move.
export type OnEdgeRouteChange = (points: RoutePoint[], commit: boolean) => void;

// Chord-length parameter step between two points, floored well above zero so a repeated or
// near-coincident point (e.g. a reflected virtual endpoint below) can never divide-by-zero.
function chordStep(a: RoutePoint, b: RoutePoint): number {
  return Math.max(Math.hypot(b.x - a.x, b.y - a.y) ** 0.5, 1e-4);
}

// Threads a smooth curve through every point (a centripetal Catmull-Rom spline -- Barry &
// Goldman 1988, alpha=0.5 -- converted to chained cubic Bezier segments) instead of connecting
// them with straight polyline corners. The points themselves (ELK's bend points, or a user's
// dragged waypoints) stay exactly where they are; only the line between them curves.
//
// Centripetal (chord-length) parameterization specifically, not the simpler uniform
// parameterization: a uniform Catmull-Rom's tangents extrapolate from raw point deltas, which
// blow up into large loops whenever consecutive segments have very different lengths -- exactly
// what a cycle's closing edge tends to produce (one short bend segment next to a long one). The
// centripetal form scales tangents by chord length instead, which stays well-behaved for
// unevenly-spaced points. See tests/components/graph-canvas.test.tsx's cycle-routing test for the
// regression this guards.
//
// Falls back to a straight line for the degenerate 2-point case, though callers only reach this
// with 3+ points (see LabeledEdge's `routed`).
function pathFromRoute(points: RoutePoint[]): string {
  const [first, ...rest] = points;
  if (points.length < 3) {
    return `M${first!.x},${first!.y} ${rest.map((point) => `L${point.x},${point.y}`).join(" ")}`;
  }

  let path = `M${first!.x},${first!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    // No real neighbor past an end point -- reflect the adjacent point across it instead of
    // duplicating it, so the chord-length step into it is never zero.
    const p0 = points[i - 1] ?? { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y };
    const p3 = points[i + 2] ?? { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };

    const t0 = 0;
    const t1 = t0 + chordStep(p0, p1);
    const t2 = t1 + chordStep(p1, p2);
    const t3 = t2 + chordStep(p2, p3);

    const m1x = (t2 - t1) * ((p1.x - p0.x) / (t1 - t0) - (p2.x - p0.x) / (t2 - t0) + (p2.x - p1.x) / (t2 - t1));
    const m1y = (t2 - t1) * ((p1.y - p0.y) / (t1 - t0) - (p2.y - p0.y) / (t2 - t0) + (p2.y - p1.y) / (t2 - t1));
    const m2x = (t2 - t1) * ((p2.x - p1.x) / (t2 - t1) - (p3.x - p1.x) / (t3 - t1) + (p3.x - p2.x) / (t3 - t2));
    const m2y = (t2 - t1) * ((p2.y - p1.y) / (t2 - t1) - (p3.y - p1.y) / (t3 - t1) + (p3.y - p2.y) / (t3 - t2));

    const c1x = p1.x + m1x / 3;
    const c1y = p1.y + m1y / 3;
    const c2x = p2.x - m2x / 3;
    const c2y = p2.y - m2y / 3;

    path += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return path;
}

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  label,
  data,
}: EdgeProps) {
  const { screenToFlowPosition } = useReactFlow();

  const [bezierPath, bezierLabelX, bezierLabelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Only the *interior* points of a stored route are ever trusted -- its first/last are always
  // replaced with the edge's actual live handle positions below. A stored route's endpoints are
  // whatever they were at the moment it was frozen (see layout-override.ts's snapshotLayout);
  // if either connected node is later dragged elsewhere, trusting those stale endpoints would
  // leave the edge visually detached from its own node -- precisely the disconnected-connector
  // problem this component exists to avoid (see the "Audit Log" example component's dependency
  // cycle for the original reproduction, and its 3-node-cycle test in graph-canvas.test.tsx for
  // this specific regression).
  const storedRoute = (data as { route?: RoutePoint[]; onRouteChange?: OnEdgeRouteChange } | undefined)?.route;
  const onRouteChange = (data as { onRouteChange?: OnEdgeRouteChange } | undefined)?.onRouteChange;
  const bendPoints = storedRoute && storedRoute.length > 2 ? storedRoute.slice(1, -1) : [];
  const routed = bendPoints.length > 0;

  // The points a drag interacts with, and what actually gets drawn when routed: the edge's live
  // endpoints with any interior bend points in between -- so a straight edge can still have a
  // first waypoint dragged into it, and a bent one always stays attached to both its nodes.
  const points: RoutePoint[] = [{ x: sourceX, y: sourceY }, ...bendPoints, { x: targetX, y: targetY }];
  const edgePath = routed ? pathFromRoute(points) : bezierPath;
  const mid = routed ? points[Math.floor(points.length / 2)]! : undefined;
  const labelX = mid?.x ?? bezierLabelX;
  const labelY = mid?.y ?? bezierLabelY;

  const labelText = typeof label === "string" ? label : undefined;

  // Waypoint handles take their color from this edge's own stroke (set per relationship type in
  // edge-styles.ts) instead of a fixed color, so a handle never clashes with the line it belongs
  // to. Their size tracks the line's own stroke width rather than a fixed radius, so a thin edge
  // gets a proportionally small handle.
  const strokeColor = typeof style?.stroke === "string" ? style.stroke : "currentColor";
  const strokeWidthValue = typeof style?.strokeWidth === "number" ? style.strokeWidth : 2;
  const waypointSize = strokeWidthValue * 1.5;

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const draggingIndexRef = useRef<number | null>(null);

  function endDrag() {
    draggingIndexRef.current = null;
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    onRouteChange?.(pointsRef.current, true);
  }

  function handleWindowPointerMove(event: PointerEvent) {
    const index = draggingIndexRef.current;
    if (index === null) return;
    const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const next = pointsRef.current.map((point, i) => (i === index ? flowPoint : point));
    onRouteChange?.(next, false);
  }

  function handleWindowPointerUp() {
    endDrag();
  }

  function startDrag(index: number) {
    draggingIndexRef.current = index;
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  }

  // Grabbing anywhere along the visible line bends it there: insert a new waypoint at the click
  // position and immediately start dragging it, rather than requiring a separate "add point"
  // step.
  function handlePathPointerDown(event: React.PointerEvent) {
    if (!onRouteChange) return;
    event.stopPropagation();
    const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const insertAt = nearestSegmentInsertIndex(flowPoint, pointsRef.current);
    const next = [...pointsRef.current.slice(0, insertAt), flowPoint, ...pointsRef.current.slice(insertAt)];
    onRouteChange(next, false);
    startDrag(insertAt);
  }

  function handleWaypointPointerDown(index: number, event: React.PointerEvent) {
    if (!onRouteChange) return;
    event.stopPropagation();
    startDrag(index);
  }

  function handleWaypointRemove(index: number, event: React.MouseEvent) {
    if (!onRouteChange) return;
    event.preventDefault();
    event.stopPropagation();
    const next = pointsRef.current.filter((_, i) => i !== index);
    onRouteChange(next, true);
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {onRouteChange && (
        <>
          <path
            d={edgePath}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            className="edge-interaction-path"
            onPointerDown={handlePathPointerDown}
          />
          {points.slice(1, -1).map((point, i) => (
            <rect
              // +1: this slice starts at the real array's index 1 (endpoints excluded).
              key={i}
              x={point.x - waypointSize / 2}
              y={point.y - waypointSize / 2}
              width={waypointSize}
              height={waypointSize}
              fill={strokeColor}
              className="edge-waypoint-handle"
              onPointerDown={(event) => handleWaypointPointerDown(i + 1, event)}
              onDoubleClick={(event) => handleWaypointRemove(i + 1, event)}
              onContextMenu={(event) => handleWaypointRemove(i + 1, event)}
            />
          ))}
        </>
      )}
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span className="edge-label-text">{labelText}</span>
            <CopyButton getText={() => labelText} label={`Copy ${labelText}`} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { labeled: LabeledEdge };
