import { useMemo } from "react";
import { GraphCanvas } from "../components/graph-canvas";
import { ToolbarToggle } from "../components/toolbar-toggle";
import { TreePicker } from "../components/tree-picker";
import { useOrgData } from "../lib/orgapi/use-entities";
import { teamTree } from "../lib/picker/tree";
import { findRootTeamId, orgTreeToFlow } from "../lib/relationships/org-tree-to-flow";
import { useBooleanParam } from "../lib/use-boolean-param";
import { usePickedParam } from "../lib/use-picked-param";
import { withNodeSelect } from "../lib/with-node-select";

export function OrgTreeView() {
  const { data, error } = useOrgData(["teams", "people", "authority_lines", "authority_line_types"]);
  const [showPeople, setShowPeople] = useBooleanParam("showPeople", true);
  const [showAuthorityLines, setShowAuthorityLines] = useBooleanParam("showAuthorityLines", false);
  // The whole tree is always shown: the pick only drives the highlight and camera centering, and
  // an unknown or missing teamId falls back to the root.
  const [teamId, selectTeam] = usePickedParam(
    "teamId",
    (id) => data !== undefined && id in data.teams,
    data && findRootTeamId(data.teams)
  );

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const built = orgTreeToFlow(data.teams, data.people, {
      showPeople,
      showAuthorityLines,
      authorityLines: data.authority_lines,
      authorityLineTypes: data.authority_line_types,
    });
    return { nodes: withNodeSelect(built.nodes, "team:", selectTeam), edges: built.edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, showPeople, showAuthorityLines]);
  const tree = useMemo(() => (data ? teamTree(data.teams) : []), [data]);

  if (error) return <div>Failed to load org data.</div>;
  if (!data) return <div>Loading…</div>;

  return (
    <div className="view-body">
      <div className="graph-toolbar">
        <TreePicker label="Team" tree={tree} value={teamId} onChange={selectTeam} />
        <ToolbarToggle checked={showPeople} onChange={setShowPeople}>
          Show people
        </ToolbarToggle>
        <ToolbarToggle checked={showAuthorityLines} onChange={setShowAuthorityLines}>
          Show authority lines
        </ToolbarToggle>
      </div>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        graphKey="org-tree"
        selectedNodeId={teamId ? `team:${teamId}` : undefined}
      />
    </div>
  );
}
