# Payments Core Infra's own data: nested one level below payments-core (level 5 of 5, deepest
# team here), owning shared libraries consumed cross-team by ../data.tf's
# payments-worker (its parent) and ../../payments-growth/data.tf's payments-growth-ui (a more
# distant consumer). shared-auth-lib is a deliberate fan-in target: multiple components across
# two other teams depend on it directly.

locals {
  teams = {
    payments-core-infra = {
      name                        = "Payments Core Infra"
      type                        = "dev-team"
      description                 = "Owns shared infrastructure libraries used across payments."
      documentation_url           = "https://example.com/teams/payments-core-infra"
      contact_email               = "payments-core-infra@example.com"
      parent_team                 = "payments-core"
      head                        = "omar-elsayed"
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
          person            = "nadia-petrov"
          role              = "infra-owner"
          title             = "Infra Owner"
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
    omar-elsayed = {
      name                      = "Omar Elsayed"
      email                     = "omar.elsayed@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = ["backend"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-manager"
          title      = ""
          start_date = "2022-10-01"
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
        notes           = "line_manager derived: heads Payments Core Infra, whose parent is Payments Core -> reports to leo-tanaka. Deepest manager in this example (5 levels below the root)."
        owner           = "jordan-ade"
      }
    }

    nadia-petrov = {
      name                      = "Nadia Petrov"
      email                     = "nadia.petrov@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["data-eng"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-11-01"
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
        notes           = "line_manager derived: primary team is Payments Core Infra -> reports to omar-elsayed. Deepest individual contributor in this example (5 levels below the root, 6 counting herself)."
        owner           = "jordan-ade"
      }
    }
  }

  roles = {
    infra-owner = {
      name              = "Infra Owner"
      description       = "Owns shared infrastructure libraries."
      documentation_url = "https://example.com/roles/infra-owner"
      components        = ["shared-auth-lib", "shared-logging-lib"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }

  authority_lines = {}

  components = {
    shared-auth-lib = {
      name                  = "Shared Auth Library"
      description           = "Shared authentication/authorization client library."
      documentation_url     = "https://example.com/components/shared-auth-lib"
      team                  = "payments-core-infra"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "library"
      external_references   = { github_repo = "cascadia-shared-auth-lib" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Fan-in target: depended on directly by payments-worker (..) and payments-growth-ui (../../payments-growth), plus transitively by shared-logging-lib below."
        owner           = "jordan-ade"
      }
    }

    shared-logging-lib = {
      name                  = "Shared Logging Library"
      description           = "Shared structured-logging client library."
      documentation_url     = "https://example.com/components/shared-logging-lib"
      team                  = "payments-core-infra"
      dependency_components = ["shared-auth-lib"]
      is_end_user_facing    = false
      type                  = "library"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }
}
