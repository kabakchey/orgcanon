import type { Component, Team } from "../../src/lib/orgapi/types";

const reviewable = { expiration_date: "2027-01-01", notes: "", owner: "x" };

export function team(overrides: Partial<Team> & { head: string }): Team {
  return {
    name: "T",
    type: "squad",
    description: "",
    documentation_url: "",
    contact_email: "t@example.com",
    parent_team: null,
    head_title: "Head",
    head_deputy: null,
    head_deputy_title: null,
    is_head_primary_team: true,
    is_head_deputy_primary_team: null,
    is_head_interim: false,
    is_head_deputy_interim: null,
    external_references: {},
    members: [],
    reviewable,
    is_hierarchical: false,
    is_cross_functional: false,
    is_temporary: false,
    ...overrides,
  };
}

export function component(overrides: Partial<Component> & { team: string }): Component {
  return {
    name: "C",
    description: "",
    documentation_url: "",
    dependency_components: [],
    is_end_user_facing: false,
    type: "service",
    external_references: {},
    reviewable,
    ...overrides,
  };
}
