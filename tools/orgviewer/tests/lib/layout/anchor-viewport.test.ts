import type { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { anchoredViewport } from "../../../src/lib/layout/anchor-viewport";

function at(id: string, x: number, y: number): Node {
  return { id, position: { x, y }, data: {} };
}

const viewport = { x: 10, y: 20, zoom: 2 };

describe("anchoredViewport", () => {
  it("keeps the anchor node on the same screen spot at the same zoom", () => {
    const next = anchoredViewport(viewport, [at("a", 100, 50)], [at("a", 40, 80)], ["a"]);

    expect(next).toEqual({ x: 130, y: -40, zoom: 2 });
    // Screen position = flow position * zoom + translation, before and after.
    expect(100 * 2 + 10).toBe(40 * 2 + next!.x);
    expect(50 * 2 + 20).toBe(80 * 2 + next!.y);
  });

  it("uses the first candidate present in both layouts", () => {
    const next = anchoredViewport(
      viewport,
      [at("selected", 0, 0)],
      [at("touched", 5, 5), at("selected", 10, 0)],
      ["touched", "selected"]
    );

    expect(next).toEqual({ x: -10, y: 20, zoom: 2 });
  });

  it("returns null when no candidate is in both layouts", () => {
    expect(anchoredViewport(viewport, [at("a", 0, 0)], [at("b", 0, 0)], ["a", "b", undefined])).toBeNull();
  });
});
