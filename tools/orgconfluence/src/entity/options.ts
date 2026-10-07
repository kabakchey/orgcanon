import type { EntityRecord, EntityType, OrgApi } from "../orgapi/client";
import { displayName, inactiveNote, type AuthorityLine } from "./names";
import type { EntityOption } from "./types";

async function namesOf(orgApi: OrgApi, type: EntityType): Promise<(id: string) => string> {
  const names = new Map((await orgApi.listEntities(type)).map((record) => [record.id, displayName(record)]));
  return (id) => names.get(id) ?? id;
}

async function authorityLineOptions(orgApi: OrgApi, lines: EntityRecord[], today: string): Promise<EntityOption[]> {
  const [person, type, team] = await Promise.all([
    namesOf(orgApi, "people"),
    namesOf(orgApi, "authority_line_types"),
    namesOf(orgApi, "teams"),
  ]);
  return (lines as AuthorityLine[])
    .filter((line) => inactiveNote(line, today) === null)
    .map((line) => ({
      id: line.id,
      name: `${type(line.type)} (${person(line.person)})`,
      label: `${type(line.type)} — ${person(line.person)} (${line.teams.map(team).join(", ")})`,
    }));
}

/** What an author can pick for one entity type; `today` is an ISO-8601 date. */
export async function entityOptions(orgApi: OrgApi, type: EntityType, today: string): Promise<EntityOption[]> {
  const records = await orgApi.listEntities(type);
  const options =
    type === "authority_lines"
      ? await authorityLineOptions(orgApi, records, today)
      : records.map((record) => ({
          id: record.id,
          name: displayName(record),
          label: `${displayName(record)} (${record.id})`,
        }));
  return options.sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1));
}
