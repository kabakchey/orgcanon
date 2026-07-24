# Engineering's own data: pure hierarchy pass-through -- no members/roles/authority_lines/
# components, same as ../../../three-level-hierarchy/teams/r-and-d/data.tf -- exists to
# demonstrate Team Components' indirect mode aggregating payments-squad/identity-squad several
# generations down.

locals {
  teams = {
    engineering = {
      name                        = "Engineering"
      type                        = "department"
      description                 = "Owns product engineering across payments and identity."
      documentation_url           = "https://example.com/teams/engineering"
      contact_email               = "engineering@example.com"
      parent_team                 = "cascadia"
      head                        = "priya-shah"
      head_title                  = "VP of Engineering"
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
      is_hierarchical     = true
      is_cross_functional = false
      is_temporary        = false
    }
  }

  people = {
    priya-shah = {
      name                      = "Priya Shah"
      email                     = "priya.shah@example.com"
      primary_specialization    = "engineering-leadership"
      secondary_specializations = []
      external_references       = {}
      documentation_url         = "https://example.com/people/priya-shah"
      positions = [
        {
          type       = "vp-of-engineering"
          title      = ""
          start_date = "2021-03-01"
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
        notes           = "line_manager derived: heads Engineering, whose parent is Cascadia -> reports to jordan-ade."
        owner           = "jordan-ade"
      }
    }
  }

  roles           = {}
  authority_lines = {}
  components      = {}
}
