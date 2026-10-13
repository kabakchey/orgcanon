import { useMemo, type ReactNode } from "react";
import type { Edge, Node } from "@xyflow/react";
import { GraphCanvas } from "../components/graph-canvas";
import { TreePicker } from "../components/tree-picker";
import type { LayoutDirection } from "../lib/layout/elk-layout";
import type { OrgData } from "../lib/orgapi/types";
import { useOrgData } from "../lib/orgapi/use-entities";
import { firstValue, type TreeItem } from "../lib/picker/tree";
import { usePickedParam } from "../lib/use-picked-param";
import { withNodeSelect } from "../lib/with-node-select";

const PICKABLE = {
  teams: { label: "Team", paramName: "teamId", nodeType: "team" },
  people: { label: "Person", paramName: "personId", nodeType: "person" },
  components: { label: "Component", paramName: "componentId", nodeType: "component" },
} as const;

interface PickerGraphViewProps<K extends keyof OrgData> {
  // Names this view's stored fold state and manual layout.
  slug: string;
  load: readonly K[];
  picked: K & keyof typeof PICKABLE;
  tree: (data: Pick<OrgData, K>) => TreeItem[];
  graph: (pickedId: string, data: Pick<OrgData, K>) => { nodes: Node[]; edges: Edge[] };
  // A view-level setting `graph` depends on (e.g. "transitive"); each value is a separate graph.
  variant?: string;
  toolbar?: ReactNode;
  direction?: LayoutDirection;
  defaultFoldedNodeIds?: (edges: Edge[]) => Set<string>;
  emptyMessage: string;
}

// One entity picked from a tree, and the graph built around it. The pick defaults to the tree's
// first entry, so the view never opens empty.
export function PickerGraphView<K extends keyof OrgData>(props: PickerGraphViewProps<K>) {
  const { data, error } = useOrgData(props.load);

  if (error) return <div>Failed to load org data.</div>;
  if (!data) return <div>Loading…</div>;
  return <LoadedPickerGraphView {...props} data={data} />;
}

function LoadedPickerGraphView<K extends keyof OrgData>({
  slug,
  picked,
  tree: buildTree,
  graph: buildGraph,
  variant,
  toolbar,
  direction,
  defaultFoldedNodeIds,
  emptyMessage,
  data,
}: PickerGraphViewProps<K> & { data: Pick<OrgData, K> }) {
  const { label, paramName, nodeType } = PICKABLE[picked];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tree = useMemo(() => buildTree(data), [data]);
  const [pickedId, pick] = usePickedParam(paramName, (id) => id in data[picked], firstValue(tree));

  const { nodes, edges, foldedByDefault } = useMemo(() => {
    const built = pickedId ? buildGraph(pickedId, data) : { nodes: [], edges: [] };
    return {
      nodes: withNodeSelect(built.nodes, `${nodeType}:`, pick),
      edges: built.edges,
      foldedByDefault: defaultFoldedNodeIds?.(built.edges),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pickedId, variant]);

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <TreePicker label={label} tree={tree} value={pickedId} onChange={pick} />
        {toolbar}
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        direction={direction}
        graphKey={[slug, pickedId ?? "none", ...(variant ? [variant] : [])].join(":")}
        defaultFoldedNodeIds={foldedByDefault}
        selectedNodeId={pickedId ? `${nodeType}:${pickedId}` : undefined}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
