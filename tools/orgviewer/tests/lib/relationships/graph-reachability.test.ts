import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import { reachableFrom } from "../../../src/lib/relationships/graph-reachability";

function edge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target };
}

describe("reachableFrom", () => {
  it("returns every node reachable via outgoing edges, transitively", () => {
    const edges = [edge("a", "b"), edge("b", "c"), edge("a", "d")];
    expect(reachableFrom("a", edges)).toEqual(new Set(["b", "c", "d"]));
  });

  it("returns an empty set for a leaf node", () => {
    const edges = [edge("a", "b")];
    expect(reachableFrom("b", edges)).toEqual(new Set());
  });

  it("does not include the start node and does not hang when the graph has a 2-cycle", () => {
    const edges = [edge("a", "b"), edge("b", "a")];
    expect(reachableFrom("a", edges)).toEqual(new Set(["b"]));
  });

  it("handles a cycle further downstream without hanging", () => {
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "b")];
    expect(reachableFrom("a", edges)).toEqual(new Set(["b", "c"]));
  });
});
