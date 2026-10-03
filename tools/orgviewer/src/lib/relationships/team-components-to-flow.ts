import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE } from "../../components/edge-styles";
import { teamEdgeStyle } from "./team-edge-style";
import { componentNode } from "./component-dependencies-to-flow";
import type { Component, Team } from "../orgapi/types";

function teamNode(teamId: string, team: Team | undefined): Node {
  return {
    id: `team:${teamId}`,
    type: "team",
    data: {
      label: team?.name ?? teamId,
      type: team?.type ?? "",
      description: team?.description ?? "",
      documentationUrl: team?.documentation_url,
      direction: "DOWN",
    },
    position: { x: 0, y: 0 },
  };
}

function directChildTeamIds(teamId: string, teams: Record<string, Team>): string[] {
  return Object.entries(teams)
    .filter(([, team]) => team.parent_team === teamId)
    .map(([id]) => id);
}

function descendantTeamIds(teamId: string, teams: Record<string, Team>): string[] {
  const result: string[] = [];
  const queue = [teamId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of directChildTeamIds(current, teams)) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

// The components owned by one team -- and, in "indirect" mode, its descendant teams -- since
// component ownership belongs to teams, not people (that's Chain of Command's / Org Tree's job).
// No ancestor/sibling teams: this view is about one team's own component ownership, not the
// whole org tree.
export function teamComponentsToFlow(
  teamId: string,
  teams: Record<string, Team>,
  components: Record<string, Component>,
  mode: "direct" | "indirect"
): { nodes: Node[]; edges: Edge[] } {
  const team = teams[teamId];
  const nodes: Node[] = [teamNode(teamId, team)];
  const edges: Edge[] = [];

  const ownerTeamIds = [teamId];
  if (mode === "indirect") {
    for (const childId of descendantTeamIds(teamId, teams)) {
      nodes.push(teamNode(childId, teams[childId]));
      const parentId = teams[childId]!.parent_team!;
      edges.push({
        id: `hierarchy:${parentId}->${childId}`,
        source: `team:${parentId}`,
        target: `team:${childId}`,
        style: teamEdgeStyle(teams[parentId], teams[childId]),
      });
      ownerTeamIds.push(childId);
    }
  }

  const ownerTeamIdSet = new Set(ownerTeamIds);
  for (const [componentId, component] of Object.entries(components)) {
    if (!ownerTeamIdSet.has(component.team)) continue;
    nodes.push(componentNode(componentId, components, teams, "DOWN"));
    edges.push({
      id: `ownership:${component.team}->${componentId}`,
      source: `team:${component.team}`,
      target: `component:${componentId}`,
      style: EDGE_STYLE.ownership,
    });
  }

  return { nodes, edges };
}
