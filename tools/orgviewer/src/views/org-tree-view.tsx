import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEntities } from "../lib/orgapi/use-entities";
import { findRootTeamId, orgTreeToFlow } from "../lib/relationships/org-tree-to-flow";
import { GraphCanvas } from "../components/graph-canvas";
import { EntityPicker, useSelectParam } from "../components/entity-picker";
import { withNodeSelect } from "../lib/with-node-select";

export function OrgTreeView() {
  const teams = useEntities("teams");
  const people = useEntities("people");
  const authorityLines = useEntities("authority_lines");
  const authorityLineTypes = useEntities("authority_line_types");
  const [searchParams] = useSearchParams();
  const selectTeam = useSelectParam("teamId");
  const [showPeople, setShowPeople] = useState(true);
  const [showAuthorityLines, setShowAuthorityLines] = useState(false);

  const { nodes, edges } = useMemo(() => {
    if (!teams.data || !people.data) return { nodes: [], edges: [] };
    const { nodes: builtNodes, edges: builtEdges } = orgTreeToFlow(teams.data, people.data, "DOWN", {
      showPeople,
      showAuthorityLines,
      authorityLines: authorityLines.data,
      authorityLineTypes: authorityLineTypes.data,
    });
    return { nodes: withNodeSelect(builtNodes, "team:", selectTeam), edges: builtEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.data, people.data, authorityLines.data, authorityLineTypes.data, showPeople, showAuthorityLines]);

  if (teams.error || people.error) {
    return <div>Failed to load org data.</div>;
  }
  if (!teams.data || !people.data) {
    return <div>Loading…</div>;
  }

  const rootTeamId = findRootTeamId(teams.data);
  const requestedTeamId = searchParams.get("teamId") ?? undefined;
  // Org Tree always shows the whole tree regardless of selection -- selection here only drives
  // the highlight + camera centering, so an unknown/missing teamId just falls back to the root
  // rather than ever leaving the view with nothing selected.
  const teamId = requestedTeamId && teams.data[requestedTeamId] ? requestedTeamId : rootTeamId;

  const options = Object.entries(teams.data)
    .map(([id, team]) => ({ id, label: team.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <EntityPicker paramName="teamId" options={options} fallbackId={rootTeamId} />
        <label className="graph-toolbar-toggle">
          <input type="checkbox" checked={showPeople} onChange={(event) => setShowPeople(event.target.checked)} />
          Show people
        </label>
        <label className="graph-toolbar-toggle">
          <input
            type="checkbox"
            checked={showAuthorityLines}
            onChange={(event) => setShowAuthorityLines(event.target.checked)}
          />
          Show authority lines
        </label>
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        foldStorageKey="org-tree"
        selectedNodeId={teamId ? `team:${teamId}` : undefined}
      />
    </div>
  );
}
