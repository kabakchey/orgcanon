import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { componentDependenciesToFlow } from "../lib/relationships/component-dependencies-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { EntityPicker, useSelectParam } from "../components/entity-picker";
import { withNodeSelect } from "../lib/with-node-select";

export function ComponentDependenciesView() {
  const components = useEntities("components");
  const teams = useEntities("teams");
  const [searchParams] = useSearchParams();
  const selectComponent = useSelectParam("componentId");
  const [transitive, setTransitive] = useState(false);

  const options = components.data
    ? Object.entries(components.data)
        .map(([id, component]) => ({ id, label: component.name }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  const requestedComponentId = searchParams.get("componentId") ?? undefined;
  // Defaults to the first component in the picker so the view never opens empty -- mirrors Org
  // Tree's root-team fallback.
  const componentId =
    requestedComponentId && components.data?.[requestedComponentId] ? requestedComponentId : options[0]?.id;

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
        <EntityPicker paramName="componentId" options={options} fallbackId={options[0]?.id} />
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
