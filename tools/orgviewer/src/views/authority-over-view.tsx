import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { authorityOverToFlow } from "../lib/relationships/authority-over-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { TreePicker } from "../components/tree-picker";
import { useSelectParam } from "../lib/use-select-param";
import { firstValue, teamTree } from "../lib/picker/tree";
import { withNodeSelect } from "../lib/with-node-select";

export function AuthorityOverView() {
  const teams = useEntities("teams");
  const people = useEntities("people");
  const authorityLines = useEntities("authority_lines");
  const authorityLineTypes = useEntities("authority_line_types");
  const [searchParams] = useSearchParams();
  const selectTeam = useSelectParam("teamId");

  const tree = useMemo(() => (teams.data ? teamTree(teams.data) : []), [teams.data]);
  const fallbackId = firstValue(tree);

  const requestedTeamId = searchParams.get("teamId") ?? undefined;
  // Defaults to the first team in the picker so the view never opens empty -- mirrors Org Tree's
  // root-team fallback.
  const teamId = requestedTeamId && teams.data?.[requestedTeamId] ? requestedTeamId : fallbackId;

  const { nodes, edges } = useMemo(() => {
    if (!teams.data || !people.data || !authorityLines.data || !authorityLineTypes.data)
      return { nodes: [], edges: [] };
    const { nodes: builtNodes, edges: builtEdges } =
      teamId && teams.data[teamId]
        ? authorityOverToFlow(teamId, teams.data, people.data, authorityLines.data, authorityLineTypes.data)
        : { nodes: [], edges: [] };
    return { nodes: withNodeSelect(builtNodes, "team:", selectTeam), edges: builtEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.data, people.data, authorityLines.data, authorityLineTypes.data, teamId]);

  if (teams.error || people.error || authorityLines.error || authorityLineTypes.error) {
    return <div>Failed to load org data.</div>;
  }
  if (!teams.data || !people.data || !authorityLines.data || !authorityLineTypes.data) {
    return <div>Loading…</div>;
  }

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <TreePicker label="Team" paramName="teamId" tree={tree} fallbackId={fallbackId} />
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        foldStorageKey={`authority-over:${teamId ?? "none"}`}
        selectedNodeId={teamId ? `team:${teamId}` : undefined}
        emptyMessage="Select a team above to see who holds authority over it."
      />
    </div>
  );
}
