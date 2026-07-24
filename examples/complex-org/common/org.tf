# Example data for examples/complex-org/ -- the single root of this example's org hierarchy,
# plus the person who heads it. See ../../three-level-hierarchy/common/org.tf for the pattern.

locals {
  teams = {
    cascadia = {
      name                        = "Cascadia"
      type                        = "organization"
      description                 = "Top-level organization -- root of this example's team hierarchy."
      documentation_url           = "https://example.com/teams/cascadia"
      contact_email               = "cascadia@example.com"
      parent_team                 = null
      head                        = "jordan-ade"
      head_title                  = "Chief Executive"
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
        owner           = "jordan-ade"
      }
      is_hierarchical     = true
      is_cross_functional = true
      is_temporary        = false
    }
  }

  people = {
    jordan-ade = {
      name                      = "Jordan Ade"
      email                     = "jordan.ade@example.com"
      primary_specialization    = "executive-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "chief-executive"
          title      = "Chief Executive * Cascadia @ Cascadia"
          start_date = "2021-01-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "jordan-ade"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Root of the org chart -- no parent team, no line manager."
        owner           = "jordan-ade"
      }
    }
  }
}
