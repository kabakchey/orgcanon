import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { teamComponentsToFlow } from "../lib/relationships/team-components-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { useBooleanParam } from "../lib/use-boolean-param";
import { TreePicker } from "../components/tree-picker";
import { useSelectParam } from "../lib/use-select-param";
import { firstValue, teamTree } from "../lib/picker/tree";
import { withNodeSelect } from "../lib/with-node-select";

export function TeamComponentsView() {
  const teams = useEntities("teams");
  // Fetched unfiltered, unlike the old server-side `team=` filter: dependency counts on each
  // component card need the full dependency graph, and indirect mode needs components owned by
  // several teams at once, so a single team's slice is no longer enough.
  const components = useEntities("components");
  const [searchParams] = useSearchParams();
  const selectTeam = useSelectParam("teamId");
  const [indirect, setIndirect] = useBooleanParam("indirect", false);

  const tree = useMemo(() => (teams.data ? teamTree(teams.data) : []), [teams.data]);
  const fallbackId = firstValue(tree);

  const requestedTeamId = searchParams.get("teamId") ?? undefined;
  // Defaults to the first team in the picker so the view never opens empty -- mirrors Org Tree's
  // root-team fallback.
  const teamId = requestedTeamId && teams.data?.[requestedTeamId] ? requestedTeamId : fallbackId;

  const { nodes, edges } = useMemo(() => {
    if (!teams.data || !components.data) return { nodes: [], edges: [] };
    const { nodes: builtNodes, edges: builtEdges } =
      teamId && teams.data[teamId]
        ? teamComponentsToFlow(teamId, teams.data, components.data, indirect ? "indirect" : "direct")
        : { nodes: [], edges: [] };
    return { nodes: withNodeSelect(builtNodes, "team:", selectTeam), edges: builtEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.data, components.data, teamId, indirect]);

  if (teams.error || components.error) {
    return <div>Failed to load org data.</div>;
  }
  if (!teams.data || !components.data) {
    return <div>Loading…</div>;
  }

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <TreePicker label="Team" paramName="teamId" tree={tree} fallbackId={fallbackId} />
        <label className="graph-toolbar-toggle">
          <input type="checkbox" checked={indirect} onChange={(event) => setIndirect(event.target.checked)} />
          Include components owned by subteams
        </label>
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        foldStorageKey={`team-components:${teamId ?? "none"}:${indirect ? "indirect" : "direct"}`}
        selectedNodeId={teamId ? `team:${teamId}` : undefined}
        emptyMessage="Select a team above to see the components it owns."
      />
    </div>
  );
}
