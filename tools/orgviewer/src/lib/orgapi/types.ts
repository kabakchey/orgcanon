export interface Reviewable {
  expiration_date: string;
  notes: string;
  owner: string;
}

export interface FormalPositionType {
  title: string;
  level: string;
  description: string;
  documentation_url: string;
  reviewable: Reviewable;
}

export interface Position {
  type: string;
  title: string;
  start_date: string;
  end_date: string | null;
  reviewable: Reviewable;
}

export interface Person {
  name: string;
  email: string;
  primary_specialization: string;
  secondary_specializations: string[];
  external_references: Record<string, string>;
  documentation_url: string;
  positions: Position[];
  extensions: Record<string, Record<string, string>>;
  reviewable: Reviewable;
}

export interface Role {
  name: string;
  description: string;
  documentation_url: string;
  components: string[];
  reviewable: Reviewable;
}

export interface AuthorityLineType {
  title: string;
  description: string;
  documentation_url: string;
  reviewable: Reviewable;
}

export interface AuthorityLine {
  person: string;
  deputy: string | null;
  type: string;
  start_date: string;
  end_date: string | null;
  teams: string[];
  documentation_url: string;
  is_interim: boolean;
  is_deputy_interim: boolean | null;
  reviewable: Reviewable;
}

export interface TeamType {
  title: string;
  description: string;
  documentation_url: string;
  reviewable: Reviewable;
}

export interface TeamMember {
  person: string;
  role: string;
  title: string;
  is_primary_team: boolean;
  deputy: string | null;
  is_interim: boolean;
  is_deputy_interim: boolean | null;
}

export interface Team {
  name: string;
  type: string;
  description: string;
  documentation_url: string;
  contact_email: string;
  parent_team: string | null;
  head: string;
  head_title: string;
  head_deputy: string | null;
  head_deputy_title: string | null;
  is_head_primary_team: boolean;
  is_head_deputy_primary_team: boolean | null;
  is_head_interim: boolean;
  is_head_deputy_interim: boolean | null;
  external_references: Record<string, string>;
  members: TeamMember[];
  reviewable: Reviewable;
  is_hierarchical: boolean;
  is_cross_functional: boolean;
  is_temporary: boolean;
}

export interface ComponentType {
  title: string;
  description: string;
  documentation_url: string;
  is_external: boolean;
  reviewable: Reviewable;
}

export interface Component {
  name: string;
  description: string;
  documentation_url: string;
  team: string;
  dependency_components: string[];
  is_end_user_facing: boolean;
  type: string;
  external_references: Record<string, string>;
  reviewable: Reviewable;
}

export interface OrgData {
  formal_position_types: Record<string, FormalPositionType>;
  authority_line_types: Record<string, AuthorityLineType>;
  team_types: Record<string, TeamType>;
  component_types: Record<string, ComponentType>;
  people: Record<string, Person>;
  roles: Record<string, Role>;
  teams: Record<string, Team>;
  authority_lines: Record<string, AuthorityLine>;
  components: Record<string, Component>;
}

export const ORG_DATA_OUTPUT_KEYS = [
  "formal_position_types",
  "authority_line_types",
  "team_types",
  "component_types",
  "people",
  "roles",
  "teams",
  "authority_lines",
  "components",
] as const satisfies readonly (keyof OrgData)[];

export function isEntityKey(value: string): value is keyof OrgData {
  return (ORG_DATA_OUTPUT_KEYS as readonly string[]).includes(value);
}
