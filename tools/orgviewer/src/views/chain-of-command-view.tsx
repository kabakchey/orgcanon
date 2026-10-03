import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { chainOfCommandToFlow } from "../lib/relationships/chain-of-command-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { TreePicker } from "../components/tree-picker";
import { useSelectParam } from "../lib/use-select-param";
import { firstValue, lineManagementTree } from "../lib/picker/tree";
import { withNodeSelect } from "../lib/with-node-select";

export function ChainOfCommandView() {
  const teams = useEntities("teams");
  const people = useEntities("people");
  const [searchParams] = useSearchParams();
  const selectPerson = useSelectParam("personId");

  const tree = useMemo(
    () => (teams.data && people.data ? lineManagementTree(teams.data, people.data) : []),
    [teams.data, people.data]
  );
  const fallbackId = firstValue(tree);

  const requestedPersonId = searchParams.get("personId") ?? undefined;
  // Defaults to the first person in the picker so the view never opens empty -- mirrors Org
  // Tree's root-team fallback.
  const personId = requestedPersonId && people.data?.[requestedPersonId] ? requestedPersonId : fallbackId;

  const { nodes, edges, defaultFoldedNodeIds } = useMemo(() => {
    if (!teams.data || !people.data || !personId || !people.data[personId])
      return { nodes: [], edges: [], defaultFoldedNodeIds: new Set<string>() };
    const { nodes: builtNodes, edges: builtEdges } = chainOfCommandToFlow(personId, teams.data, people.data);
    // Subordinates (the "reports:" edges) start folded so a manager's whole downward tree doesn't
    // dump onto the screen the moment they're selected.
    const folded = new Set(builtEdges.filter((edge) => edge.id.startsWith("reports:")).map((edge) => edge.source));
    return { nodes: withNodeSelect(builtNodes, "person:", selectPerson), edges: builtEdges, defaultFoldedNodeIds: folded };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.data, people.data, personId]);

  if (teams.error || people.error) {
    return <div>Failed to load org data.</div>;
  }
  if (!teams.data || !people.data) {
    return <div>Loading…</div>;
  }

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <TreePicker label="Person" paramName="personId" tree={tree} fallbackId={fallbackId} />
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        foldStorageKey={`chain-of-command:${personId ?? "none"}`}
        defaultFoldedNodeIds={defaultFoldedNodeIds}
        selectedNodeId={personId ? `person:${personId}` : undefined}
        emptyMessage="Select a person above to see their chain of command."
      />
    </div>
  );
}
