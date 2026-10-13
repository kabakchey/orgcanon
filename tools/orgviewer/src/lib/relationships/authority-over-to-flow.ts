import type { Edge, Node } from "@xyflow/react";
import { lineManagementStyle } from "./edge-styles";
import { authorityDeputyEdges, authorityEdge, flowEdge, personNode, teamNode } from "./flow-elements";
import { getAuthorityLinesForTeam } from "./authority";
import { deriveLineManagerLink, getChainOfCommand } from "./line-management";
import { headDeputyEdges } from "./head-deputy-edges";
import { derivePersonCardRoles } from "./person-roles";
import { currentPositionTitle } from "./person-position";
import { headDeputyTitle, headTitle, withInterimSuffix } from "./interim";
import type { AuthorityLine, AuthorityLineType, Person, Team } from "../orgapi/types";

function personCard(personId: string, teams: Record<string, Team>, people: Record<string, Person>) {
  const person = people[personId];
  const { primary } = derivePersonCardRoles(personId, teams);
  return personNode(personId, person, {
    teamName: primary ? (teams[primary.teamId]?.name ?? null) : null,
    positionTitle: currentPositionTitle(person),
  });
}

// A team plus the people who hold an explicit authority line over it (no cascade to ancestor
// teams), plus the team's own line-management chain -- its head, that head's derived manager,
// and that manager's manager, up to the org root -- plus deputies of the authority lines and of
// every team those chain members head, and nothing else: no other org-tree membership, no
// ancestor/sibling team nodes, and no authority holder's own personal
// line-management chain (only the team's, via its head). The view is about these two
// relationships layered on one team, not team composition (that's Team Components / Org Tree's
// job).
export function authorityOverToFlow(
  teamId: string,
  teams: Record<string, Team>,
  people: Record<string, Person>,
  authorityLines: Record<string, AuthorityLine>,
  authorityLineTypes: Record<string, AuthorityLineType>
): { nodes: Node[]; edges: Edge[] } {
  const team = teams[teamId];
  const lines = getAuthorityLinesForTeam(teamId, authorityLines);
  const managerChain = team ? getChainOfCommand(team.head, teams) : [];
  // The head leads the chain; each subsequent id is that person's manager, up to the org root.
  const chain = team ? [team.head, ...managerChain] : [];

  const authorityHolderIds = new Set(lines.flatMap((line) => (line.deputy ? [line.person, line.deputy] : [line.person])));
  const chainNodeIds = chain.filter((id) => !authorityHolderIds.has(id));

  const nodes = [
    teamNode(teamId, team),
    ...lines.map((line) => personCard(line.person, teams, people)),
    ...lines.filter((line) => line.deputy).map((line) => personCard(line.deputy!, teams, people)),
    ...chainNodeIds.map((id) => personCard(id, teams, people)),
  ];

  const { deputyIds: headDeputyIds, edges: headDeputyEdgeList } = headDeputyEdges(chain, teams);
  const shownIds = new Set(nodes.map((node) => node.id));
  for (const id of new Set(headDeputyIds)) {
    if (!shownIds.has(`person:${id}`)) nodes.push(personCard(id, teams, people));
  }

  const edges: Edge[] = [
    ...lines.map((line) => authorityEdge(teamId, line, authorityLineTypes)),
    ...lines.flatMap((line) => authorityDeputyEdges(teamId, line, authorityLineTypes)),
  ];

  if (team) {
    edges.push(
      flowEdge(
        `chain:${team.head}->team:${teamId}`,
        `person:${team.head}`,
        `team:${teamId}`,
        lineManagementStyle(team.is_hierarchical),
        withInterimSuffix(headTitle(team), team.is_head_interim)
      )
    );
    if (team.head_deputy) {
      edges.push(
        flowEdge(
          `chain-deputy:${team.head_deputy}->team:${teamId}`,
          `person:${team.head_deputy}`,
          `team:${teamId}`,
          lineManagementStyle(team.is_hierarchical),
          withInterimSuffix(headDeputyTitle(team), team.is_head_deputy_interim ?? false)
        )
      );
    }
  }
  edges.push(...headDeputyEdgeList);
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push(
      flowEdge(
        `chain:${chain[i + 1]}->${chain[i]}`,
        `person:${chain[i + 1]}`,
        `person:${chain[i]}`,
        lineManagementStyle(deriveLineManagerLink(chain[i]!, teams)?.hierarchical ?? true),
        "Line manager"
      )
    );
  }

  return { nodes, edges };
}
