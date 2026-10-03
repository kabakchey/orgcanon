import type { Team } from "../orgapi/types";
import { deputyTitle, headDeputyTitle, headTitle, memberTitle, withInterimSuffix } from "./interim";

export interface PersonRole {
  teamId: string;
  title: string;
  kind:
    | "deputy"
    | "head"
    | "primary-member"
    | "non-primary-deputy"
    | "non-primary-head"
    | "member"
    | "role-deputy";
}

export interface PersonCardRoles {
  primary: PersonRole | null;
  secondary: PersonRole[];
}

// Mirrors deriveLineManager's precedence (see line-management.ts) so a person's card title
// always matches the role their line manager is actually derived from: primary-team deputy >
// primary-team head > primary-team member > any non-primary entry. "role-deputy" (backing up someone else's
// members[] row) carries no line-management weight, so it sorts last.
const KIND_PRIORITY: Record<PersonRole["kind"], number> = {
  deputy: 0,
  head: 1,
  "primary-member": 2,
  "non-primary-deputy": 3,
  "non-primary-head": 4,
  member: 5,
  "role-deputy": 6,
};

export function collectPersonRoles(personId: string, teams: Record<string, Team>): PersonRole[] {
  const roles: PersonRole[] = [];

  for (const [teamId, team] of Object.entries(teams)) {
    if (team.head_deputy === personId) {
      roles.push({
        teamId,
        title: withInterimSuffix(headDeputyTitle(team), team.is_head_deputy_interim ?? false),
        kind: team.is_head_deputy_primary_team ? "deputy" : "non-primary-deputy",
      });
    }
    if (team.head === personId) {
      roles.push({
        teamId,
        title: withInterimSuffix(headTitle(team), team.is_head_interim),
        kind: team.is_head_primary_team ? "head" : "non-primary-head",
      });
    }
    for (const member of team.members) {
      if (member.person === personId) {
        roles.push({
          teamId,
          title: withInterimSuffix(memberTitle(member), member.is_interim),
          kind: member.is_primary_team ? "primary-member" : "member",
        });
      }
      if (member.deputy === personId) {
        roles.push({
          teamId,
          title: withInterimSuffix(deputyTitle(memberTitle(member)), member.is_deputy_interim ?? false),
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
