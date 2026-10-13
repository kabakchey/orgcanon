import type { Team } from "../orgapi/types";

export function withInterimSuffix(title: string, isInterim: boolean): string {
  return isInterim ? `${title} (interim)` : title;
}

export function deputyTitle(mainTitle: string): string {
  return `${mainTitle} Deputy`;
}

// head_title/member title are required but may be "" in real data; a blank label is useless.
export function headTitle(team: Team): string {
  return team.head_title || "Head";
}

export function headDeputyTitle(team: Team): string {
  return team.head_deputy_title || deputyTitle(headTitle(team));
}

export function memberTitle(member: Team["members"][number]): string {
  return member.title || "Member";
}
