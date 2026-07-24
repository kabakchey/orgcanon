# Payments Squad's own data: pure hierarchy pass-through, same pattern as
# ../data.tf -- owns nothing directly, so Team Components' direct mode is zero here
# while indirect aggregates payments-core, payments-core-infra (grandchild), and
# payments-growth.
#
# tariq-farouk is this example's "many hats" person: heads this team (primary), chairs
# ../../reliability-committee/data.tf (non-primary), and holds a security-champion AuthorityLine
# over ../../design/data.tf (authored there, see that file). None of this shows in his position
# title -- the naming convention only encodes the primary team (same as
# ../../data-guild/data.tf's iris-navarro).

locals {
  teams = {
    payments-squad = {
      name                        = "Payments Squad"
      type                        = "squad"
      description                 = "Owns payments processing across its dev teams."
      documentation_url           = "https://example.com/teams/payments-squad"
      contact_email               = "payments-squad@example.com"
      parent_team                 = "engineering"
      head                        = "tariq-farouk"
      head_title                  = "Squad Lead"
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
        owner           = "jordan-ade"
      }
      is_hierarchical     = false
      is_cross_functional = true
      is_temporary        = false
    }
  }

  people = {
    tariq-farouk = {
      name                      = "Tariq Farouk"
      email                     = "tariq.farouk@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = ""
      positions = [
        {
          type       = "engineering-manager"
          title      = ""
          start_date = "2022-01-01"
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
        notes           = "line_manager derived: heads Payments Squad, whose parent is Engineering -> reports to priya-shah. Also chairs ../../reliability-committee/data.tf (second, non-primary headship) and holds a security-champion AuthorityLine over ../../design/data.tf (authored there) -- this example's one person holding two headships and two AuthorityLines at once."
        owner           = "jordan-ade"
      }
    }
  }

  roles           = {}
  authority_lines = {}
  components      = {}
}
