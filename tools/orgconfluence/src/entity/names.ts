import type { EntityRecord, EntityType } from "../orgapi/client";

export const ENTITY_LABELS: Record<EntityType, string> = {
  people: "person",
  teams: "team",
  roles: "role",
  components: "component",
  authority_lines: "authority line",
  authority_line_types: "authority line type",
  team_types: "team type",
  component_types: "component type",
  formal_position_types: "formal position type",
};

/** Every entity names itself with `name` or `title`, except an authority line, which has neither. */
export function displayName(record: EntityRecord): string {
  if (typeof record.name === "string") return record.name;
  return typeof record.title === "string" ? record.title : record.id;
}

export type AuthorityLine = EntityRecord & {
  person: string;
  type: string;
  start_date: string;
  end_date: string | null;
  teams: string[];
};

/** Null while the line is active on `today` (an ISO-8601 date); its last day still counts. */
export function inactiveNote(line: AuthorityLine, today: string): string | null {
  if (line.start_date > today) return `from ${line.start_date}`;
  return line.end_date !== null && line.end_date < today ? "ended" : null;
}
