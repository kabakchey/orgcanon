import type { Team } from "../orgapi/types";
import { withInterimSuffix } from "./interim";

export interface PersonRole {
  teamId: string;
  title: string;
  kind: "deputy" | "head" | "primary-member" | "member" | "role-deputy";
}

export interface PersonCardRoles {
  primary: PersonRole | null;
  secondary: PersonRole[];
}

// Mirrors deriveLineManager's precedence (see line-management.ts) so a person's card title
// always matches the role their line manager is actually derived from: deputy > head >
// primary-team member > any other member entry. "role-deputy" (backing up someone else's
// members[] row) carries no line-management weight, so it sorts last.
const KIND_PRIORITY: Record<PersonRole["kind"], number> = {
  deputy: 0,
  head: 1,
  "primary-member": 2,
  member: 3,
  "role-deputy": 4,
};

export function collectPersonRoles(personId: string, teams: Record<string, Team>): PersonRole[] {
  const roles: PersonRole[] = [];

  for (const [teamId, team] of Object.entries(teams)) {
    if (team.head_deputy === personId) {
      roles.push({
        teamId,
        title: withInterimSuffix(team.head_deputy_title ?? "Deputy", team.is_head_deputy_interim ?? false),
        kind: "deputy",
      });
    }
    if (team.head === personId) {
      roles.push({ teamId, title: withInterimSuffix(team.head_title, team.is_head_interim), kind: "head" });
    }
    for (const member of team.members) {
      if (member.person === personId) {
        roles.push({
          teamId,
          title: withInterimSuffix(member.title, member.is_interim),
          kind: member.is_primary_team ? "primary-member" : "member",
        });
      }
      if (member.deputy === personId) {
        roles.push({
          teamId,
          title: withInterimSuffix("Deputy", member.is_deputy_interim ?? false),
          kind: "role-deputy",
        });
      }
    }
  }

  return roles;
}

export function derivePersonCardRoles(personId: string, teams: Record<string, Team>): PersonCardRoles {
  const roles = collectPersonRoles(personId, teams);
  if (roles.length === 0) {
    return { primary: null, secondary: [] };
  }

  const sorted = [...roles].sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
  const [primary, ...secondary] = sorted;
  return { primary: primary ?? null, secondary };
}
