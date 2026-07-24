# Payments Growth's own data: sibling of payments-core under payments-squad (level 4), owning
# an end-user-facing UI. Its component chain is deliberately the longest here --
# payments-growth-ui -> payments-growth-api -> payments-api -> payments-db (and payments-api ->
# identity-api -> identity-db) -- so Component Dependencies' direct-vs-transitive toggle shows
# a real difference from payments-growth-ui; also the second consumer of
# ../payments-core/payments-core-infra/data.tf's shared-auth-lib.

locals {
  teams = {
    payments-growth = {
      name                        = "Payments Growth"
      type                        = "dev-team"
      description                 = "Owns growth-facing payments surfaces (checkout upsells, plan changes)."
      documentation_url           = "https://example.com/teams/payments-growth"
      contact_email               = "payments-growth@example.com"
      parent_team                 = "payments-squad"
      head                        = "yusuf-demir"
      head_title                  = "Engineering Manager"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = true
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = {}
      members = [
        {
          person            = "clara-devine"
          role              = "growth-owner"
          title             = "Growth Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
      ]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
      is_hierarchical     = false
      is_cross_functional = false
      is_temporary        = false
    }
  }

  people = {
    yusuf-demir = {
      name                      = "Yusuf Demir"
      email                     = "yusuf.demir@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-manager"
          title      = ""
          start_date = "2023-02-01"
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
        notes           = "line_manager derived: heads Payments Growth, whose parent is Payments Squad -> reports to tariq-farouk."
        owner           = "jordan-ade"
      }
    }

    clara-devine = {
      name                      = "Clara Devine"
      email                     = "clara.devine@example.com"
      primary_specialization    = "frontend"
      secondary_specializations = ["backend"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2023-03-01"
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
        notes           = "line_manager derived: primary team is Payments Growth -> reports to yusuf-demir."
        owner           = "jordan-ade"
      }
    }
  }

  roles = {
    growth-owner = {
      name              = "Growth Owner"
      description       = "Owns growth-facing payments surfaces."
      documentation_url = "https://example.com/roles/growth-owner"
      components        = ["payments-growth-api", "payments-growth-ui"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }

  authority_lines = {}

  components = {
    payments-growth-api = {
      name                  = "Payments Growth API"
      description           = "Backend for growth-facing payments surfaces."
      documentation_url     = "https://example.com/components/payments-growth-api"
      team                  = "payments-growth"
      dependency_components = ["payments-api"]
      is_end_user_facing    = false
      type                  = "service"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Cross-team dependency on payments-api, owned by sibling team ../payments-core/data.tf."
        owner           = "jordan-ade"
      }
    }

    payments-growth-ui = {
      name                  = "Payments Growth UI"
      description           = "Customer-facing upsell and plan-change flows."
      documentation_url     = "https://example.com/components/payments-growth-ui"
      team                  = "payments-growth"
      dependency_components = ["payments-growth-api", "shared-auth-lib"]
      is_end_user_facing    = true
      type                  = "user-interface"
      external_references   = { github_repo = "cascadia-payments-growth-ui" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Two direct dependencies, one of them (shared-auth-lib) owned by a team that is neither this team's parent nor a sibling -- ../payments-core/payments-core-infra/data.tf, a child of this team's sibling payments-core. Also the far end of this example's longest dependency chain: payments-growth-ui -> payments-growth-api -> payments-api -> payments-db / identity-api -> identity-db."
        owner           = "jordan-ade"
      }
    }
  }
}
