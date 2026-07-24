# Composes team-owned data (teams/<team>/) and org-wide data (common/) into the validated
# schema. Each merge() call is the seam CODEOWNERS is built around: common/ and teams/<team>/
# are separate child modules, so per-directory CODEOWNERS review gates who can change what --
# this file just wires their outputs together.
#
# validated/ is a child module (not inline here) because `variable` blocks can't source their
# own values from a `local` in the same module -- module inputs are the only way to feed
# computed/merged values into a block that also carries `validation { ... }`.
#
# teams/<team>/ is nested to mirror the org chart -- a non-root team's directory sits directly
# inside its parent_team's directory (e.g. teams/engineering/payments-squad/payments-core/), so
# the org chart is visible from the tree itself instead of only from scattered parent_team
# fields. A reorg (changing parent_team) means moving the directory and updating this file's and
# CODEOWNERS' paths -- accepted as a same-shape cost to any other file move, traded for every
# other read of the hierarchy being easier. common/ stays narrow: just the root team and the
# org-wide type vocabulary.
#
# A team may reference another team's entities directly (e.g.
# components[*].dependency_components) -- intentional: a dependency is the consumer's call,
# like importing a public package doesn't need the owner's sign-off (CODEOWNERS isn't the
# system for that, e.g. Compass is). Exception: a cross-team AuthorityLine is an authority
# claim *over* those teams, so it's authored under their lowest common ancestor instead -- see
# CONTEXT.md's AuthorityLine entry.
#
# common/org.tf ships a placeholder root team -- replace it with your own org's root team and
# head before adding any teams/<team>/ directories. See ../examples/single-team/ and
# ../examples/three-level-hierarchy/ for worked examples of the pattern below.
#
# To onboard a new team:
#   1. Add org-model/teams/<path-to-new-team>/{data.tf,outputs.tf}, nested inside its
#      parent_team's own directory (directly under teams/ if its parent is the root team) --
#      see examples/*/teams/<...>/ for the shape -- output all six maps, empty ({}) for any the
#      team doesn't have yet, so merge() below never needs an if-this-team-has-X check
#   2. Add a `module "team_<new-team>" { source = "./teams/<path-to-new-team>" }` block below
#   3. Fold its outputs into the merge() calls below
#   4. Add a CODEOWNERS entry for /org-model/teams/<path-to-new-team>/
#
# Reorging an existing team (changing its parent_team): move its directory (and every
# descendant team directory nested inside it) to sit under its new parent, then update that
# team's and every moved descendant's `source` string here and CODEOWNERS entry to match.

module "common" {
  source = "./common"
}

module "org" {
  source = "./validated"

  formal_position_types = module.common.formal_position_types
  authority_line_types  = module.common.authority_line_types
  team_types            = module.common.team_types
  component_types       = module.common.component_types

  people = module.common.people
  teams  = module.common.teams

  # No teams/<team>/ directories exist yet -- once you add them, fold their
  # roles/authority_lines/components/retirement_confirmations into merge() calls here (see
  # onboarding steps above).
  roles                    = {}
  authority_lines          = {}
  components               = {}
  retirement_confirmations = {}
}
