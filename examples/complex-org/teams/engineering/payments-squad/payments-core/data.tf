# Payments Core's own data: a dev team under payments-squad (level 4 of 5), the deepest
# fan-out here -- head has 6 direct reports (head_deputy + 5 members), enough to make Chain of
# Command's fold-by-default subordinate tree worth collapsing.
#
# payments-api is deliberately a "hub" component: two direct deps (payments-db, cross-team
# identity-api) AND two direct dependees (payments-worker, ../payments-growth/data.tf's
# payments-growth-api) -- a good first pick for Component Dependencies. payments-worker's dep
# on shared-auth-lib (./payments-core-infra/data.tf, this team's child) is a second cross-team
# edge, parent depending on child.
#
# amara-obi is also a SECONDARY member of ../../../data-guild/data.tf -- the one
# "membership-secondary:" edge in this example; here, as her primary team, she's normal.
#
# ines-almeida holds TWO Roles on this team -- a second `members` row (same person/team,
# different role: api-owner plus oncall-lead), not a second membership. Both rows agree on
# is_primary_team = true.
# oncall-lead has components = [] (same shape as core-engineer/guild-member), so this is one
# person owning a component AND holding a second, non-component-owning role.
#
# Three interim examples live here: rosa-hidalgo's head_deputy-ship is interim
# (is_head_deputy_interim); felix-bergman's worker-owner row is interim (is_interim); and
# victor-nakamura's db-owner row has zoe-castellanos standing in as an interim deputy
# (deputy set, is_deputy_interim).

