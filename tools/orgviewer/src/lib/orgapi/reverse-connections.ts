import type { OrgData } from "./types";

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

function reverse<S extends keyof OrgData>(
  entityKey: keyof OrgData,
  label: string,
  sourceKey: S,
  matches: (source: OrgData[S][string], id: string) => boolean
): ReverseConnectionSpec {
  return { entityKey, label, sourceKey, matches: matches as ReverseConnectionSpec["matches"] };
}

const REVERSE_CONNECTIONS: ReverseConnectionSpec[] = [
  reverse("teams", "Child teams", "teams", (team, id) => team.parent_team === id),
  reverse("teams", "Owned components", "components", (component, id) => component.team === id),
  reverse(
    "teams",
    "Authority lines over this team",
    "authority_lines",
    (line, id) => line.teams.includes(id)
  ),

  reverse("people", "Head of", "teams", (team, id) => team.head === id),
  reverse("people", "Deputy head of", "teams", (team, id) => team.head_deputy === id),
  reverse("people", "Member of", "teams", (team, id) => team.members.some((member) => member.person === id)),
  reverse(
    "people",
    "Authority lines held",
    "authority_lines",
    (line, id) => line.person === id || line.deputy === id
  ),

  reverse(
    "components",
    "Depended on by",
    "components",
    (component, id) => component.dependency_components.includes(id)
  ),
  reverse("components", "Used by roles", "roles", (role, id) => role.components.includes(id)),

  reverse(
    "roles",
    "Used in team memberships",
    "teams",
    (team, id) => team.members.some((member) => member.role === id)
  ),

  reverse(
    "authority_line_types",
    "Authority lines of this type",
    "authority_lines",
    (line, id) => line.type === id
  ),
  reverse("team_types", "Teams of this type", "teams", (team, id) => team.type === id),
  reverse(
    "component_types",
    "Components of this type",
    "components",
    (component, id) => component.type === id
  ),
  reverse(
    "formal_position_types",
    "People with this position type",
    "people",
    (person, id) => person.positions.some((position) => position.type === id)
  ),
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
