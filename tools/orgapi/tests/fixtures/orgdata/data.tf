# Small hand-crafted org used by orgapi's own tests (not the real org-model/ data, and not
# ../../../../../examples/ -- those can change for reasons unrelated to this API).

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
        owner           = "alice-nguyen"
      }
    }
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

  authority_line_types = {
    tech-lead = {
      title             = "Tech Lead"
      description       = "Gives technical direction for the team; not a formal management role."
      documentation_url = "https://example.com/authority-lines/tech-lead"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }

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
    squad = {
      title             = "squad"
      description       = "A single delivery team."
      documentation_url = "https://example.com/team-types/squad"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
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
        owner           = "alice-nguyen"
      }
    }
    library = {
      title             = "library"
      description       = "A shared library, not independently deployed."
      documentation_url = "https://example.com/component-types/library"
      is_external       = false
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }

  people = {
    alice-nguyen = {
      name                      = "Alice Nguyen"
      email                     = "alice.nguyen@example.com"
      primary_specialization    = "engineering-management"
      secondary_specializations = ["backend"]
      external_references       = { github_username = "anguyen" }
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-lead"
          title      = "Engineering Lead (Engineering Management) @ Acme HQ"
          start_date = "2024-01-01"
          end_date   = null
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
    bob-santos = {
      name                      = "Bob Santos"
      email                     = "bob.santos@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["platform"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title = ""
          start_date = "2024-03-01"
          end_date   = null
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
    carol-diaz = {
      name                      = "Carol Diaz"
      email                     = "carol.diaz@example.com"
      primary_specialization    = "frontend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title = ""
          start_date = "2024-06-01"
          end_date   = null
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

  roles = {
    platform-owner = {
      name              = "Platform Owner"
      description       = "Owns the platform team's components."
      documentation_url = "https://example.com/roles/platform-owner"
      components        = ["api", "web"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }

  teams = {
    acme-hq = {
      name                        = "Acme HQ"
      type                        = "department"
      description                 = "Root of the org hierarchy."
      documentation_url           = "https://example.com/teams/acme-hq"
      contact_email               = "acme-hq@example.com"
      parent_team                 = null
      head                        = "alice-nguyen"
      head_title                  = "Engineering Lead"
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
        owner           = "alice-nguyen"
      }
      is_hierarchical     = true
      is_cross_functional = false
      is_temporary        = false
    }
    platform = {
      name                        = "Platform"
      type                        = "squad"
      description                 = "Builds and operates shared platform components."
      documentation_url           = "https://example.com/teams/platform"
      contact_email               = "platform@example.com"
      parent_team                 = "acme-hq"
      head                        = "bob-santos"
      head_title                  = "Software Engineer"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = false
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = { github_team_slug = "platform" }
      members = [
        {
          person            = "bob-santos"
          role              = "platform-owner"
          title             = "Platform Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "carol-diaz"
          role              = "platform-owner"
          title             = "Platform Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        }
      ]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
      is_hierarchical     = false
      is_cross_functional = false
      is_temporary        = false
    }
  }

  authority_lines = {
    bob-tech-lead = {
      person            = "bob-santos"
      deputy            = null
      type              = "tech-lead"
      start_date        = "2024-03-01"
      end_date          = null
      teams             = ["platform"]
      documentation_url = ""
      is_interim        = false
      is_deputy_interim = null
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }

  components = {
    api = {
      name                  = "api"
      description           = "Platform's backend API service."
      documentation_url     = "https://example.com/components/api"
      team                  = "platform"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "service"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
    web = {
      name                  = "web"
      description           = "Platform's end-user-facing web app."
      documentation_url     = "https://example.com/components/web"
      team                  = "platform"
      dependency_components = ["api"]
      is_end_user_facing    = true
      type                  = "library"
      external_references   = { github_repo = "platform-web" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "alice-nguyen"
      }
    }
  }
}
