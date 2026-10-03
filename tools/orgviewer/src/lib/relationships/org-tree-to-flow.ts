import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE, lineManagementStyle } from "../../components/edge-styles";
import { teamEdgeStyle } from "./team-edge-style";
import type { LayoutDirection } from "../../components/layout";
import { getAuthorityLinesForTeam } from "./authority";
import { currentPositionTitle } from "./person-position";
import { deputyTitle, headDeputyTitle, headTitle, memberTitle, withInterimSuffix } from "./interim";
import type { AuthorityLine, AuthorityLineType, Person, Team } from "../orgapi/types";

export function findRootTeamId(teams: Record<string, Team>): string | undefined {
  return Object.entries(teams).find(([, team]) => team.parent_team === null)?.[0];
}

export interface OrgTreeToFlowOptions {
  // Team membership (head/deputy/members) nodes and edges -- on by default since that's the
  // tree's original, always-on content.
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
  direction: LayoutDirection = "DOWN",
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
    nodes.push({
      id: `person:${personId}`,
      type: "person",
      data: {
        label: person?.name ?? personId,
        positionTitle: currentPositionTitle(person),
        documentationUrl: person?.documentation_url,
        direction,
      },
      position: { x: 0, y: 0 },
    });
  }

  for (const [teamId, team] of Object.entries(teams)) {
    nodes.push({
      id: `team:${teamId}`,
      type: "team",
      data: {
        label: team.name,
        type: team.type,
        description: team.description,
        documentationUrl: team.documentation_url,
        direction,
      },
      position: { x: 0, y: 0 },
    });

    if (team.parent_team) {
      edges.push({
        id: `hierarchy:${team.parent_team}->${teamId}`,
        source: `team:${team.parent_team}`,
        target: `team:${teamId}`,
        style: teamEdgeStyle(teams[team.parent_team], team),
      });
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
        edges.push({
          id: `deputy:${teamId}:${team.head}->${team.head_deputy}`,
          source: `person:${team.head}`,
          target: `person:${team.head_deputy}`,
          style: lineManagementStyle(team.is_hierarchical),
          label: withInterimSuffix("Deputy", team.is_head_deputy_interim ?? false),
        });
      }
      team.members.forEach((member, index) => {
        if (!member.deputy) return;
        edges.push({
          id: `deputy:${teamId}:${member.person}->${member.deputy}:${index}`,
          source: `person:${member.person}`,
          target: `person:${member.deputy}`,
          style: EDGE_STYLE.membership,
          label: withInterimSuffix("Deputy", member.is_deputy_interim ?? false),
        });
      });
    }

    if (showAuthorityLines) {
      for (const line of getAuthorityLinesForTeam(teamId, authorityLines)) {
        ensurePersonNode(line.person);
        edges.push({
          id: `authority:${line.person}->${teamId}`,
          source: `person:${line.person}`,
          target: `team:${teamId}`,
          style: EDGE_STYLE.authority,
          label: withInterimSuffix(authorityLineTypes[line.type]?.title ?? line.type, line.is_interim),
        });
        if (line.deputy) {
          ensurePersonNode(line.deputy);
          edges.push({
            id: `authority-deputy:${line.deputy}->${teamId}`,
            source: `person:${line.deputy}`,
            target: `team:${teamId}`,
            style: EDGE_STYLE.authority,
            label: withInterimSuffix(deputyTitle(authorityLineTypes[line.type]?.title ?? line.type), line.is_deputy_interim ?? false),
          });
          // An AuthorityLine spanning several teams is visited once per team, but its holder->deputy
          // link is one relationship.
          const deputyEdgeId = `deputy:authority:${line.person}->${line.deputy}:${line.type}`;
          if (!edges.some((edge) => edge.id === deputyEdgeId)) {
            edges.push({
              id: deputyEdgeId,
              source: `person:${line.person}`,
              target: `person:${line.deputy}`,
              style: EDGE_STYLE.authority,
              label: withInterimSuffix("Deputy", line.is_deputy_interim ?? false),
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}
