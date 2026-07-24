# Single-team example: wires the locals in data.tf directly into org-model/validated -- no
# common/ + teams/<team>/ split needed since there's only one team. See
# ../three-level-hierarchy/ for the multi-team pattern.

module "org" {
  source = "../../org-model/validated"

  formal_position_types = local.formal_position_types
  authority_line_types  = local.authority_line_types
  team_types            = local.team_types
  component_types       = local.component_types
  people                = local.people
  teams                 = local.teams
  roles                 = local.roles
  authority_lines       = local.authority_lines
  components            = local.components
}
