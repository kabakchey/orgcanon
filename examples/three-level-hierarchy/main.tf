# Worked example: a 3-level team hierarchy (organization -> department -> squad), mirroring
# org-model/'s common/ + teams/<team>/ + main.tf pattern -- see ../../org-model/main.tf for the
# onboarding steps.

module "common" {
  source = "./common"
}

module "team_r_and_d" {
  source = "./teams/r-and-d"
}

module "team_platform_squad" {
  source = "./teams/r-and-d/platform-squad"
}

module "org" {
  source = "../../org-model/validated"

  formal_position_types = module.common.formal_position_types
  authority_line_types  = module.common.authority_line_types
  team_types            = module.common.team_types
  component_types       = module.common.component_types

  people = merge(
    module.common.people,
    module.team_r_and_d.people,
    module.team_platform_squad.people,
  )

  teams = merge(
    module.common.teams,
    module.team_r_and_d.teams,
    module.team_platform_squad.teams,
  )

  roles = merge(
    module.team_r_and_d.roles,
    module.team_platform_squad.roles,
  )

  authority_lines = merge(
    module.team_r_and_d.authority_lines,
    module.team_platform_squad.authority_lines,
  )

  components = merge(
    module.team_r_and_d.components,
    module.team_platform_squad.components,
  )
}
