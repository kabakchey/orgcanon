import type { AuthorityLine, Team } from "../orgapi/types";

export function getAuthorityLinesForTeam(
  teamId: string,
  authorityLines: Record<string, AuthorityLine>
): AuthorityLine[] {
  return Object.values(authorityLines).filter((line) => line.teams.includes(teamId));
}

export function getAuthorityLinesForPerson(
  personId: string,
  teams: Record<string, Team>,
  authorityLines: Record<string, AuthorityLine>
): AuthorityLine[] {
  const personTeamIds = Object.entries(teams)
    .filter(
      ([, team]) =>
        team.head === personId ||
        team.head_deputy === personId ||
        team.members.some((m) => m.person === personId)
    )
    .map(([teamId]) => teamId);

  return Object.values(authorityLines).filter((line) =>
    line.teams.some((teamId) => personTeamIds.includes(teamId))
  );
}
