# The single root of the org hierarchy, plus the person who heads it -- "common" only because
# it has no owning team by definition. Every other level gets its own ../teams/<team>/
# directory instead -- see docs/invariants.md "Graph shape" for why exactly one team lands here.
#
# TODO: replace this placeholder with your own org's root team and head. The schema requires
# exactly one team with no parent_team (org-model/validated/variables.tf), so `make check`
# needs *something* here -- edit this file first. See ../../examples/single-team/ and
# ../../examples/three-level-hierarchy/ for filled-in examples.

locals {
  teams = {
    your-organization = {
      name                        = "Your Organization"
      type                        = "organization"
      description                 = "TODO: replace with your organization's own root team."
      documentation_url           = "https://example.com/teams/your-organization"
      contact_email               = "replace-me@example.com"
      parent_team                 = null
      head                        = "replace-me"
      head_title                  = "TODO: your root team's head title"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = true
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = {}
      members                     = []
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Root of the org chart -- no parent team, no line manager."
        owner           = "replace-me"
      }
      is_hierarchical     = true
      is_cross_functional = true
      is_temporary        = false
    }
  }

  people = {
    replace-me = {
      name                      = "Replace Me"
      email                     = "replace-me@example.com"
      primary_specialization    = "TODO"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "vp-of-engineering"
          title      = "TODO: replace with the real position title"
          start_date = "2023-01-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "replace-me"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "TODO: replace with the real head of your root team."
        owner           = "replace-me"
      }
    }
  }
}
