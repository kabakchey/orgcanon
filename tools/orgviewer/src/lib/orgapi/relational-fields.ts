import type { OrgData } from "./types";

type RelationalFieldMap = Partial<Record<string, keyof OrgData>>;

// Maps a field name on a given entity collection to the entity collection its value (or, for an
// array-valued field, each of its values) refers to. Only genuine foreign keys are listed here --
// e.g. Team.type points at team_types even though it's a plain string, not an id-shaped field.
const RELATIONAL_FIELDS: Record<keyof OrgData, RelationalFieldMap> = {
  formal_position_types: {},
  authority_line_types: {},
  team_types: {},
  component_types: {},
  people: {},
  roles: {
    components: "components",
  },
  teams: {
    parent_team: "teams",
    head: "people",
    head_deputy: "people",
    type: "team_types",
  },
  authority_lines: {
    person: "people",
    deputy: "people",
    teams: "teams",
    type: "authority_line_types",
  },
  components: {
    team: "teams",
    dependency_components: "components",
    type: "component_types",
  },
};

export function relationalTargetFor(entityKey: keyof OrgData, field: string): keyof OrgData | undefined {
  return RELATIONAL_FIELDS[entityKey][field];
}
