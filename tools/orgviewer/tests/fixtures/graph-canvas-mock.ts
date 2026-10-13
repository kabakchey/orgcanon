import type { Edge, Node } from "@xyflow/react";

interface GraphCanvasCall {
  nodes: Node[];
  edges: Edge[];
  graphKey: string;
  selectedNodeId?: string;
  defaultFoldedNodeIds?: Set<string>;
}

// Stands in for src/components/graph-canvas in view tests, recording the props of every render:
//   vi.mock("../../src/components/graph-canvas", () => import("../fixtures/graph-canvas-mock"));
export const graphCanvasCalls: GraphCanvasCall[] = [];

export function GraphCanvas(props: GraphCanvasCall): null {
  graphCanvasCalls.push(props);
  return null;
}
