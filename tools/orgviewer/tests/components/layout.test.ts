import { describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, layoutElements } from "../../src/components/layout";

function overlapsAnyNode(point: { x: number; y: number }, nodes: Node[]): boolean {
  return nodes.some(
    (node) =>
      point.x >= node.position.x &&
      point.x <= node.position.x + DEFAULT_NODE_WIDTH &&
      point.y >= node.position.y &&
      point.y <= node.position.y + DEFAULT_NODE_HEIGHT
  );
}

describe("layoutElements", () => {
  it("assigns distinct positions to a 3-node chain", async () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
      { id: "c", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "a-b", source: "a", target: "b" },
      { id: "b-c", source: "b", target: "c" },
    ];

    const { nodes: laidOut } = await layoutElements(nodes, edges);

    expect(laidOut).toHaveLength(3);
    const positions = laidOut.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(3);
  });

  it("lays out a graph containing a cycle without hanging", async () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "a-b", source: "a", target: "b" },
      { id: "b-a", source: "b", target: "a" },
    ];

    const { nodes: laidOut } = await layoutElements(nodes, edges);
    expect(laidOut).toHaveLength(2);
  });

  it("attaches ELK's bend points to a cycle's closing edge, not just its start/end", async () => {
    // A 3-node cycle (mirrors examples/complex-org's Audit Log / Notification Service / Event
    // Bus): the closing edge (c -> a) needs a routed path around the other nodes -- a naive
    // bezier assumes adjacent layers and swings wildly off-canvas instead.
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
      { id: "c", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "a-b", source: "a", target: "b" },
      { id: "b-c", source: "b", target: "c" },
      { id: "c-a", source: "c", target: "a" },
    ];

    const { nodes: laidOutNodes, edges: laidOut } = await layoutElements(nodes, edges, "RIGHT");

    const forward = laidOut.find((e) => e.id === "a-b")!;
    expect((forward.data as { route?: unknown[] }).route).toHaveLength(2);

    const closing = laidOut.find((e) => e.id === "c-a")!;
    const route = (closing.data as { route?: { x: number; y: number }[] }).route!;
    expect(route.length).toBeGreaterThan(2);

    // Bend points (excluding start/end, which legitimately touch their own node) must route
    // around the other nodes rather than clip through them, unlike the naive bezier this replaces.
    for (const point of route.slice(1, -1)) {
      expect(overlapsAnyNode(point, laidOutNodes)).toBe(false);
    }
  });

  it("drops edges referencing a nonexistent node instead of letting ELK throw", async () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "a-b", source: "a", target: "b" },
      { id: "a-missing", source: "a", target: "does-not-exist" },
    ];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(layoutElements(nodes, edges)).resolves.not.toThrow();
    const { edges: laidOutEdges } = await layoutElements(nodes, edges);

    expect(laidOutEdges.map((e) => e.id)).not.toContain("a-missing");
    expect(laidOutEdges.map((e) => e.id)).toContain("a-b");
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
