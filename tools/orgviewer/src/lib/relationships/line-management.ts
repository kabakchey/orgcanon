import type { Team } from "../orgapi/types";

export interface LineManagerLink {
  managerId: string;
  // False when the link runs through a team (or, for a head, its parent team) with
  // is_hierarchical = false.
  hierarchical: boolean;
}

// Only primary-team signals count (is_head_deputy_primary_team / is_head_primary_team /
// members[].is_primary_team): someone heading several teams would otherwise resolve to whichever
// is iterated first, possibly a child of their own team -- a self-loop. Valid data has exactly one
// such signal per person; if it ever has more, precedence is head_deputy > head > member.
export function deriveLineManagerLink(personId: string, teams: Record<string, Team>): LineManagerLink | null {
  for (const team of Object.values(teams)) {
    if (team.head_deputy === personId && team.is_head_deputy_primary_team) {
      return { managerId: team.head, hierarchical: team.is_hierarchical };
    }
  }

  for (const team of Object.values(teams)) {
    if (team.head === personId && team.is_head_primary_team) {
      const parent = team.parent_team === null ? undefined : teams[team.parent_team];
      if (!parent) return null;
      return { managerId: parent.head, hierarchical: team.is_hierarchical && parent.is_hierarchical };
    }
  }

  for (const team of Object.values(teams)) {
    const isPrimaryMember = team.members.some((m) => m.person === personId && m.is_primary_team);
    if (isPrimaryMember) {
      return { managerId: team.head, hierarchical: team.is_hierarchical };
    }
  }

  return null;
}

export function deriveLineManager(personId: string, teams: Record<string, Team>): string | null {
  return deriveLineManagerLink(personId, teams)?.managerId ?? null;
}

export function getChainOfCommand(personId: string, teams: Record<string, Team>): string[] {
  const chain: string[] = [];
  let current: string = personId;
  for (let i = 0; i < Object.keys(teams).length + 1; i++) {
    const manager = deriveLineManager(current, teams);
    if (manager === null) break;
    chain.push(manager);
    current = manager;
  }
  return chain;
}

// The inverse of deriveLineManager: every person who could plausibly appear in `teams` (as a
// head, deputy, or member of any team), whose derived line manager is personId. Sorted for a
// deterministic order (deriveLineManager gives one manager per person, but a manager can have
// several reports with no inherent ordering among them).
export function getDirectReports(personId: string, teams: Record<string, Team>): string[] {
  const candidates = new Set<string>();
  for (const team of Object.values(teams)) {
    if (team.head_deputy) candidates.add(team.head_deputy);
    candidates.add(team.head);
    for (const member of team.members) candidates.add(member.person);
  }
  candidates.delete(personId);

  return [...candidates].filter((id) => deriveLineManager(id, teams) === personId).sort();
}
