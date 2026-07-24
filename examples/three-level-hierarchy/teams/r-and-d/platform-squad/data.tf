# Platform Squad's own data: team, people, scoped roles/authority-lines, owned components.
# Platform Squad edits this file freely -- never needs to touch ../../../common/ or
# ../../../validated/ for its own people/components.
#
# The one thing requiring outside changes: a dependency on another team's component, or an
# authority line spanning multiple teams -- both are cross-team concerns, belonging in
# common/ (or a cross-team-links module) once a second team exists, so affected teams'
# CODEOWNERS all get a say.

locals {
  teams = {
    platform-squad = {
      name                        = "Platform Squad"
      type                        = "squad"
      description                 = "Owns platform billing components."
      documentation_url           = "https://example.com/teams/platform-squad"
      contact_email               = "platform-squad@example.com"
      parent_team                 = "r-and-d"
      head                        = "alice-nguyen"
      head_title                  = "Team Lead"
      head_deputy                 = "bob-diaz"
      head_deputy_title           = "Deputy Team Lead"
      is_head_primary_team        = true
      is_head_deputy_primary_team = true
      is_head_interim             = false
      is_head_deputy_interim      = false
      external_references         = { github_team_slug = "platform-squad" }
      members = [
        {
          person            = "carol-lee"
          role              = "backend-owner"
          title             = "Backend Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "carol-lee"
          role              = "frontend-owner"
          title             = "Frontend Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
      ]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
      is_hierarchical     = false
      is_cross_functional = false
      is_temporary        = false
    }
  }

  people = {
    alice-nguyen = {
      name                      = "Alice Nguyen"
      email                     = "alice.nguyen@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["data-eng"]
      external_references       = { github_accountname = "alicen" }
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2023-01-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "cto"
          }
        }
      ]
      extensions = {
        hr = {
          hiring_type   = "internal"
          hiring_entity = "potuto"
        }
      }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "line_manager derived: heads Platform Squad, whose parent is R&D -> reports to vp-eng."
        owner           = "cto"
      }
    }

    bob-diaz = {
      name                      = "Bob Diaz"
      email                     = "bob.diaz@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2023-01-01"
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
        notes           = "line_manager derived: Platform Squad's head_deputy -> reports to alice-nguyen."
        owner           = "cto"
      }
    }

    carol-lee = {
      name                      = "Carol Lee"
      email                     = "carol.lee@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["frontend"]
      external_references       = { github_accountname = "carollee" }
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2023-06-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "cto"
          }
        }
      ]
      extensions = {
        hr = {
          hiring_type   = "external"
          hiring_entity = "other"
        }
      }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "line_manager derived: primary team is Platform Squad -> reports to alice-nguyen. Holds two Roles (ownership) plus a Tech Lead AuthorityLine (functional)."
        owner           = "cto"
      }
    }
  }

  roles = {
    backend-owner = {
      name              = "Backend Owner"
      description       = "Owns backend services for the team."
      documentation_url = "https://example.com/roles/backend-owner"
      components        = ["billing-api"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
    }
    frontend-owner = {
      name              = "Frontend Owner"
      description       = "Owns user-facing surfaces for the team."
      documentation_url = "https://example.com/roles/frontend-owner"
      components        = ["billing-ui"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
    }
  }

  authority_lines = {
    carol-lee-tech-lead = {
      person            = "carol-lee"
      deputy            = null
      type              = "tech-lead"
      start_date        = "2025-01-01"
      end_date          = null
      teams             = ["platform-squad"]
      documentation_url = ""
      is_interim        = false
      is_deputy_interim = null
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Functional/advisory authority only -- not line management."
        owner           = "cto"
      }
    }
  }

  components = {
    billing-api = {
      name                  = "Billing API"
      description           = "Core billing service."
      documentation_url     = "https://example.com/components/billing-api"
      team                  = "platform-squad"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "service"
      external_references   = { github_repo = "potuto-billing-api" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
    }

    billing-ui = {
      name                  = "Billing UI"
      description           = "Customer-facing billing dashboard."
      documentation_url     = "https://example.com/components/billing-ui"
      team                  = "platform-squad"
      dependency_components = ["billing-api"]
      is_end_user_facing    = true
      type                  = "user-interface"
      external_references   = { github_repo = "potuto-billing-ui" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
    }
  }
}
