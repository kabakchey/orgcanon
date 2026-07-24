# Data Guild's own data: a cross-cutting, temporary community of practice directly under
# Cascadia (sibling of Engineering/Design -- guilds cut across the reporting hierarchy rather
# than living inside it). Its one member row is deliberately SECONDARY (is_primary_team =
# false): amara-obi's primary team is ../engineering/payments-squad/payments-core/data.tf -- the one
# "membership-secondary:" edge in this example.
#
# Its head, Iris Navarro, also holds the security-champion AuthorityLine below, spanning
# payments-squad AND identity-squad at once -- the only multi-team AuthorityLine in these
# examples.
#
# Also owns this example's recurring-pattern duty component (contrast the constant-watch
# pattern in ../reliability-committee/data.tf) -- a guild/community-of-practice cadence fits
# the recurring shape better than a standing rotation.

locals {
  teams = {
    data-guild = {
      name                        = "Data Guild"
      type                        = "guild"
      description                 = "Cross-team community of practice for data handling and security practices."
      documentation_url           = "https://example.com/teams/data-guild"
      contact_email               = "data-guild@example.com"
      parent_team                 = "cascadia"
      head                        = "iris-navarro"
      head_title                  = "Guild Lead"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = true
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = {}
      members = [
        {
          person            = "amara-obi"
          role              = "guild-member"
          title             = "Guild Member"
          is_primary_team   = false
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
      is_cross_functional = true
      is_temporary        = true
    }
  }

  people = {
    iris-navarro = {
      name                      = "Iris Navarro"
      email                     = "iris.navarro@example.com"
      primary_specialization    = "security"
      secondary_specializations = ["backend"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "staff-engineer"
          title      = ""
          start_date = "2022-09-01"
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
        notes           = "line_manager derived: heads Data Guild, whose parent is Cascadia -> reports to jordan-ade. Also holds a two-team AuthorityLine below -- distinct from formal line management."
        owner           = "jordan-ade"
      }
    }
  }

  roles = {
    guild-member = {
      name              = "Guild Member"
      description       = "Participates in Data Guild without owning a component through it."
      documentation_url = "https://example.com/roles/guild-member"
      components        = []
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }
  components = {
    data-quality-review-duty = {
      name                  = "Weekly Data Quality Review"
      description           = "Recurring duty: chairs the weekly cross-team data quality review."
      documentation_url     = "https://example.com/components/data-quality-review-duty"
      team                  = "data-guild"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "duty"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Recurring-activity pattern of the duty component type -- contrast ../reliability-committee/data.tf's constant watch duty."
        owner           = "jordan-ade"
      }
    }
  }

  authority_lines = {
    iris-navarro-security-champion = {
      person            = "iris-navarro"
      deputy            = "elena-popov"
      type              = "security-champion"
      start_date        = "2023-04-01"
      end_date          = null
      teams             = ["payments-squad", "identity-squad"]
      documentation_url = ""
      is_interim        = false
      is_deputy_interim = true
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Functional/advisory authority spanning two sibling squads at once -- not line management. elena-popov's deputy-ship is interim."
        owner           = "jordan-ade"
      }
    }
  }
}
