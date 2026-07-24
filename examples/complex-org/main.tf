# Worked example: a bigger, branchier org built to exercise every scenario orgviewer's five
# graph views can show (deep + branching hierarchy, direct AND transitive component deps
# including a real cycle, cross-team deps, multi-team authority, a secondary team membership,
# a large fan-out for chain-of-command folding, a person heading two teams, a person holding
# two AuthorityLines, a person holding two Roles on one team). Unlike three-level-hierarchy/,
# this isn't about the common/+teams/<team>/ split (that one covers it); it's about scenario
# coverage, hence the bigger team count. See ../../org-model/main.tf.

module "common" {
  source = "./common"
}

module "team_engineering" {
  source = "./teams/engineering"
}

module "team_design" {
  source = "./teams/design"
}

module "team_data_guild" {
  source = "./teams/data-guild"
}

module "team_payments_squad" {
  source = "./teams/engineering/payments-squad"
}

module "team_identity_squad" {
  source = "./teams/engineering/identity-squad"
}

module "team_payments_core" {
  source = "./teams/engineering/payments-squad/payments-core"
}

module "team_payments_core_infra" {
  source = "./teams/engineering/payments-squad/payments-core/payments-core-infra"
}

module "team_payments_growth" {
  source = "./teams/engineering/payments-squad/payments-growth"
}

module "team_reliability_committee" {
  source = "./teams/reliability-committee"
}

module "org" {
  source = "../../org-model/validated"

  formal_position_types = module.common.formal_position_types
  authority_line_types  = module.common.authority_line_types
  team_types            = module.common.team_types
  component_types       = module.common.component_types

  people = merge(
    module.common.people,
    module.team_engineering.people,
    module.team_design.people,
    module.team_data_guild.people,
    module.team_payments_squad.people,
    module.team_identity_squad.people,
    module.team_payments_core.people,
    module.team_payments_core_infra.people,
    module.team_payments_growth.people,
    module.team_reliability_committee.people,
  )

  teams = merge(
    module.common.teams,
    module.team_engineering.teams,
    module.team_design.teams,
    module.team_data_guild.teams,
    module.team_payments_squad.teams,
    module.team_identity_squad.teams,
    module.team_payments_core.teams,
    module.team_payments_core_infra.teams,
    module.team_payments_growth.teams,
    module.team_reliability_committee.teams,
  )

  roles = merge(
    module.team_engineering.roles,
    module.team_design.roles,
    module.team_data_guild.roles,
    module.team_payments_squad.roles,
    module.team_identity_squad.roles,
    module.team_payments_core.roles,
    module.team_payments_core_infra.roles,
    module.team_payments_growth.roles,
    module.team_reliability_committee.roles,
  )

  authority_lines = merge(
    module.team_engineering.authority_lines,
    module.team_design.authority_lines,
    module.team_data_guild.authority_lines,
    module.team_payments_squad.authority_lines,
    module.team_identity_squad.authority_lines,
    module.team_payments_core.authority_lines,
    module.team_payments_core_infra.authority_lines,
    module.team_payments_growth.authority_lines,
    module.team_reliability_committee.authority_lines,
  )

  components = merge(
    module.team_engineering.components,
    module.team_design.components,
    module.team_data_guild.components,
    module.team_payments_squad.components,
    module.team_identity_squad.components,
    module.team_payments_core.components,
    module.team_payments_core_infra.components,
    module.team_payments_growth.components,
    module.team_reliability_committee.components,
  )
}
