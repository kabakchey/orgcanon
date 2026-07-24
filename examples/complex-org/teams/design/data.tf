# Design's own data: a shallow sibling branch to Engineering (directly under Cascadia, no
# squads/dev-teams beneath it) -- contrasts with Engineering's deep branch. Owns one component
# with zero deps/dependees, so Team Components' direct/indirect modes are identical here and
# Component Dependencies has a genuinely isolated node to select.
#
# Also hosts the one single-team AuthorityLine held by someone outside this team: tariq-farouk
# (primary team ../engineering/payments-squad/data.tf) is Design's security-champion, authored here because
# a single-team AuthorityLine's LCA is that one team itself -- contrast ../data-guild/data.tf's
# two-team span, authored under its LCA instead.
#
# noah-becker's headship is interim (is_head_interim).

locals {
  teams = {
    design = {
      name                        = "Design"
      type                        = "department"
      description                 = "Owns product design and the shared design system."
      documentation_url           = "https://example.com/teams/design"
      contact_email               = "design@example.com"
      parent_team                 = "cascadia"
      head                        = "noah-becker"
      head_title                  = "Design Lead"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = true
      is_head_deputy_primary_team = null
      is_head_interim             = true
      is_head_deputy_interim      = null
      external_references         = {}
      members = [
        {
          person            = "maya-lindqvist"
          role              = "design-owner"
          title             = "Product Designer"
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
      is_hierarchical     = true
      is_cross_functional = false
      is_temporary        = false
    }
  }

  people = {
    noah-becker = {
      name                      = "Noah Becker"
      email                     = "noah.becker@example.com"
      primary_specialization    = "design-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = "https://example.com/people/noah-becker"
      positions = [
        {
          type       = "engineering-manager"
          title      = ""
          start_date = "2021-06-01"
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
        notes           = "line_manager derived: heads Design, whose parent is Cascadia -> reports to jordan-ade."
        owner           = "jordan-ade"
      }
    }

    maya-lindqvist = {
      name                      = "Maya Lindqvist"
      email                     = "maya.lindqvist@example.com"
      primary_specialization    = "product-design"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "product-designer"
          title      = ""
          start_date = "2022-02-01"
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
        notes           = "line_manager derived: primary team is Design -> reports to noah-becker."
        owner           = "jordan-ade"
      }
    }
  }

  roles = {
    design-owner = {
      name              = "Design Owner"
      description       = "Owns the shared design system."
      documentation_url = "https://example.com/roles/design-owner"
      components        = ["design-system"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }

  authority_lines = {
    tariq-farouk-security-champion = {
      person            = "tariq-farouk"
      deputy            = null
      type              = "security-champion"
      start_date        = "2023-06-01"
      end_date          = null
      teams             = ["design"]
      documentation_url = ""
      is_interim        = false
      is_deputy_interim = null
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Functional/advisory authority only -- not line management. tariq-farouk's primary team is ../engineering/payments-squad/data.tf, and he also chairs ../reliability-committee/data.tf -- this is his second AuthorityLine-shaped hat on top of his second headship."
        owner           = "jordan-ade"
      }
    }
  }

  components = {
    design-system = {
      name                  = "Design System"
      description           = "Shared design tokens and component library for product surfaces."
      documentation_url     = "https://example.com/components/design-system"
      team                  = "design"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "library"
      external_references   = { github_repo = "cascadia-design-system" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Deliberately isolated: zero dependencies and zero dependees, unlike every other component in this example."
        owner           = "jordan-ade"
      }
    }
  }
}
