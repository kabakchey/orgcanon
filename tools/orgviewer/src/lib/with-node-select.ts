import type { Node } from "@xyflow/react";

// Only cards of the type a view selects by (`prefix`, e.g. "person:") get the select control: on
// a card of any other type it would have nothing sensible to do.
export function withNodeSelect(nodes: Node[], prefix: string, onSelect: (id: string) => void): Node[] {
  return nodes.map((node) => {
    if (!node.id.startsWith(prefix)) return node;
    const id = node.id.slice(prefix.length);
    return { ...node, data: { ...node.data, onSelect: () => onSelect(id) } };
  });
}
