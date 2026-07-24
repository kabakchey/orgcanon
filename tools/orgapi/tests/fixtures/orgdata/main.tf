module "org" {
  source = "../../../../../org-model/validated"

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
