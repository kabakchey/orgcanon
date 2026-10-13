import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE, lineManagementStyle } from "./edge-styles";
import { authorityDeputyEdges, authorityEdge, flowEdge, personNode, teamNode } from "./flow-elements";
import { teamEdgeStyle } from "./team-edge-style";
import { getAuthorityLinesForTeam } from "./authority";
import { currentPositionTitle } from "./person-position";
import { deputyTitle, headDeputyTitle, headTitle, memberTitle, withInterimSuffix } from "./interim";
import type { AuthorityLine, AuthorityLineType, Person, Team } from "../orgapi/types";

export function findRootTeamId(teams: Record<string, Team>): string | undefined {
  return Object.entries(teams).find(([, team]) => team.parent_team === null)?.[0];
}

interface OrgTreeToFlowOptions {
  // Team membership (head/deputy/members) nodes and edges.
  showPeople?: boolean;
  // Authority-line holders layered on top, same edge style as Authority Over's -- off by default
  // since most teams have none and the tree is busy enough already.
  showAuthorityLines?: boolean;
  authorityLines?: Record<string, AuthorityLine>;
  authorityLineTypes?: Record<string, AuthorityLineType>;
}

export function orgTreeToFlow(
  teams: Record<string, Team>,
  people: Record<string, Person>,
  options: OrgTreeToFlowOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    showPeople = true,
    showAuthorityLines = false,
    authorityLines = {},
    authorityLineTypes = {},
  } = options;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const includedPersonIds = new Set<string>();

  function ensurePersonNode(personId: string): void {
    if (includedPersonIds.has(personId)) return;
    includedPersonIds.add(personId);
    const person = people[personId];
    nodes.push(personNode(personId, person, { positionTitle: currentPositionTitle(person) }));
  }

  for (const [teamId, team] of Object.entries(teams)) {
    nodes.push(teamNode(teamId, team));

    if (team.parent_team) {
      edges.push(
        flowEdge(
          `hierarchy:${team.parent_team}->${teamId}`,
          `team:${team.parent_team}`,
          `team:${teamId}`,
          teamEdgeStyle(teams[team.parent_team], team)
        )
      );
    }

    if (showPeople) {
      const memberships: Array<{ personId: string; label: string; isPrimary: boolean; isLeadership: boolean }> = [
        { personId: team.head, label: withInterimSuffix(headTitle(team), team.is_head_interim), isPrimary: true, isLeadership: true },
      ];
      if (team.head_deputy) {
        memberships.push({
          personId: team.head_deputy,
          label: withInterimSuffix(headDeputyTitle(team), team.is_head_deputy_interim ?? false),
          isPrimary: true,
          isLeadership: true,
        });
      }
      for (const member of team.members) {
        memberships.push({
          personId: member.person,
          label: withInterimSuffix(memberTitle(member), member.is_interim),
          isPrimary: member.is_primary_team,
          isLeadership: false,
        });
        if (member.deputy) {
          memberships.push({
            personId: member.deputy,
            label: withInterimSuffix(deputyTitle(memberTitle(member)), member.is_deputy_interim ?? false),
            isPrimary: false,
            isLeadership: false,
          });
        }
      }

      memberships.forEach(({ personId, label, isPrimary, isLeadership }, index) => {
        ensurePersonNode(personId);
        const prefix = isPrimary ? "membership" : "membership-secondary";
        edges.push({
          // Indexed rather than keyed by label: identical labels can repeat for the same person
          // within one team, and the id only needs to be unique, not human-readable.
          id: `${prefix}:${teamId}->${personId}:${index}`,
          source: `team:${teamId}`,
          target: `person:${personId}`,
          type: "labeled",
          // Head and deputy are the team's line-management link, not ordinary membership -- styled
          // like chain-of-command/authority-over's line-management edges even though
          // the edge id keeps its "membership:" prefix so folding a team still folds them with it.
          style: isLeadership ? lineManagementStyle(team.is_hierarchical) : EDGE_STYLE.membership,
          label,
        });
      });

      if (team.head_deputy) {
        edges.push(
          flowEdge(
            `deputy:${teamId}:${team.head}->${team.head_deputy}`,
            `person:${team.head}`,
            `person:${team.head_deputy}`,
            lineManagementStyle(team.is_hierarchical),
            withInterimSuffix("Deputy", team.is_head_deputy_interim ?? false)
          )
        );
      }
      team.members.forEach((member, index) => {
        if (!member.deputy) return;
        edges.push(
          flowEdge(
            `deputy:${teamId}:${member.person}->${member.deputy}:${index}`,
            `person:${member.person}`,
            `person:${member.deputy}`,
            EDGE_STYLE.membership,
            withInterimSuffix("Deputy", member.is_deputy_interim ?? false)
          )
        );
      });
    }

    if (showAuthorityLines) {
      for (const line of getAuthorityLinesForTeam(teamId, authorityLines)) {
        ensurePersonNode(line.person);
        edges.push(authorityEdge(teamId, line, authorityLineTypes));
        if (line.deputy) ensurePersonNode(line.deputy);
        // An AuthorityLine spanning several teams is visited once per team, but its holder->deputy
        // link is one relationship.
        for (const edge of authorityDeputyEdges(teamId, line, authorityLineTypes)) {
          if (!edges.some((existing) => existing.id === edge.id)) edges.push(edge);
        }
      }
    }
  }

  return { nodes, edges };
}
