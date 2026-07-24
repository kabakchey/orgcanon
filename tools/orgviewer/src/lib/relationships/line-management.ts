import type { Team } from "../orgapi/types";

// Precedence when a person could match more than one rule (not expected in valid org data, but
// not schema-enforced either): head_deputy > head > ordinary member, applied as three
// independent rules in that order.
export function deriveLineManager(personId: string, teams: Record<string, Team>): string | null {
  for (const team of Object.values(teams)) {
    if (team.head_deputy === personId) {
      return team.head;
    }
  }

  for (const team of Object.values(teams)) {
    if (team.head === personId) {
      if (team.parent_team === null) return null;
      return teams[team.parent_team]?.head ?? null;
    }
  }

  for (const team of Object.values(teams)) {
    const isPrimaryMember = team.members.some((m) => m.person === personId && m.is_primary_team);
    if (isPrimaryMember) {
      return team.head;
    }
  }

  return null;
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
