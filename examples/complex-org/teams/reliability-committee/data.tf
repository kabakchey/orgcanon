# Reliability Committee's own data: a temporary, cross-cutting committee under Cascadia (same
# "cuts across the hierarchy" placement as ../data-guild/data.tf). Deliberately head-only -- no
# members -- chaired by tariq-farouk, whose primary team is ../engineering/payments-squad/data.tf. The one
# case here of a person heading two teams at once (is_head_primary_team = false, since his
# primary-team slot is already satisfied by Payments Squad).
#
# tariq-farouk also holds two AuthorityLines at once: this headship pairs with a single-team
# security-champion line over ../design/data.tf, authored there since Design is its sole team
# in scope.
#
# Also owns this example's constant-watch-pattern duty component (contrast the recurring
# pattern in ../data-guild/data.tf) -- an on-call rotation fits this committee's "operational
# reliability" remit better than a fixed-cadence activity.

locals {
  teams = {
    reliability-committee = {
      name                        = "Reliability Committee"
      type                        = "committee"
      description                 = "Cross-team body reviewing incident response and operational reliability."
      documentation_url           = "https://example.com/teams/reliability-committee"
      contact_email               = "reliability-committee@example.com"
      parent_team                 = "cascadia"
      head                        = "tariq-farouk"
      head_title                  = "Committee Chair"
      head_deputy                 = null
      head_deputy_title           = null
      is_head_primary_team        = false
      is_head_deputy_primary_team = null
      is_head_interim             = false
      is_head_deputy_interim      = null
      external_references         = {}
      members                     = []
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Deliberately head-only: exists to demonstrate a second, non-primary headship for tariq-farouk (whose primary team is ../engineering/payments-squad/data.tf), not to add more people."
        owner           = "jordan-ade"
      }
      is_hierarchical     = false
      is_cross_functional = true
      is_temporary        = true
    }
  }

  people          = {}
  roles           = {}
  authority_lines = {}
  components = {
    oncall-watch-duty = {
      name                  = "Reliability On-Call Watch"
      description           = "Constant watch duty: standing on-call rotation for incident response."
      documentation_url     = "https://example.com/components/oncall-watch-duty"
      team                  = "reliability-committee"
      dependency_components = []
      is_end_user_facing    = false
      type                  = "duty"
      external_references   = {}
      reviewable = {
        expiration_date = "2027-01-01"
        notes           = "Constant-watch pattern of the duty component type -- contrast ../data-guild/data.tf's recurring-activity duty."
        owner           = "jordan-ade"
      }
    }
  }
}