locals {
  teams = {
    payments-core = {
      name                        = "Payments Core"
      type                        = "dev-team"
      description                 = "Owns the core payments API, its datastore, and async processing."
      documentation_url           = "https://example.com/teams/payments-core"
      contact_email               = "payments-core@example.com"
      parent_team                 = "payments-squad"
      head                        = "leo-tanaka"
      head_title                  = "Engineering Manager"
      head_deputy                 = "rosa-hidalgo"
      head_deputy_title           = "Deputy Engineering Manager"
      is_head_primary_team        = true
      is_head_deputy_primary_team = true
      is_head_interim             = false
      is_head_deputy_interim      = true
      external_references         = { github_team_slug = "payments-core" }
      members = [
        {
          person            = "ines-almeida"
          role              = "api-owner"
          title             = "API Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "ines-almeida"
          role              = "oncall-lead"
          title             = "On-Call Lead"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "victor-nakamura"
          role              = "db-owner"
          title             = "Database Owner"
          is_primary_team   = true
          deputy            = "zoe-castellanos"
          is_interim        = false
          is_deputy_interim = true
        },
        {
          person            = "felix-bergman"
          role              = "worker-owner"
          title             = "Worker Owner"
          is_primary_team   = true
          deputy            = null
          is_interim        = true
          is_deputy_interim = null
        },
        {
          person            = "amara-obi"
          role              = "core-engineer"
          title             = "Software Engineer"
          is_primary_team   = true
          deputy            = null
          is_interim        = false
          is_deputy_interim = null
        },
        {
          person            = "zoe-castellanos"
          role              = "core-engineer"
          title             = "Software Engineer"
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
    leo-tanaka = {
      name                      = "Leo Tanaka"
      email                     = "leo.tanaka@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = ["backend"]
      external_references       = {}
      documentation_url         = "https://example.com/people/leo-tanaka"
      positions = [
        {
          type       = "engineering-manager"
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
        notes           = "line_manager derived: heads Payments Core, whose parent is Payments Squad -> reports to tariq-farouk. Has 6 direct reports (head_deputy + 5 members) -- the deepest fan-out in this example."
        owner           = "jordan-ade"
      }
    }

    rosa-hidalgo = {
      name                      = "Rosa Hidalgo"
      email                     = "rosa.hidalgo@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-04-01"
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
        notes           = "line_manager derived: Payments Core's head_deputy -> reports to leo-tanaka."
        owner           = "jordan-ade"
      }
    }

    ines-almeida = {
      name                      = "Ines Almeida"
      email                     = "ines.almeida@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = { github_accountname = "inesalmeida" }
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-06-01"
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
        notes           = "line_manager derived: primary team is Payments Core -> reports to leo-tanaka. Holds TWO Roles on this one team (api-owner and oncall-lead, both is_primary_team = true) -- see this file's top comment."
        owner           = "jordan-ade"
      }
    }

    victor-nakamura = {
      name                      = "Victor Nakamura"
      email                     = "victor.nakamura@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["data-eng"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-07-01"
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
        notes           = "line_manager derived: primary team is Payments Core -> reports to leo-tanaka."
        owner           = "jordan-ade"
      }
    }

    felix-bergman = {
      name                      = "Felix Bergman"
      email                     = "felix.bergman@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = ""
          start_date = "2022-08-01"
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
        notes           = "line_manager derived: primary team is Payments Core -> reports to leo-tanaka."
        owner           = "jordan-ade"
      }
    }

    amara-obi = {
      name                      = "Amara Obi"
      email                     = "amara.obi@example.com"
      primary_specialization    = "backend"
      secondary_specializations = ["security"]
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = "Software Engineer (Backend) * Payments Core | Payments Squad | Engineering, secondary member of Data Guild"
          start_date = "2022-09-15"
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
        notes           = "line_manager derived: primary team is Payments Core -> reports to leo-tanaka. Also a SECONDARY (is_primary_team = false) member of ../../../data-guild/data.tf -- does not affect line management, which only ever looks at the primary-team row."
        owner           = "jordan-ade"
      }
    }

    zoe-castellanos = {
      name                      = "Zoe Castellanos"
      email                     = "zoe.castellanos@example.com"
      primary_specialization    = "backend"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "software-engineer"
          title      = "Software Engineer (Backend) * Payments Core | Payments Squad | Engineering"
          start_date = "2023-01-10"
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
        notes           = "line_manager derived: primary team is Payments Core -> reports to leo-tanaka."
        owner           = "jordan-ade"
      }
    }
  }

  roles = {
    api-owner = {
      name              = "API Owner"
      description       = "Owns the core payments API."
      documentation_url = "https://example.com/roles/api-owner"
      components        = ["payments-api"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    db-owner = {
      name              = "Database Owner"
      description       = "Owns the payments datastore."
      documentation_url = "https://example.com/roles/db-owner"
      components        = ["payments-db"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    worker-owner = {
      name              = "Worker Owner"
      description       = "Owns async/background payments processing."
      documentation_url = "https://example.com/roles/worker-owner"
      components        = ["payments-worker"]
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    core-engineer = {
      name              = "Core Engineer"
      description       = "Contributes across Payments Core without owning one specific component."
      documentation_url = "https://example.com/roles/core-engineer"
      components        = []
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = ""
        owner           = "jordan-ade"
      }
    }
    oncall-lead = {
      name              = "On-Call Lead"
      description       = "Coordinates Payments Core's on-call rotation; not scoped to one owned component."
      documentation_url = "https://example.com/roles/oncall-lead"
      components        = []
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "ines-almeida's second Role on this team, alongside api-owner -- see this file's top comment."
        owner           = "jordan-ade"
      }
    }
  }

  authority_lines = {}

  components = {
    payments-api = {
      name                  = "Payments API"
      description           = "Core payments processing service."
      documentation_url     = "https://example.com/components/payments-api"
      team                  = "payments-core"
      dependency_components = ["payments-db", "identity-api"]
      is_end_user_facing    = false
      type                  = "service"
      external_references   = { github_repo = "cascadia-payments-api" }
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Hub component: 2 direct dependencies (one cross-team, identity-api) and 2 direct dependees (payments-worker here, payments-growth-api in ../payments-growth/data.tf)."
        owner           = "jordan-ade"
      }
    }

    payments-db = {
      name                  = "Payments DB"
      description           = "Primary datastore for payment records."
      documentation_url     = "https://example.com/components/payments-db"
      team                  = "payments-core"
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

    payments-worker = {
      name                  = "Payments Worker"
      description           = "Async/background payments processing."
      documentation_url     = "https://example.com/components/payments-worker"
      team                  = "payments-core"
      dependency_components = ["payments-api", "shared-auth-lib"]
      is_end_user_facing    = false
      type                  = "service"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Cross-team dependency on shared-auth-lib, owned by this team's own child team ./payments-core-infra/data.tf."
        owner           = "jordan-ade"
      }
    }
  }
}
