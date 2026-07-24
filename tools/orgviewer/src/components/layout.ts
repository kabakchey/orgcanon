import ELK, { type ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

const elk = new ELK();

export type LayoutDirection = "DOWN" | "RIGHT";

export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 88;

export interface RoutePoint {
  x: number;
  y: number;
}

// ELK's own routed path for one edge (start point, any bend points, end point), in the same
// coordinate space as the node positions this module returns. Only edges ELK had to bend --
// e.g. the back-edge of a cycle, which can't go straight from source to target the way a normal
// forward edge can -- get more than two points; see edge-types.tsx's LabeledEdge for why that
// distinction matters.
function routeFor(edge: ElkExtendedEdge): RoutePoint[] | undefined {
  const section = edge.sections?.[0];
  if (!section) return undefined;
  return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
}

export async function layoutElements(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "DOWN"
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const validEdges = edges.filter((edge) => {
    const valid = nodeIds.has(edge.source) && nodeIds.has(edge.target);
    if (!valid) {
      console.warn(
        `layoutElements: dropping edge with missing endpoint(s) -- id=${edge.id} source=${edge.source} target=${edge.target}`
      );
    }
    return valid;
  });

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      // Left unset, the layered algorithm's default routing is ORTHOGONAL, which forces every
      // bend onto axis-aligned corners -- it routinely gives even ordinary forward edges several
      // right-angle bend points apiece. POLYLINE only adds a bend point where one is actually
      // needed to dodge a node, so most edges end up with none (see edge-types.tsx's LabeledEdge
      // for how a route with 3+ points is rendered).
      "elk.edgeRouting": "POLYLINE",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      // Routes a cycle's closing edge (dependency cycles are legitimate, not an error) through its own lane
      // instead of hugging the nearest node -- without this, ELK squeezes it a few px from a
      // card's edge, which reads as the connector overlapping the card (see the "Audit Log"
      // example component's dependency cycle for a reproduction). The larger edge/node spacing
      // below gives that lane (and ordinary edge-node clearance generally) enough room to read
      // as clearly separate from any card.
      "elk.layered.feedbackEdges": "true",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.edgeNode": "30",
      "elk.spacing.edgeEdge": "15",
      "elk.layered.spacing.edgeNodeBetweenLayers": "30",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    })),
    edges: validEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(graph);
  const positionById = new Map(
    (layout.children ?? []).map((child) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }])
  );
  const routeById = new Map((layout.edges ?? []).map((edge) => [edge.id, routeFor(edge)]));

  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: positionById.get(node.id) ?? { x: 0, y: 0 },
    })),
    edges: validEdges.map((edge) => ({
      ...edge,
      data: { ...edge.data, route: routeById.get(edge.id) },
    })),
  };
}
