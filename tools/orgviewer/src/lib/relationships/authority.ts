import type { AuthorityLine } from "../orgapi/types";

export function getAuthorityLinesForTeam(
  teamId: string,
  authorityLines: Record<string, AuthorityLine>
): AuthorityLine[] {
  return Object.values(authorityLines).filter((line) => line.teams.includes(teamId));
}
