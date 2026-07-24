# Example data for examples/three-level-hierarchy/ -- the single root of this example's org
# hierarchy, plus the person who heads it. This is "common" only because it has no owning team
# by definition. Every other level gets its own ../teams/<team>/ directory instead.

locals {
  teams = {
    potuto = {
      name                        = "Potuto"
      type                        = "organization"
      description                 = "Top-level organization."
      documentation_url           = "https://example.com/teams/potuto"
      contact_email               = "potuto@example.com"
      parent_team                 = null
      head                        = "cto"
      head_title                  = "CTO"
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
        notes           = ""
        owner           = "cto"
      }
      is_hierarchical     = true
      is_cross_functional = true
      is_temporary        = false
    }
  }

  people = {
    cto = {
      name                      = "Chris Osei"
      email                     = "chris.osei@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "vp-of-engineering"
          title      = "CTO * Potuto @ Potuto"
          start_date = "2022-01-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "cto"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Root of the org chart -- no parent team, no line manager."
        owner           = "cto"
      }
    }
  }
}
