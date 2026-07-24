# Example data for examples/three-level-hierarchy/ -- org-wide type/category definitions:
# FormalPositionType, AuthorityLineType, TeamType, ComponentType. These are shared vocabulary,
# not any single team's data.

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
        owner           = "cto"
      }
    }
    vp-of-engineering = {
      title             = "VP of Engineering"
      level             = "vp"
      description       = "Owns engineering strategy and delivery across R&D."
      documentation_url = "https://example.com/growth/vp-engineering"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
    }
  }

  authority_line_types = {
    tech-lead = {
      title             = "Tech Lead"
      description       = "Gives technical direction for a team; not a formal management role."
      documentation_url = "https://example.com/authority-lines/tech-lead"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "cto"
      }
    }
  }

  team_types = {
    department    = { title = "department", description = "Permanent, cross-cutting org unit.", documentation_url = "https://example.com/team-types/department", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    platform      = { title = "platform", description = "Permanent team owning shared platform capabilities.", documentation_url = "https://example.com/team-types/platform", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    dev-team      = { title = "dev team", description = "Permanent product/feature delivery team.", documentation_url = "https://example.com/team-types/dev-team", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    organization  = { title = "organization", description = "Top-level permanent org unit.", documentation_url = "https://example.com/team-types/organization", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    squad         = { title = "squad", description = "Temporary or semi-permanent cross-functional delivery team.", documentation_url = "https://example.com/team-types/squad", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    guild         = { title = "guild", description = "Temporary community of practice.", documentation_url = "https://example.com/team-types/guild", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    chapter       = { title = "chapter", description = "Temporary discipline-aligned grouping.", documentation_url = "https://example.com/team-types/chapter", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    project       = { title = "project", description = "Temporary team scoped to a single initiative.", documentation_url = "https://example.com/team-types/project", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    committee     = { title = "committee", description = "Temporary decision-making body.", documentation_url = "https://example.com/team-types/committee", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    working-group = { title = "working group", description = "Temporary group formed to solve a specific problem.", documentation_url = "https://example.com/team-types/working-group", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
  }

  component_types = {
    repository     = { title = "repository", description = "A version-controlled source repository.", documentation_url = "https://example.com/component-types/repository", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    user-interface = { title = "user interface", description = "An end-user-facing UI surface.", documentation_url = "https://example.com/component-types/user-interface", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    service        = { title = "service", description = "A backend service or API.", documentation_url = "https://example.com/component-types/service", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    library        = { title = "library", description = "A shared code library.", documentation_url = "https://example.com/component-types/library", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
    database       = { title = "database", description = "A database or data store.", documentation_url = "https://example.com/component-types/database", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "cto" } }
  }
}
