import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  applyLayoutOverride,
  clearLayoutOverride,
  nearestSegmentInsertIndex,
  readLayoutOverride,
  snapshotLayout,
  writeLayoutOverride,
  type StoredLayout,
} from "../../../src/lib/layout/layout-override";

function node(id: string, x: number, y: number): Node {
  return { id, position: { x, y }, data: {} };
}

function edge(id: string, source: string, target: string, route?: { x: number; y: number }[]): Edge {
  return { id, source, target, data: route ? { route } : {} };
}

describe("readLayoutOverride / writeLayoutOverride / clearLayoutOverride", () => {
  it("round-trips a layout through storage", () => {
    const layout: StoredLayout = {
      nodePositions: { a: { x: 1, y: 2 } },
      edgeRoutes: { "a-b": [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }] },
    };
    writeLayoutOverride("k", layout);
    expect(readLayoutOverride("k")).toEqual(layout);
  });

  it("returns null when nothing is stored yet", () => {
    expect(readLayoutOverride("never-written")).toBeNull();
  });

  it("clear removes the entry", () => {
    writeLayoutOverride("k2", { nodePositions: { a: { x: 1, y: 1 } }, edgeRoutes: {} });
    clearLayoutOverride("k2");
    expect(readLayoutOverride("k2")).toBeNull();
  });

  it("drops a route with 2 or fewer points -- an unbent edge never needs freezing", () => {
    writeLayoutOverride("k3", {
      nodePositions: {},
      edgeRoutes: { straight: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    });
    expect(readLayoutOverride("k3")).toEqual({ nodePositions: {}, edgeRoutes: {} });
  });

  it("ignores corrupted JSON instead of throwing", () => {
    localStorage.setItem("orgviewer-layout:corrupt", "not json");
    expect(readLayoutOverride("corrupt")).toBeNull();
  });
});

describe("snapshotLayout", () => {
  it("captures every node's current position", () => {
    const nodes = [node("a", 1, 2), node("b", 3, 4)];
    const snapshot = snapshotLayout(nodes, []);
    expect(snapshot.nodePositions).toEqual({ a: { x: 1, y: 2 }, b: { x: 3, y: 4 } });
  });

  it("freezes a route only for an edge with a real bend, not a plain 2-point edge", () => {
    const bent = [{ x: 0, y: 0 }, { x: 5, y: -5 }, { x: 10, y: 0 }];
    const edges = [edge("bent", "a", "b", bent), edge("straight", "a", "c", [{ x: 0, y: 0 }, { x: 10, y: 0 }])];
    const snapshot = snapshotLayout([], edges);
    expect(snapshot.edgeRoutes).toEqual({ bent });
  });
});

describe("applyLayoutOverride", () => {
  it("passes nodes/edges through unchanged when there's no override", () => {
    const nodes = [node("a", 1, 1)];
    const edges = [edge("a-b", "a", "b")];
    expect(applyLayoutOverride(nodes, edges, null)).toEqual({ nodes, edges });
  });

  it("uses the stored position for an overridden node, ELK's own position as a fallback for one it doesn't know about", () => {
    const nodes = [node("a", 1, 1), node("b", 2, 2)];
    const override: StoredLayout = { nodePositions: { a: { x: 99, y: 99 } }, edgeRoutes: {} };
    const { nodes: result } = applyLayoutOverride(nodes, [], override);
    expect(result.find((n) => n.id === "a")!.position).toEqual({ x: 99, y: 99 });
    expect(result.find((n) => n.id === "b")!.position).toEqual({ x: 2, y: 2 });
  });

  it("uses an edge's own stored route when it has one", () => {
    const customRoute = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    const override: StoredLayout = { nodePositions: {}, edgeRoutes: { "a-b": customRoute } };
    const { edges } = applyLayoutOverride([], [edge("a-b", "a", "b")], override);
    expect((edges[0]!.data as { route?: unknown }).route).toEqual(customRoute);
  });

  it("keeps ELK's own route when neither endpoint is overridden", () => {
    const elkRoute = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    const override: StoredLayout = { nodePositions: { c: { x: 5, y: 5 } }, edgeRoutes: {} };
    const { edges } = applyLayoutOverride([], [edge("a-b", "a", "b", elkRoute)], override);
    expect((edges[0]!.data as { route?: unknown }).route).toEqual(elkRoute);
  });

  it("drops ELK's route when either endpoint is overridden and the edge has no route of its own -- it would no longer line up with the moved node", () => {
    const elkRoute = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    const override: StoredLayout = { nodePositions: { a: { x: 50, y: 50 } }, edgeRoutes: {} };
    const { edges } = applyLayoutOverride([], [edge("a-b", "a", "b", elkRoute)], override);
    expect((edges[0]!.data as { route?: unknown }).route).toBeUndefined();
  });
});

describe("nearestSegmentInsertIndex", () => {
  it("inserts right after the closer endpoint of the nearest segment", () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
    expect(nearestSegmentInsertIndex({ x: 2, y: 1 }, points)).toBe(1);
    expect(nearestSegmentInsertIndex({ x: 18, y: 1 }, points)).toBe(2);
  });
});
