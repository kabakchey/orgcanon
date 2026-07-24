# Example data for examples/complex-org/ -- org-wide type/category definitions:
# FormalPositionType, AuthorityLineType, TeamType, ComponentType. These are shared vocabulary,
# not any single team's data.

locals {
  formal_position_types = {
    chief-executive = {
      title             = "Chief Executive"
      level             = "c-suite"
      description       = "Owns the organization's overall direction."
      documentation_url = "https://example.com/growth/chief-executive"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    vp-of-engineering = {
      title             = "VP of Engineering"
      level             = "vp"
      description       = "Owns engineering strategy and delivery across Engineering."
      documentation_url = "https://example.com/growth/vp-engineering"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    engineering-manager = {
      title             = "Engineering Manager"
      level             = "manager"
      description       = "Leads a squad or dev team's delivery and its people."
      documentation_url = "https://example.com/growth/engineering-manager"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    staff-engineer = {
      title             = "Staff Engineer"
      level             = "staff"
      description       = "Senior individual contributor with cross-team technical scope."
      documentation_url = "https://example.com/growth/staff-engineer"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    software-engineer = {
      title             = "Software Engineer"
      level             = "mid"
      description       = "Builds and maintains software components."
      documentation_url = "https://example.com/growth/software-engineer"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    product-designer = {
      title             = "Product Designer"
      level             = "mid"
      description       = "Designs end-user-facing product surfaces."
      documentation_url = "https://example.com/growth/product-designer"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
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
        owner           = "jordan-ade"
      }
    }
    security-champion = {
      title             = "Security Champion"
      description       = "Advises one or more teams on secure-by-default practices; not a formal management role."
      documentation_url = "https://example.com/authority-lines/security-champion"
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }

  team_types = {
    organization  = { title = "organization", description = "Top-level permanent org unit.", documentation_url = "https://example.com/team-types/organization", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    department    = { title = "department", description = "Permanent, cross-cutting org unit.", documentation_url = "https://example.com/team-types/department", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    squad         = { title = "squad", description = "Temporary or semi-permanent cross-functional delivery team.", documentation_url = "https://example.com/team-types/squad", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    dev-team      = { title = "dev team", description = "Permanent product/feature delivery team.", documentation_url = "https://example.com/team-types/dev-team", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    guild         = { title = "guild", description = "Temporary community of practice.", documentation_url = "https://example.com/team-types/guild", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    platform      = { title = "platform", description = "Permanent team owning shared platform capabilities.", documentation_url = "https://example.com/team-types/platform", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    chapter       = { title = "chapter", description = "Temporary discipline-aligned grouping.", documentation_url = "https://example.com/team-types/chapter", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    project       = { title = "project", description = "Temporary team scoped to a single initiative.", documentation_url = "https://example.com/team-types/project", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    committee     = { title = "committee", description = "Temporary decision-making body.", documentation_url = "https://example.com/team-types/committee", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    working-group = { title = "working group", description = "Temporary group formed to solve a specific problem.", documentation_url = "https://example.com/team-types/working-group", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
  }

  component_types = {
    service        = { title = "service", description = "A backend service or API.", documentation_url = "https://example.com/component-types/service", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    database       = { title = "database", description = "A database or data store.", documentation_url = "https://example.com/component-types/database", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    library        = { title = "library", description = "A shared code library.", documentation_url = "https://example.com/component-types/library", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    user-interface = { title = "user interface", description = "An end-user-facing UI surface.", documentation_url = "https://example.com/component-types/user-interface", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    repository     = { title = "repository", description = "A version-controlled source repository.", documentation_url = "https://example.com/component-types/repository", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
    duty           = { title = "duty", description = "A recurring or standing operational responsibility a team owns, distinct from a piece of software. Two shapes: a recurring activity performed on a cadence (e.g. chairing a weekly release review) or a constant \"watch\" duty covering a standing rotation (e.g. an on-call schedule) with no fixed end. Not tied to any single repo/service -- name the artifact it protects, if any, via dependency_components.", documentation_url = "https://example.com/component-types/duty", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "jordan-ade" } }
  }
}
