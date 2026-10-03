import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { componentDependenciesToFlow } from "../lib/relationships/component-dependencies-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { useBooleanParam } from "../lib/use-boolean-param";
import { TreePicker } from "../components/tree-picker";
import { useSelectParam } from "../lib/use-select-param";
import { componentTree, firstValue } from "../lib/picker/tree";
import { withNodeSelect } from "../lib/with-node-select";

export function ComponentDependenciesView() {
  const components = useEntities("components");
  const teams = useEntities("teams");
  const [searchParams] = useSearchParams();
  const selectComponent = useSelectParam("componentId");
  const [transitive, setTransitive] = useBooleanParam("transitive", false);

  const tree = useMemo(
    () => (teams.data && components.data ? componentTree(teams.data, components.data) : []),
    [teams.data, components.data]
  );
  const fallbackId = firstValue(tree);

  const requestedComponentId = searchParams.get("componentId") ?? undefined;
  // Defaults to the first component in the picker so the view never opens empty -- mirrors Org
  // Tree's root-team fallback.
  const componentId =
    requestedComponentId && components.data?.[requestedComponentId] ? requestedComponentId : fallbackId;

  const { nodes, edges } = useMemo(() => {
    if (!components.data || !teams.data) return { nodes: [], edges: [] };
    const { nodes: builtNodes, edges: builtEdges } =
      componentId && components.data[componentId]
        ? componentDependenciesToFlow(componentId, components.data, teams.data, transitive ? "transitive" : "direct")
        : { nodes: [], edges: [] };
    return { nodes: withNodeSelect(builtNodes, "component:", selectComponent), edges: builtEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components.data, teams.data, componentId, transitive]);

  if (components.error || teams.error) {
    return <div>Failed to load org data.</div>;
  }
  if (!components.data || !teams.data) {
    return <div>Loading…</div>;
  }

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <TreePicker label="Component" paramName="componentId" tree={tree} fallbackId={fallbackId} />
        <label className="graph-toolbar-toggle">
          <input type="checkbox" checked={transitive} onChange={(event) => setTransitive(event.target.checked)} />
          Show transitive dependencies
        </label>
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        direction="RIGHT"
        foldStorageKey={`component-dependencies:${componentId ?? "none"}:${transitive ? "transitive" : "direct"}`}
        selectedNodeId={componentId ? `component:${componentId}` : undefined}
        emptyMessage="Select a component above to see its dependencies."
      />
    </div>
  );
}
