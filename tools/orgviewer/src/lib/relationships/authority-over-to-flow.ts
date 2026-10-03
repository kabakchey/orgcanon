import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE, lineManagementStyle } from "../../components/edge-styles";
import { getAuthorityLinesForTeam } from "./authority";
import { deriveLineManagerLink, getChainOfCommand } from "./line-management";
import { headDeputyEdges } from "./head-deputy-edges";
import { derivePersonCardRoles } from "./person-roles";
import { currentPositionTitle } from "./person-position";
import { deputyTitle, headDeputyTitle, headTitle, withInterimSuffix } from "./interim";
import type { AuthorityLine, AuthorityLineType, Person, Team } from "../orgapi/types";

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

function personNode(personId: string, teams: Record<string, Team>, people: Record<string, Person>): Node {
  const person = people[personId];
  const { primary } = derivePersonCardRoles(personId, teams);
  return {
    id: `person:${personId}`,
    type: "person",
    data: {
      label: person?.name ?? personId,
      teamName: primary ? (teams[primary.teamId]?.name ?? null) : null,
      positionTitle: currentPositionTitle(person),
      documentationUrl: person?.documentation_url,
      direction: "DOWN",
    },
    position: { x: 0, y: 0 },
  };
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
    ...lines.map((line) => personNode(line.person, teams, people)),
    ...lines.filter((line) => line.deputy).map((line) => personNode(line.deputy!, teams, people)),
    ...chainNodeIds.map((id) => personNode(id, teams, people)),
  ];

  const { deputyIds: headDeputyIds, edges: headDeputyEdgeList } = headDeputyEdges(chain, teams);
  const shownIds = new Set(nodes.map((node) => node.id));
  for (const id of new Set(headDeputyIds)) {
    if (!shownIds.has(`person:${id}`)) nodes.push(personNode(id, teams, people));
  }

  const edges: Edge[] = lines.map((line) => ({
    id: `authority:${line.person}->${teamId}`,
    source: `person:${line.person}`,
    target: `team:${teamId}`,
    style: EDGE_STYLE.authority,
    label: withInterimSuffix(authorityLineTypes[line.type]?.title ?? line.type, line.is_interim),
  }));

  for (const line of lines) {
    if (!line.deputy) continue;
    edges.push({
      id: `authority-deputy:${line.deputy}->${teamId}`,
      source: `person:${line.deputy}`,
      target: `team:${teamId}`,
      style: EDGE_STYLE.authority,
      label: withInterimSuffix(deputyTitle(authorityLineTypes[line.type]?.title ?? line.type), line.is_deputy_interim ?? false),
    });
    edges.push({
      id: `deputy:authority:${line.person}->${line.deputy}:${line.type}`,
      source: `person:${line.person}`,
      target: `person:${line.deputy}`,
      style: EDGE_STYLE.authority,
      label: withInterimSuffix("Deputy", line.is_deputy_interim ?? false),
    });
  }

  if (team) {
    edges.push({
      id: `chain:${team.head}->team:${teamId}`,
      source: `person:${team.head}`,
      target: `team:${teamId}`,
      style: lineManagementStyle(team.is_hierarchical),
      label: withInterimSuffix(headTitle(team), team.is_head_interim),
    });
    if (team.head_deputy) {
      edges.push({
        id: `chain-deputy:${team.head_deputy}->team:${teamId}`,
        source: `person:${team.head_deputy}`,
        target: `team:${teamId}`,
        style: lineManagementStyle(team.is_hierarchical),
        label: withInterimSuffix(headDeputyTitle(team), team.is_head_deputy_interim ?? false),
      });
    }
  }
  edges.push(...headDeputyEdgeList);
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push({
      id: `chain:${chain[i + 1]}->${chain[i]}`,
      source: `person:${chain[i + 1]}`,
      target: `person:${chain[i]}`,
      style: lineManagementStyle(deriveLineManagerLink(chain[i]!, teams)?.hierarchical ?? true),
      label: "Line manager",
    });
  }

  return { nodes, edges };
}
