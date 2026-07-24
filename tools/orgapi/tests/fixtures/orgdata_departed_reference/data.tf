# `terraform plan` alone doesn't catch this (the check depends on `timestamp()`, which Terraform
# defers to `apply`), proving load_org_data's `apply` step enforces it end-to-end.

locals {
  formal_position_types = {
    engineering-lead = {
      title             = "Engineering Lead"
      level             = "lead"
      description       = "Owns engineering direction and delivery."
      documentation_url = "https://example.com/growth/engineering-lead"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }
  authority_line_types = {}
  team_types = {
    department = {
      title             = "department"
      description       = "Top-level org unit."
      documentation_url = "https://example.com/team-types/department"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }
  component_types = {}

  people = {
    alice-nguyen = {
      name                      = "Alice Nguyen"
      email                     = "alice.nguyen@example.com"
      primary_specialization    = "engineering-management"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-lead"
          title      = "Engineering Lead * Acme HQ @ Acme HQ"
          start_date = "2020-01-01"
          end_date   = "2023-01-01"
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "alice-nguyen"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }

  roles = {}

  teams = {
    acme-hq = {
      name                        = "Acme HQ"
      type                        = "department"
      description                 = "The one root, headed by a departed person."
      documentation_url           = "https://example.com/teams/acme-hq"
      contact_email               = "acme-hq@example.com"
      parent_team                 = null
      head                        = "alice-nguyen"
      head_title                  = "Engineering Lead"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = false
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = {}
      members                     = []
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
      is_hierarchical     = true
      is_cross_functional = false
      is_temporary        = false
    }
  }

  authority_lines = {}
  components      = {}
}
