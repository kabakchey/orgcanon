# Single-team example: the simplest valid org -- one team, no departments/squads underneath.
# Everything lives in this one file (no common/ + teams/<team>/ split) since there's only one
# team to describe. See ../three-level-hierarchy/ for the multi-team pattern instead.

locals {
  formal_position_types = {
    software-engineer = {
      title             = "Software Engineer"
      level             = "mid"
      description       = "Builds and maintains software components."
      documentation_url = "https://example.com/growth/software-engineer"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
    engineering-lead = {
      title             = "Engineering Lead"
      level             = "lead"
      description       = "Owns engineering direction and delivery for the whole team."
      documentation_url = "https://example.com/growth/engineering-lead"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
  }

  authority_line_types = {
    tech-lead = {
      title             = "Tech Lead"
      description       = "Gives technical direction for the team; not a formal management role."
      documentation_url = "https://example.com/authority-lines/tech-lead"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
  }

  team_types = {
    organization = {
      title             = "organization"
      description       = "Top-level, and in this example the only, org unit."
      documentation_url = "https://example.com/team-types/organization"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
  }

  component_types = {
    service = {
      title             = "service"
      description       = "A backend service or API."
      documentation_url = "https://example.com/component-types/service"
      is_external       = false
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
    user-interface = {
      title             = "user interface"
      description       = "An end-user-facing UI surface."
      documentation_url = "https://example.com/component-types/user-interface"
      is_external       = false
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
    duty = {
      title             = "duty"
      description       = "A recurring or standing operational responsibility a team owns, distinct from a piece of software. Two shapes: a recurring activity performed on a cadence (e.g. chairing a weekly release review) or a constant \"watch\" duty covering a standing rotation (e.g. an on-call schedule) with no fixed end. Not tied to any single repo/service -- name the artifact it protects, if any, via dependency_components."
      documentation_url = "https://example.com/component-types/duty"
      is_external       = false
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
  }

  teams = {
    acme-widgets = {
      name                        = "Acme Widgets"
      type                        = "organization"
      description                 = "The whole org, modeled as a single team -- no departments or squads yet."
      documentation_url           = "https://example.com/teams/acme-widgets"
      contact_email               = "acme-widgets@example.com"
      parent_team                 = null
      head                        = "jordan-blake"
      head_title                  = "Engineering Lead"
      head_deputy                 = "sam-rivera"
      head_deputy_title           = "Deputy Engineering Lead"
      is_head_primary_team        = true
      is_head_deputy_primary_team = true
      is_head_interim             = false
      is_head_deputy_interim      = false
      external_references         = { github_team_slug = "acme-widgets" }
      members = [
        {
          person            = "taylor-morgan"
          role              = "backend-owner"
          title             = "Backend Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "riley-chen"
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
        notes           = "Root of the org chart -- no parent team, no line manager."
        owner           = "jordan-blake"
      }
      is_hierarchical     = false
      is_cross_functional = true
      is_temporary        = false
    }
  }

  people = {
    jordan-blake = {
      name                      = "Jordan Blake"
      email                     = "jordan.blake@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-lead"
          title      = "Engineering Lead * Acme Widgets @ Acme Widgets"
          start_date = "2023-01-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "jordan-blake"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "line_manager derived: heads Acme Widgets, the root team -> no line manager."
        owner           = "jordan-blake"
      }
    }

    sam-rivera = {
      name                      = "Sam Rivera"
      email                     = "sam.rivera@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-lead"
          title      = "Engineering Lead (Backend) * Deputy Engineering Lead @ Acme Widgets"
          start_date = "2023-01-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "jordan-blake"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "line_manager derived: Acme Widgets' head_deputy -> reports to jordan-blake."
        owner           = "jordan-blake"
      }
    }

    taylor-morgan = {
      name                      = "Taylor Morgan"
      email                     = "taylor.morgan@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = { github_accountname = "taylorm" }
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = "Software Engineer (Backend) * Backend Owner @ Acme Widgets"
          start_date = "2023-06-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "jordan-blake"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "line_manager derived: primary team is Acme Widgets -> reports to jordan-blake."
        owner           = "jordan-blake"
      }
    }

    riley-chen = {
      name                      = "Riley Chen"
      email                     = "riley.chen@example.com"
      primary_specialization    = "frontend"
      secondary_specializations = []
      external_references       = { github_accountname = "rileyc" }
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = "Software Engineer (Frontend) * Frontend Owner @ Acme Widgets"
          start_date = "2023-09-01"
          end_date   = null
          reviewable = {
            expiration_date = "2027-01-01"
            notes           = ""
            owner           = "jordan-blake"
          }
        }
      ]
      extensions = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "line_manager derived: primary team is Acme Widgets -> reports to jordan-blake. Holds a Role (ownership) plus a Tech Lead AuthorityLine (functional)."
        owner           = "jordan-blake"
      }
    }
  }

  roles = {
    backend-owner = {
      name              = "Backend Owner"
      description       = "Owns backend services for the team."
      documentation_url = "https://example.com/roles/backend-owner"
      components        = ["core-api"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
    frontend-owner = {
      name              = "Frontend Owner"
      description       = "Owns user-facing surfaces for the team."
      documentation_url = "https://example.com/roles/frontend-owner"
      components        = ["web-app"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }
  }

  authority_lines = {
    riley-chen-tech-lead = {
      person            = "riley-chen"
      deputy            = null
      type              = "tech-lead"
      start_date        = "2025-01-01"
      end_date          = null
      teams             = ["acme-widgets"]
      documentation_url = ""
      is_interim        = false
      is_deputy_interim = null
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Functional/advisory authority only -- not line management."
        owner           = "jordan-blake"
      }
    }
  }

  components = {
    core-api = {
      name                  = "Core API"
      description           = "Core backend service."
      documentation_url     = "https://example.com/components/core-api"
      team                  = "acme-widgets"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "service"
      external_references   = { github_repo = "acme-core-api" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }

    web-app = {
      name                  = "Web App"
      description           = "Customer-facing web application."
      documentation_url     = "https://example.com/components/web-app"
      team                  = "acme-widgets"
      dependency_components = ["core-api"]
      is_end_user_facing    = true
      type                  = "user-interface"
      external_references   = { github_repo = "acme-web-app" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-blake"
      }
    }

    weekly-demo-duty = {
      name                  = "Weekly Release Demo"
      description           = "Recurring duty: chairs the team's weekly release demo."
      documentation_url     = "https://example.com/components/weekly-demo-duty"
      team                  = "acme-widgets"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "duty"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Recurring-activity pattern of the duty component type -- contrast a constant watch duty."
        owner           = "jordan-blake"
      }
    }
  }
}
