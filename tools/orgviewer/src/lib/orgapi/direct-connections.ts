import type { AuthorityLine, Component, OrgData, Person, Role, Team } from "./types";

export interface EntityConnection {
  label: string;
  targetKey: keyof OrgData;
  ids: string[];
}

// A reverse connection: entities of `sourceKey` that point back at the entity being viewed
// (`entityKey`), found via a foreign key `matches` doesn't already surface as one of the viewed
// entity's own fields (e.g. a team lists its own head, but not which teams it's the head of).
interface ReverseConnectionSpec {
  entityKey: keyof OrgData;
  label: string;
  sourceKey: keyof OrgData;
  matches: (source: unknown, id: string) => boolean;
}

const REVERSE_CONNECTIONS: ReverseConnectionSpec[] = [
  { entityKey: "teams", label: "Child teams", sourceKey: "teams", matches: (s, id) => (s as Team).parent_team === id },
  {
    entityKey: "teams",
    label: "Owned components",
    sourceKey: "components",
    matches: (s, id) => (s as Component).team === id,
  },
  {
    entityKey: "teams",
    label: "Authority lines over this team",
    sourceKey: "authority_lines",
    matches: (s, id) => (s as AuthorityLine).teams.includes(id),
  },

  { entityKey: "people", label: "Head of", sourceKey: "teams", matches: (s, id) => (s as Team).head === id },
  {
    entityKey: "people",
    label: "Deputy head of",
    sourceKey: "teams",
    matches: (s, id) => (s as Team).head_deputy === id,
  },
  {
    entityKey: "people",
    label: "Member of",
    sourceKey: "teams",
    matches: (s, id) => (s as Team).members.some((member) => member.person === id),
  },
  {
    entityKey: "people",
    label: "Authority lines held",
    sourceKey: "authority_lines",
    matches: (s, id) => {
      const line = s as AuthorityLine;
      return line.person === id || line.deputy === id;
    },
  },

  {
    entityKey: "components",
    label: "Depended on by",
    sourceKey: "components",
    matches: (s, id) => (s as Component).dependency_components.includes(id),
  },
  {
    entityKey: "components",
    label: "Used by roles",
    sourceKey: "roles",
    matches: (s, id) => (s as Role).components.includes(id),
  },

  {
    entityKey: "roles",
    label: "Used in team memberships",
    sourceKey: "teams",
    matches: (s, id) => (s as Team).members.some((member) => member.role === id),
  },

  {
    entityKey: "authority_line_types",
    label: "Authority lines of this type",
    sourceKey: "authority_lines",
    matches: (s, id) => (s as AuthorityLine).type === id,
  },
  {
    entityKey: "team_types",
    label: "Teams of this type",
    sourceKey: "teams",
    matches: (s, id) => (s as Team).type === id,
  },
  {
    entityKey: "component_types",
    label: "Components of this type",
    sourceKey: "components",
    matches: (s, id) => (s as Component).type === id,
  },
  {
    entityKey: "formal_position_types",
    label: "People with this position type",
    sourceKey: "people",
    matches: (s, id) => (s as Person).positions.some((position) => position.type === id),
  },
];

// Which collections need to be loaded to compute reverse connections for `entityKey` -- lets a
// caller fetch only what's needed instead of every collection on every entity page.
export function reverseConnectionSourceKeysFor(entityKey: keyof OrgData): (keyof OrgData)[] {
  const keys = REVERSE_CONNECTIONS.filter((spec) => spec.entityKey === entityKey).map((spec) => spec.sourceKey);
  return [...new Set(keys)];
}

export function reverseConnectionsFor(
  entityKey: keyof OrgData,
  id: string,
  sources: Partial<Record<keyof OrgData, Record<string, unknown>>>
): EntityConnection[] {
  const connections: EntityConnection[] = [];
  for (const spec of REVERSE_CONNECTIONS) {
    if (spec.entityKey !== entityKey) continue;
    const collection = sources[spec.sourceKey];
    if (!collection) continue;
    const ids = Object.entries(collection)
      .filter(([, entity]) => spec.matches(entity, id))
      .map(([entityId]) => entityId);
    if (ids.length > 0) connections.push({ label: spec.label, targetKey: spec.sourceKey, ids });
  }
  return connections;
}
