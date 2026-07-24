# R&D's own data: has no roles/authority_lines/components yet -- kept as empty maps so this
# module's output shape matches every other team (./platform-squad/data.tf), keeping
# main.tf's merge() calls uniform regardless of what a team actually has.

locals {
  teams = {
    r-and-d = {
      name                        = "R&D"
      type                        = "department"
      description                 = "Technology Engineering & Craft."
      documentation_url           = "https://example.com/teams/r-and-d"
      contact_email               = "r-d@example.com"
      parent_team                 = "potuto"
      head                        = "vp-eng"
      head_title                  = "VP of Engineering"
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
    vp-eng = {
      name                      = "Vera Popescu"
      email                     = "vera.popescu@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "vp-of-engineering"
          title      = ""
          start_date = "2024-01-01"
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
        notes           = "line_manager derived: heads R&D, whose parent is Potuto -> reports to cto."
        owner           = "cto"
      }
    }
  }

  roles           = {}
  authority_lines = {}
  components      = {}
}
