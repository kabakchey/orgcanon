import type { Node, Viewport } from "@xyflow/react";

export function anchoredViewport(
  viewport: Viewport,
  previous: Node[],
  next: Node[],
  anchorIds: (string | undefined)[]
): Viewport | null {
  for (const id of anchorIds) {
    if (id === undefined) continue;
    const before = previous.find((node) => node.id === id);
    const after = next.find((node) => node.id === id);
    if (!before || !after) continue;
    return {
      x: viewport.x + (before.position.x - after.position.x) * viewport.zoom,
      y: viewport.y + (before.position.y - after.position.y) * viewport.zoom,
      zoom: viewport.zoom,
    };
  }
  return null;
}
