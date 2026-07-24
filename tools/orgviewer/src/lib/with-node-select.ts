import type { Node } from "@xyflow/react";

// Attaches a click-to-select handler (rendered by node-types.tsx as the "select" card control)
// to every node whose id starts with `prefix` -- e.g. "person:" in Chain of Command, "team:" in
// Authority Over -- so clicking any card of the view's own entity type re-selects the view on
// that entity, without making cards of an unrelated type (which the view doesn't select by)
// clickable in a way that wouldn't do anything sensible.
export function withNodeSelect(nodes: Node[], prefix: string, onSelect: (id: string) => void): Node[] {
  return nodes.map((node) => {
    if (!node.id.startsWith(prefix)) return node;
    const id = node.id.slice(prefix.length);
    return { ...node, data: { ...node.data, onSelect: () => onSelect(id) } };
  });
}
