import type { Edge } from "@xyflow/react";
import { lineManagementStyle } from "../../components/edge-styles";
import { withInterimSuffix } from "./interim";
import type { Team } from "../orgapi/types";

// Labels name the team because these views show no team nodes to anchor the edge to, and a head
// leading several teams can have a different deputy on each.
export function headDeputyEdges(
  headIds: string[],
  teams: Record<string, Team>
): { deputyIds: string[]; edges: Edge[] } {
  const deputyIds: string[] = [];
  const edges: Edge[] = [];
  for (const headId of headIds) {
    for (const [teamId, team] of Object.entries(teams)) {
      if (team.head !== headId || !team.head_deputy) continue;
      deputyIds.push(team.head_deputy);
      edges.push({
        id: `deputy:${teamId}:${headId}->${team.head_deputy}`,
        source: `person:${headId}`,
        target: `person:${team.head_deputy}`,
        style: lineManagementStyle(team.is_hierarchical),
        label: withInterimSuffix(`Deputy (${team.name})`, team.is_head_deputy_interim ?? false),
      });
    }
  }
  return { deputyIds, edges };
}
