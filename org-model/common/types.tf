# Org-wide type/category definitions: FormalPositionType, AuthorityLineType, TeamType,
# ComponentType -- shared vocabulary, not any single team's data (see CONTEXT.md). No team may
# unilaterally add a category here: owned by people-ops, not platform (.github/CODEOWNERS,
# docs/architecture.md's "Key design decisions").

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
        owner           = "replace-me"
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
        owner           = "replace-me"
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
        owner           = "replace-me"
      }
    }
  }

  team_types = {
    department    = { title = "department", description = "Permanent, cross-cutting org unit.", documentation_url = "https://example.com/team-types/department", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    platform      = { title = "platform", description = "Permanent team owning shared platform capabilities.", documentation_url = "https://example.com/team-types/platform", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    dev-team      = { title = "dev team", description = "Permanent product/feature delivery team.", documentation_url = "https://example.com/team-types/dev-team", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    organization  = { title = "organization", description = "Top-level permanent org unit.", documentation_url = "https://example.com/team-types/organization", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    squad         = { title = "squad", description = "Temporary or semi-permanent cross-functional delivery team.", documentation_url = "https://example.com/team-types/squad", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    guild         = { title = "guild", description = "Temporary community of practice.", documentation_url = "https://example.com/team-types/guild", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    chapter       = { title = "chapter", description = "Temporary discipline-aligned grouping.", documentation_url = "https://example.com/team-types/chapter", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    project       = { title = "project", description = "Temporary team scoped to a single initiative.", documentation_url = "https://example.com/team-types/project", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    committee     = { title = "committee", description = "Temporary decision-making body.", documentation_url = "https://example.com/team-types/committee", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    working-group = { title = "working group", description = "Temporary group formed to solve a specific problem.", documentation_url = "https://example.com/team-types/working-group", reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
  }

  component_types = {
    repository     = { title = "repository", description = "A version-controlled source repository.", documentation_url = "https://example.com/component-types/repository", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    user-interface = { title = "user interface", description = "An end-user-facing UI surface.", documentation_url = "https://example.com/component-types/user-interface", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    service        = { title = "service", description = "A backend service or API.", documentation_url = "https://example.com/component-types/service", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    library        = { title = "library", description = "A shared code library.", documentation_url = "https://example.com/component-types/library", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    database       = { title = "database", description = "A database or data store.", documentation_url = "https://example.com/component-types/database", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    duty           = { title = "duty", description = "A recurring or standing operational responsibility a team owns, distinct from a piece of software. Two shapes: a recurring activity performed on a cadence (e.g. chairing a weekly release review) or a constant \"watch\" duty covering a standing rotation (e.g. an on-call schedule) with no fixed end. Not tied to any single repo/service -- name the artifact it protects, if any, via dependency_components.", documentation_url = "https://example.com/component-types/duty", is_external = false, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }

    # External components/consumers: team means "accountable for tracking this dependency," not
    # "built/owns the artifact." Ownership is decentralized -- whichever team sits on the org's
    # side of the relationship (the consuming team for a 3rd-party dependency, the API-owning
    # team for an external consumer), never a centralized vendor/partnerships team.
    third-party-api     = { title = "third-party API", description = "An API operated by an external vendor/provider that a team consumes. team is the team accountable for tracking the dependency, not its operator.", documentation_url = "https://example.com/component-types/third-party-api", is_external = true, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    third-party-library = { title = "third-party library", description = "A library/package published by an external vendor that a team's code depends on. team is the team accountable for tracking the dependency, not its publisher.", documentation_url = "https://example.com/component-types/third-party-library", is_external = true, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
    external-consumer   = { title = "external consumer", description = "A non-org-owned application or integration that consumes a component this org exposes (e.g. a partner's app calling one of our APIs). team is the org's own API-owning team, not the consumer's operator -- named via dependency_components pointing at the API it consumes.", documentation_url = "https://example.com/component-types/external-consumer", is_external = true, reviewable = { expiration_date = "2027-01-01", notes = "", owner = "replace-me" } }
  }
}
