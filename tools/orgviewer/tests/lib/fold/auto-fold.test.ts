import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { applyFold } from "../../../src/lib/relationships/apply-fold";
import { computeAutoFoldedIds } from "../../../src/lib/fold/auto-fold";

function node(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} };
}

// A 2-level fan: team:root -> team:mid-0..2, each mid -> 3 leaves (team:root + 3 mids + 9 leaves = 13 nodes).
function fan(midCount: number, leavesPerMid: number): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [node("team:root")];
  const edges: Edge[] = [];
  for (let m = 0; m < midCount; m++) {
    const midId = `team:mid-${m}`;
    nodes.push(node(midId));
    edges.push({ id: `hierarchy:root->mid-${m}`, source: "team:root", target: midId });
    for (let l = 0; l < leavesPerMid; l++) {
      const leafId = `person:leaf-${m}-${l}`;
      nodes.push(node(leafId));
      edges.push({ id: `membership:mid-${m}->leaf-${l}:Member`, source: midId, target: leafId });
    }
  }
  return { nodes, edges };
}

describe("computeAutoFoldedIds", () => {
  it("returns the base set unchanged when the graph is already within the limit", () => {
    const { nodes, edges } = fan(2, 2);
    const result = computeAutoFoldedIds(nodes, edges, new Set(), 15);
    expect(result).toEqual(new Set());
  });

  it("folds nodes until at most `limit` are visible", () => {
    const { nodes, edges } = fan(4, 4);
    expect(nodes).toHaveLength(1 + 4 + 16);

    const result = computeAutoFoldedIds(nodes, edges, new Set(), 15);
    expect(applyFold(nodes, edges, result).nodes.length).toBeLessThanOrEqual(15);
  });

  it("folds the deepest (bottom) candidates before folding anything closer to the root", () => {
    // A chain: root -> mid -> leaf-parent -> 20 leaves. Root and mid must stay visible/unfolded
    // as long as folding the deepest node (leaf-parent) alone gets under the limit.
    const nodes = [node("team:root"), node("team:mid"), node("team:leaf-parent")];
    const edges: Edge[] = [
      { id: "hierarchy:root->mid", source: "team:root", target: "team:mid" },
      { id: "hierarchy:mid->leaf-parent", source: "team:mid", target: "team:leaf-parent" },
    ];
    for (let i = 0; i < 20; i++) {
      nodes.push(node(`person:leaf-${i}`));
      edges.push({ id: `membership:leaf-parent->leaf-${i}:Member`, source: "team:leaf-parent", target: `person:leaf-${i}` });
    }

    const result = computeAutoFoldedIds(nodes, edges, new Set(), 15);
    expect(result).toEqual(new Set(["team:leaf-parent"]));
  });

  it("builds on top of a view-supplied base fold instead of ignoring it", () => {
    const { nodes, edges } = fan(4, 4);
    const base = new Set(["team:mid-0"]);
    const result = computeAutoFoldedIds(nodes, edges, base, 15);

    expect(result.has("team:mid-0")).toBe(true);
    expect(applyFold(nodes, edges, result).nodes.length).toBeLessThanOrEqual(15);
  });

  it("folds the root itself when it is the only foldable candidate", () => {
    // A single flat level: root -> 30 leaves directly. The root is the only foldable candidate,
    // so it's the only node that can be folded even though that hides everything beneath it.
    const nodes = [node("team:root")];
    const edges: Edge[] = [];
    for (let i = 0; i < 30; i++) {
      nodes.push(node(`person:leaf-${i}`));
      edges.push({ id: `membership:root->leaf-${i}:Member`, source: "team:root", target: `person:leaf-${i}` });
    }

    const result = computeAutoFoldedIds(nodes, edges, new Set(), 15);
    expect(result).toEqual(new Set(["team:root"]));
  });

  it("uses the exported DEFAULT_VISIBLE_NODE_LIMIT when no limit is given", () => {
    const { nodes, edges } = fan(4, 4);
    const result = computeAutoFoldedIds(nodes, edges, new Set());
    expect(applyFold(nodes, edges, result).nodes.length).toBeLessThanOrEqual(15);
  });
});
