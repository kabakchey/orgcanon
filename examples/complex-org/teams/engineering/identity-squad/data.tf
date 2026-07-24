# Identity Squad's own data: sibling of payments-squad under Engineering, a leaf squad (direct
# and indirect Team Components views are identical) owning two independent component groups:
#   - identity-api -> identity-db: a two-hop chain, and the cross-team dependency TARGET for
#     ../payments-squad/payments-core/data.tf's payments-api.
#   - notification-service -> event-bus -> audit-log -> notification-service: a deliberate
#     3-component CYCLE, and the one live example exercising that path end-to-end, not just
#     unit tests.
# Also holds a single-team tech-lead AuthorityLine (contrast ../../data-guild/data.tf's two-team
# security-champion, which also names this team).

locals {
  teams = {
    identity-squad = {
      name                        = "Identity Squad"
      type                        = "squad"
      description                 = "Owns identity, auth, and account notifications."
      documentation_url           = "https://example.com/teams/identity-squad"
      contact_email               = "identity-squad@example.com"
      parent_team                 = "engineering"
      head                        = "elena-popov"
      head_title                  = "Squad Lead"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = true
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = { github_team_slug = "identity-squad" }
      members = [
        {
          person            = "sam-okafor"
          role              = "identity-owner"
          title             = "Identity Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "dana-kowalski"
          role              = "events-owner"
          title             = "Events Owner"
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
      is_cross_functional = true
      is_temporary        = false
    }
  }

  people = {
    elena-popov = {
      name                      = "Elena Popov"
      email                     = "elena.popov@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-manager"
          title      = ""
          start_date = "2022-01-15"
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
        notes           = "line_manager derived: heads Identity Squad, whose parent is Engineering -> reports to priya-shah. Also the deputy on ../../data-guild/data.tf's iris-navarro-security-champion AuthorityLine."
        owner           = "jordan-ade"
      }
    }

    sam-okafor = {
      name                      = "Sam Okafor"
      email                     = "sam.okafor@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["security"]
      external_references       = { github_accountname = "samokafor" }
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-03-01"
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
        notes           = "line_manager derived: primary team is Identity Squad -> reports to elena-popov. Holds the single-team tech-lead AuthorityLine below."
        owner           = "jordan-ade"
      }
    }

    dana-kowalski = {
      name                      = "Dana Kowalski"
      email                     = "dana.kowalski@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-05-01"
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
        notes           = "line_manager derived: primary team is Identity Squad -> reports to elena-popov."
        owner           = "jordan-ade"
      }
    }
  }

  roles = {
    identity-owner = {
      name              = "Identity Owner"
      description       = "Owns identity and account data services."
      documentation_url = "https://example.com/roles/identity-owner"
      components        = ["identity-api", "identity-db"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    events-owner = {
      name              = "Events Owner"
      description       = "Owns the notification/event pipeline, including its dependency cycle."
      documentation_url = "https://example.com/roles/events-owner"
      components        = ["notification-service", "event-bus", "audit-log"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
  }

  authority_lines = {
    sam-okafor-tech-lead = {
      person            = "sam-okafor"
      deputy            = null
      type              = "tech-lead"
      start_date        = "2023-01-01"
      end_date          = null
      teams             = ["identity-squad"]
      documentation_url = ""
      is_interim        = true
      is_deputy_interim = null
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Functional/advisory authority only -- not line management. sam-okafor's tech-lead line is interim."
        owner           = "jordan-ade"
      }
    }
  }

  components = {
    identity-api = {
      name                  = "Identity API"
      description           = "Authentication and account identity service."
      documentation_url     = "https://example.com/components/identity-api"
      team                  = "identity-squad"
      dependency_components = ["identity-db"]
      is_end_user_facing    = false
      type                  = "service"
      external_references   = { github_repo = "cascadia-identity-api" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Cross-team dependency TARGET of ../payments-squad/payments-core/data.tf's payments-api."
        owner           = "jordan-ade"
      }
    }

    identity-db = {
      name                  = "Identity DB"
      description           = "Primary datastore for accounts and credentials."
      documentation_url     = "https://example.com/components/identity-db"
      team                  = "identity-squad"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "database"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }

    notification-service = {
      name                  = "Notification Service"
      description           = "Sends account notifications; part of a deliberate 3-way dependency cycle."
      documentation_url     = "https://example.com/components/notification-service"
      team                  = "identity-squad"
      dependency_components = ["event-bus"]
      is_end_user_facing    = false
      type                  = "service"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Part of a deliberate cycle: notification-service -> event-bus -> audit-log -> notification-service."
        owner           = "jordan-ade"
      }
    }

    event-bus = {
      name                  = "Event Bus"
      description           = "Internal event bus used for account/notification events; part of a deliberate 3-way dependency cycle."
      documentation_url     = "https://example.com/components/event-bus"
      team                  = "identity-squad"
      dependency_components = ["audit-log"]
      is_end_user_facing    = false
      type                  = "service"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Part of a deliberate cycle: notification-service -> event-bus -> audit-log -> notification-service."
        owner           = "jordan-ade"
      }
    }

    audit-log = {
      name                  = "Audit Log"
      description           = "Durable audit trail for identity/notification events; part of a deliberate 3-way dependency cycle."
      documentation_url     = "https://example.com/components/audit-log"
      team                  = "identity-squad"
      dependency_components = ["notification-service"]
      is_end_user_facing    = false
      type                  = "database"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Closes the cycle: notification-service -> event-bus -> audit-log -> notification-service."
        owner           = "jordan-ade"
      }
    }
  }
}
