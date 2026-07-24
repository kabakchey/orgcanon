import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { authorityOverToFlow } from "../lib/relationships/authority-over-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { EntityPicker, useSelectParam } from "../components/entity-picker";
import { withNodeSelect } from "../lib/with-node-select";

export function AuthorityOverView() {
  const teams = useEntities("teams");
  const people = useEntities("people");
  const authorityLines = useEntities("authority_lines");
  const authorityLineTypes = useEntities("authority_line_types");
  const [searchParams] = useSearchParams();
  const selectTeam = useSelectParam("teamId");

  const options = teams.data
    ? Object.entries(teams.data)
        .map(([id, team]) => ({ id, label: team.name }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  const requestedTeamId = searchParams.get("teamId") ?? undefined;
  // Defaults to the first team in the picker so the view never opens empty -- mirrors Org Tree's
  // root-team fallback.
  const teamId = requestedTeamId && teams.data?.[requestedTeamId] ? requestedTeamId : options[0]?.id;

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
        <EntityPicker paramName="teamId" options={options} fallbackId={options[0]?.id} />
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
