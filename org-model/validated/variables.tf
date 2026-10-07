# OrgCanon schema and validation logic -- see README.md for the project overview.
# No providers/resources on purpose -- see docs/architecture.md's "Key design decisions".
# Isolated in its own module so `variable` blocks (which can't self-reference a `local`) can
# receive merged/computed values as module inputs from ../main.tf; real org data lives in
# ../common/ and ../teams/<team>/ -- see CONTEXT.md.
#
# `terraform validate` only checks syntax/types, not the `validation` blocks below against real
# data (confirmed by testing). To enforce invariants, run from `org-model/`: `terraform plan` or
# `terraform console`.
#
# Conventions:
# - every entity is map(object(...)) keyed by a human-readable Entity ID
# - `reviewable` is repeated inline per entity -- HCL has no type inheritance
# - date fields are `string` (ISO-8601) -- HCL has no date primitive
# - Person.line_manager doesn't exist here -- it's derived, not stored
#
# title/level fields (formal_position_types.title/level, authority_line_types.title,
# team_types.title, component_types.title) stay freeform/unenforced on purpose -- a hard enum
# would break the extensibility they're meant to signal; see docs/invariants.md "Deliberately
# NOT validated". teams.type/components.type ARE existence-checked, just not enum-checked.

variable "formal_position_types" {
  description = "Job title/level definitions (FormalPositionType)"
  type = map(object({
    title             = string # e.g. "Software Engineer", "Engineering Manager"
    level             = string # junior, mid, senior, staff, principal?
    description       = string
    documentation_url = string
    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition     = alltrue([for id in keys(var.formal_position_types) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "formal_position_types keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, t in var.formal_position_types : can(timeadd("${t.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "formal_position_types[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }
}

variable "roles" {
  description = "Component/area-of-responsibility ownership within a team (Role). Never leadership."
  type = map(object({
    name              = string
    description       = string
    documentation_url = string
    components        = list(string) # Entity IDs into var.components
    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition = alltrue(flatten([
      for id, r in var.roles : [
        for c in r.components : contains(keys(var.components), c)
      ]
    ]))
    error_message = "roles.components entries must reference existing keys in var.components."
  }

  validation {
    condition     = alltrue([for id in keys(var.roles) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "roles keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, r in var.roles : contains(keys(var.people), r.reviewable.owner)])
    error_message = "roles[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, r in var.roles : !contains(local.departed_person_ids, r.reviewable.owner)])
    error_message = "roles[*].reviewable.owner must reference a person who has not departed."
  }

  validation {
    condition     = alltrue([for id, r in var.roles : can(timeadd("${r.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "roles[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }
}

variable "people" {
  description = "Person. No line_manager field -- derived."
  type = map(object({
    name                      = string
    email                     = string
    primary_specialization    = string
    secondary_specializations = list(string)
    external_references       = map(string) # e.g. { github_accountname = "bblabla" }; key names: docs/external-references.md
    documentation_url         = string      # link to the personal profile or similar

    positions = list(object({
      type = string # Entity ID into var.formal_position_types
      # Naming convention (unenforced, see docs/invariants.md "Deliberately NOT validated"):
      # "<formal position title> (<primary specialization>) * <team title with primary role> @
      # <primary team> | <parent team> | <grandparent team>"
      title      = string
      start_date = string
      end_date   = optional(string)
      reviewable = object({
        expiration_date = string
        notes           = string
        owner           = string # Entity ID into var.people
      })
    }))

    # Namespaced storage for other systems' data (HR, Finance, ...), keyed by domain; each
    # domain owns its own shape independently of this schema, e.g. extensions["hr"] = {...}.
    extensions = map(map(string))

    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : contains(keys(var.formal_position_types), pos.type)
      ]
    ]))
    error_message = "people.positions[*].type must reference an existing key in var.formal_position_types."
  }

  validation {
    condition     = alltrue([for id in keys(var.people) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "people keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    # Non-empty positions is what makes "departed" well-defined below (empty would be
    # ambiguous: never hired, or hired but unrecorded).
    condition     = alltrue([for id, p in var.people : length(p.positions) > 0])
    error_message = "people[*].positions must not be empty -- every person must have at least one position."
  }

  validation {
    condition     = length(distinct([for id, p in var.people : p.email])) == length(var.people)
    error_message = "people[*].email must be unique across all people."
  }

  validation {
    condition     = alltrue([for id, p in var.people : can(timeadd("${p.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "people[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : can(timeadd("${pos.start_date}T00:00:00Z", "0s"))
      ]
    ]))
    error_message = "people[*].positions[*].start_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : pos.end_date == null || can(timeadd("${pos.end_date}T00:00:00Z", "0s"))
      ]
    ]))
    error_message = "people[*].positions[*].end_date must be a valid ISO-8601 date (YYYY-MM-DD), if set."
  }

  validation {
    # HCL's <=/>= only work on numbers; ISO-8601 dates sort correctly as strings but `<=` on
    # strings is a hard error (confirmed via `terraform plan`), hence timecmp() + the
    # "${...}T00:00:00Z" suffix. `? :` instead of `||`: `||` isn't lazy in HCL, so
    # `pos.end_date == null || timecmp(...)` would still evaluate timecmp() on a null end_date.
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : pos.end_date == null ? true : timecmp("${pos.start_date}T00:00:00Z", "${pos.end_date}T00:00:00Z") <= 0
      ]
    ]))
    error_message = "people[*].positions[*].start_date must be on or before end_date, when end_date is set."
  }

  validation {
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : can(timeadd("${pos.reviewable.expiration_date}T00:00:00Z", "0s"))
      ]
    ]))
    error_message = "people[*].positions[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, p in var.people : contains(keys(var.people), p.reviewable.owner)])
    error_message = "people[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : contains(keys(var.people), pos.reviewable.owner)
      ]
    ]))
    error_message = "people[*].positions[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    # Hosted on `people` (not `formal_position_types`) to avoid a direct 2-cycle
    # (formal_position_types -> people -> formal_position_types); people already depends on
    # formal_position_types via the positions[*].type check above.
    condition     = alltrue([for id, t in var.formal_position_types : contains(keys(var.people), t.reviewable.owner)])
    error_message = "formal_position_types[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    # Can't use local.departed_person_ids here -- it's derived from var.people, so referencing
    # it from inside people's own validation is a real cycle (confirmed by testing); the
    # predicate is inlined instead. `? :` not `||`, for the same laziness reason as above.
    condition = alltrue([
      for id, p in var.people : anytrue([
        for pos in var.people[p.reviewable.owner].positions :
        pos.end_date == null ? true : timecmp("${pos.end_date}T00:00:00Z", "${local.today}T00:00:00Z") >= 0
      ])
    ])
    error_message = "people[*].reviewable.owner must reference a person who has not departed."
  }

  validation {
    condition = alltrue(flatten([
      for id, p in var.people : [
        for pos in p.positions : anytrue([
          for owner_pos in var.people[pos.reviewable.owner].positions :
          owner_pos.end_date == null ? true : timecmp("${owner_pos.end_date}T00:00:00Z", "${local.today}T00:00:00Z") >= 0
        ])
      ]
    ]))
    error_message = "people[*].positions[*].reviewable.owner must reference a person who has not departed."
  }

  validation {
    # Hosted here for the same reason the existence check above is -- see that check's comment.
    condition = alltrue([
      for id, t in var.formal_position_types : anytrue([
        for pos in var.people[t.reviewable.owner].positions :
        pos.end_date == null ? true : timecmp("${pos.end_date}T00:00:00Z", "${local.today}T00:00:00Z") >= 0
      ])
    ])
    error_message = "formal_position_types[*].reviewable.owner must reference a person who has not departed."
  }
}

variable "authority_line_types" {
  description = "Category definitions for AuthorityLine (AuthorityLineType). Mirrors FormalPositionType."
  type = map(object({
    title             = string # e.g. "Mentor", "Tech Lead", "Scrum Master"
    description       = string
    documentation_url = string
    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition     = alltrue([for id in keys(var.authority_line_types) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "authority_line_types keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, t in var.authority_line_types : can(timeadd("${t.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "authority_line_types[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, t in var.authority_line_types : contains(keys(var.people), t.reviewable.owner)])
    error_message = "authority_line_types[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, t in var.authority_line_types : !contains(local.departed_person_ids, t.reviewable.owner)])
    error_message = "authority_line_types[*].reviewable.owner must reference a person who has not departed."
  }
}

variable "authority_lines" {
  description = "Functional/advisory leadership (AuthorityLine). Never formal line-management."
  type = map(object({
    person     = string           # Entity ID into var.people
    deputy     = optional(string) # Entity ID into var.people
    type       = string           # Entity ID into var.authority_line_types
    start_date = string
    end_date   = optional(string)
    teams      = list(string) # Entity IDs into var.teams; often length 1

    documentation_url = string

    # Whether the person's/deputy's holding of this authority line is a temporary stand-in
    # rather than a permanent appointment.
    is_interim        = bool
    is_deputy_interim = optional(bool) # null iff deputy is null

    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition     = alltrue([for id, a in var.authority_lines : contains(keys(var.people), a.person)])
    error_message = "authority_lines.person must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : !contains(local.departed_person_ids, a.person)])
    error_message = "authority_lines.person must reference a person who has not departed."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : contains(keys(var.authority_line_types), a.type)])
    error_message = "authority_lines.type must reference an existing key in var.authority_line_types."
  }

  validation {
    # `? :` rather than `a.deputy == null || contains(...)`: contains() errors on a null
    # argument -- see the timecmp comment on people[*].positions[*] above for why `||` doesn't
    # short-circuit around that.
    condition     = alltrue([for id, a in var.authority_lines : a.deputy == null ? true : contains(keys(var.people), a.deputy)])
    error_message = "authority_lines.deputy must reference an existing key in var.people, if set."
  }

  validation {
    # `? :` rather than `a.deputy == null || !contains(...)` -- same laziness issue as above.
    condition     = alltrue([for id, a in var.authority_lines : a.deputy == null ? true : !contains(local.departed_person_ids, a.deputy)])
    error_message = "authority_lines.deputy must reference a person who has not departed, if set."
  }

  validation {
    condition = alltrue(flatten([
      for id, a in var.authority_lines : [
        for t in a.teams : contains(keys(var.teams), t)
      ]
    ]))
    error_message = "authority_lines.teams entries must reference existing keys in var.teams."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : a.deputy == null || a.deputy != a.person])
    error_message = "authority_lines[*].deputy must not be the same person as authority_lines[*].person."
  }

  validation {
    # Mirrors teams.is_head_deputy_interim.
    condition     = alltrue([for id, a in var.authority_lines : (a.deputy == null) == (a.is_deputy_interim == null)])
    error_message = "authority_lines.is_deputy_interim must be set if and only if deputy is set."
  }

  validation {
    condition     = alltrue([for id in keys(var.authority_lines) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "authority_lines keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : can(timeadd("${a.start_date}T00:00:00Z", "0s"))])
    error_message = "authority_lines[*].start_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : a.end_date == null || can(timeadd("${a.end_date}T00:00:00Z", "0s"))])
    error_message = "authority_lines[*].end_date must be a valid ISO-8601 date (YYYY-MM-DD), if set."
  }

  validation {
    # See the equivalent check on people[*].positions[*] above for why timecmp() + `? :`
    # (rather than a bare <= combined with ||) is needed here.
    condition     = alltrue([for id, a in var.authority_lines : a.end_date == null ? true : timecmp("${a.start_date}T00:00:00Z", "${a.end_date}T00:00:00Z") <= 0])
    error_message = "authority_lines[*].start_date must be on or before end_date, when end_date is set."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : can(timeadd("${a.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "authority_lines[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : contains(keys(var.people), a.reviewable.owner)])
    error_message = "authority_lines[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, a in var.authority_lines : !contains(local.departed_person_ids, a.reviewable.owner)])
    error_message = "authority_lines[*].reviewable.owner must reference a person who has not departed."
  }

  # teams.parent_team acyclicity is NOT checked here -- HCL's `for` can't do unbounded
  # recursion, so no fixed-depth check rules out a cycle at every depth. Enforced instead by a
  # DFS in scripts/check_team_hierarchy.py against `terraform show -json` output -- the one
  # invariant here not enforced by a plain `validation` block.
}

variable "team_types" {
  description = "Category definitions for Team (TeamType). Mirrors FormalPositionType/AuthorityLineType."
  type = map(object({
    title             = string # e.g. "department", "squad", "guild"
    description       = string
    documentation_url = string
    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition     = alltrue([for id in keys(var.team_types) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "team_types keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, t in var.team_types : can(timeadd("${t.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "team_types[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, t in var.team_types : contains(keys(var.people), t.reviewable.owner)])
    error_message = "team_types[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, t in var.team_types : !contains(local.departed_person_ids, t.reviewable.owner)])
    error_message = "team_types[*].reviewable.owner must reference a person who has not departed."
  }

}

variable "teams" {
  description = "Team. head/head_deputy are the sole formal line-management channel."
  type = map(object({
    name              = string
    type              = string # Entity ID into var.team_types
    description       = string
    documentation_url = string
    contact_email     = string           # e.g. "platform-squad@example.com"
    parent_team       = optional(string) # Entity ID into var.teams; omitted for the root team
    head              = string           # Entity ID into var.people
    head_title        = string
    head_deputy       = optional(string) # Entity ID into var.people
    head_deputy_title = optional(string)

    # Head's/head_deputy's own primary-team signal, counted toward the "exactly one primary
    # team" validation below -- since they have no mirrored `members` row, this is
    # how they declare primary-team-ness.
    is_head_primary_team        = bool
    is_head_deputy_primary_team = optional(bool) # null iff head_deputy is null

    # Whether the head's/head_deputy's occupancy of this position is a temporary stand-in
    # rather than a permanent appointment. Tracked independently per position --
    # a head can be interim while its deputy isn't, or vice versa.
    is_head_interim        = bool
    is_head_deputy_interim = optional(bool) # null iff head_deputy is null

    external_references = map(string) # e.g. { github_team_slug = "platform-squad" }

    # head/head_deputy do NOT need a mirrored entry here -- they are the sole formal
    # line-management channel, distinct from members/Role.
    members = list(object({
      person          = string # Entity ID into var.people
      role            = string # Entity ID into var.roles
      title           = string
      is_primary_team = bool             # whether this is the person's main team
      deputy          = optional(string) # Entity ID into var.people; backup for this specific row

      # Same temporary-stand-in-vs-permanent-appointment signal as authority_lines.is_interim
      # above.
      is_interim        = bool
      is_deputy_interim = optional(bool) # null iff deputy is null
    }))

    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })

    is_hierarchical     = bool
    is_cross_functional = bool
    is_temporary        = bool
  }))
  default = {}

  validation {
    # `? :` rather than bare `|| contains(...)` -- see the deputy check above.
    condition     = alltrue([for id, t in var.teams : t.parent_team == null ? true : contains(keys(var.teams), t.parent_team)])
    error_message = "teams.parent_team must reference an existing key in var.teams, if set."
  }

  validation {
    # Exactly one root guards against a disconnected second tree (usually a missing
    # parent_team) and is required for "lowest common ancestor" to be well-defined for
    # cross-team AuthorityLines. See docs/invariants.md "Graph shape".
    condition     = length([for id, t in var.teams : id if t.parent_team == null]) == 1
    error_message = "Exactly one team must have parent_team unset (the single root of the hierarchy)."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : contains(keys(var.people), t.head)])
    error_message = "teams.head must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : !contains(local.departed_person_ids, t.head)])
    error_message = "teams.head must reference a person who has not departed."
  }

  validation {
    # `? :` rather than bare `|| contains(...)` -- see the deputy check above.
    condition     = alltrue([for id, t in var.teams : t.head_deputy == null ? true : contains(keys(var.people), t.head_deputy)])
    error_message = "teams.head_deputy must reference an existing key in var.people, if set."
  }

  validation {
    # `? :` rather than bare `|| !contains(...)` -- see the deputy check above.
    condition     = alltrue([for id, t in var.teams : t.head_deputy == null ? true : !contains(local.departed_person_ids, t.head_deputy)])
    error_message = "teams.head_deputy must reference a person who has not departed, if set."
  }

  validation {
    condition = alltrue(flatten([
      for id, t in var.teams : [
        for m in t.members : contains(keys(var.people), m.person) && contains(keys(var.roles), m.role)
      ]
    ]))
    error_message = "teams.members[*].person/role must reference existing keys in var.people / var.roles."
  }

  validation {
    condition = alltrue(flatten([
      for id, t in var.teams : [
        for m in t.members : !contains(local.departed_person_ids, m.person)
      ]
    ]))
    error_message = "teams.members[*].person must reference a person who has not departed."
  }

  validation {
    # `? :` rather than bare `|| contains(...)` -- see the deputy check above.
    condition = alltrue(flatten([
      for id, t in var.teams : [
        for m in t.members : m.deputy == null ? true : contains(keys(var.people), m.deputy)
      ]
    ]))
    error_message = "teams.members[*].deputy must reference an existing key in var.people, if set."
  }

  validation {
    # `? :` rather than bare `|| !contains(...)` -- see the deputy check above.
    condition = alltrue(flatten([
      for id, t in var.teams : [
        for m in t.members : m.deputy == null ? true : !contains(local.departed_person_ids, m.deputy)
      ]
    ]))
    error_message = "teams.members[*].deputy must reference a person who has not departed, if set."
  }

  validation {
    condition = alltrue(flatten([
      for id, t in var.teams : [
        for m in t.members : m.deputy == null || m.deputy != m.person
      ]
    ]))
    error_message = "teams.members[*].deputy must not be the same person as that row's person."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : t.head_deputy == null || t.head_deputy != t.head])
    error_message = "teams[*].head_deputy must not be the same person as teams[*].head."
  }

  validation {
    # Only makes sense when there's a head_deputy to describe; enforced (unlike the cosmetic
    # head_deputy/head_deputy_title pairing) because a mismatch would corrupt the primary-team
    # counts below.
    condition     = alltrue([for id, t in var.teams : (t.head_deputy == null) == (t.is_head_deputy_primary_team == null)])
    error_message = "teams.is_head_deputy_primary_team must be set if and only if head_deputy is set."
  }

  validation {
    # Mirrors the is_head_deputy_primary_team check above.
    condition     = alltrue([for id, t in var.teams : (t.head_deputy == null) == (t.is_head_deputy_interim == null)])
    error_message = "teams.is_head_deputy_interim must be set if and only if head_deputy is set."
  }

  validation {
    condition = alltrue(flatten([
      for id, t in var.teams : [
        for m in t.members : (m.deputy == null) == (m.is_deputy_interim == null)
      ]
    ]))
    error_message = "teams.members[*].is_deputy_interim must be set if and only if that row's deputy is set."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : can(regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", t.contact_email))])
    error_message = "teams[*].contact_email must look like an email address."
  }

  validation {
    # A primary team is well-defined only if AT MOST one team holds a primary-team signal for
    # this person (is_primary_team row, is_head_primary_team, or is_head_deputy_primary_team).
    # See the "at least one" companion check below.
    condition = alltrue([
      for person_id in keys(var.people) : length([
        for t in values(var.teams) : true
        if anytrue([for m in t.members : m.person == person_id && m.is_primary_team])
        || (t.head == person_id && t.is_head_primary_team)
        || (t.head_deputy == person_id && t.is_head_deputy_primary_team == true)
      ]) <= 1
    ])
    error_message = "A person must have at most one primary team (an is_primary_team members row, an is_head_primary_team headship, or an is_head_deputy_primary_team head_deputy-ship)."
  }

  validation {
    # Companion to "at most one" above: every active person needs AT LEAST one primary-team
    # signal too. Departed people are exempt -- they can't hold any signal (enforced
    # elsewhere), so requiring one would be permanently unsatisfiable once someone leaves.
    condition = alltrue([
      for person_id in local.active_person_ids : length([
        for t in values(var.teams) : true
        if anytrue([for m in t.members : m.person == person_id && m.is_primary_team])
        || (t.head == person_id && t.is_head_primary_team)
        || (t.head_deputy == person_id && t.is_head_deputy_primary_team == true)
      ]) >= 1
    ])
    error_message = "Every currently-active person must have a primary team (see the 'at most one' check above for the other half of 'exactly one')."
  }

  validation {
    # Within one team, every row for the same person must agree on is_primary_team -- catches
    # the case the check above misses (conflicting rows within a single team's members list).
    condition = alltrue([
      for id, t in var.teams : alltrue([
        for person_id in distinct([for m in t.members : m.person]) :
        length(distinct([for m in t.members : m.is_primary_team if m.person == person_id])) <= 1
      ])
    ])
    error_message = "Within one team, all members rows for the same person must agree on is_primary_team."
  }

  validation {
    # Every component must belong to a team -- checked here rather than on var.components
    # itself, to avoid a validation dependency cycle (teams -> roles -> components -> teams).
    condition     = alltrue([for id, c in var.components : contains(keys(var.teams), c.team)])
    error_message = "components.team must reference an existing key in var.teams."
  }

  # components.dependency_components is NOT checked for cycles -- unlike teams.parent_team, a
  # component dependency graph may legitimately contain cycles (real circular service deps).

  validation {
    condition     = alltrue([for id in keys(var.teams) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "teams keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : can(timeadd("${t.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "teams[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : contains(keys(var.people), t.reviewable.owner)])
    error_message = "teams[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, t in var.teams : !contains(local.departed_person_ids, t.reviewable.owner)])
    error_message = "teams[*].reviewable.owner must reference a person who has not departed."
  }

  validation {
    # Existence check only -- team_types[*].title isn't a closed list, so no enum to inherit.
    condition     = alltrue([for id, t in var.teams : contains(keys(var.team_types), t.type)])
    error_message = "teams[*].type must reference an existing key in var.team_types."
  }

}

variable "component_types" {
  description = "Category definitions for Component (ComponentType). Mirrors FormalPositionType/AuthorityLineType/TeamType."
  type = map(object({
    title             = string # e.g. "repository", "user interface", "service", "library", "database"
    description       = string
    documentation_url = string
    is_external       = bool # whether this category is a 3rd-party dependency / external consumer, not org-owned
    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    condition     = alltrue([for id in keys(var.component_types) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "component_types keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, t in var.component_types : can(timeadd("${t.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "component_types[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, t in var.component_types : contains(keys(var.people), t.reviewable.owner)])
    error_message = "component_types[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, t in var.component_types : !contains(local.departed_person_ids, t.reviewable.owner)])
    error_message = "component_types[*].reviewable.owner must reference a person who has not departed."
  }

}

variable "components" {
  description = "Component. No component may be orphaned -- every component must reference an existing team."
  type = map(object({
    name                  = string
    description           = string
    documentation_url     = string
    team                  = string       # Entity ID into var.teams
    dependency_components = list(string) # Entity IDs into var.components
    is_end_user_facing    = bool
    type                  = string # Entity ID into var.component_types

    external_references = map(string) # e.g. { github_repo = "payments-service" }

    reviewable = object({
      expiration_date = string
      notes           = string
      owner           = string # Entity ID into var.people
    })
  }))
  default = {}

  validation {
    # components.team must reference an existing team -- enforced on var.teams instead, to
    # avoid a validation dependency cycle (teams -> roles -> components -> teams).
    condition = alltrue(flatten([
      for id, c in var.components : [
        for d in c.dependency_components : contains(keys(var.components), d)
      ]
    ]))
    error_message = "components.dependency_components entries must reference existing keys in var.components."
  }

  validation {
    condition     = alltrue([for id in keys(var.components) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "components keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, c in var.components : can(timeadd("${c.reviewable.expiration_date}T00:00:00Z", "0s"))])
    error_message = "components[*].reviewable.expiration_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }

  validation {
    condition     = alltrue([for id, c in var.components : contains(keys(var.people), c.reviewable.owner)])
    error_message = "components[*].reviewable.owner must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, c in var.components : !contains(local.departed_person_ids, c.reviewable.owner)])
    error_message = "components[*].reviewable.owner must reference a person who has not departed."
  }

  validation {
    # Existence check only -- component_types[*].title isn't a closed list, so no enum to inherit.
    condition     = alltrue([for id, c in var.components : contains(keys(var.component_types), c.type)])
    error_message = "components[*].type must reference an existing key in var.component_types."
  }
}

# entity_id is deliberately NOT existence-checked against var.roles/var.authority_lines/var.teams
# below -- by the time a confirmation matters, the referenced Role/AuthorityLine is expected to
# already be gone from current state (that's what it's confirming), and a head_deputy
# confirmation targets a team that's very much still there. Matching a confirmation to the
# specific transition it claims to cover needs both the before and after state, which this
# module never has -- that happens in scripts/check_retirement_confirmations.py instead.
variable "retirement_confirmations" {
  description = "Attests that a Role/AuthorityLine/team.head_deputy going inactive was deliberate and accounted for (RetirementConfirmation). Checked against git history by scripts/check_retirement_confirmations.py, not enforceable here -- see docs/invariants.md."
  type = map(object({
    entity_type    = string           # "role" | "authority_line" | "head_deputy"
    entity_id      = string           # Entity ID of the Role/AuthorityLine, or the Team, for head_deputy
    former_person  = optional(string) # Entity ID into var.people -- required (and only meaningful) when entity_type == "head_deputy", ties the confirmation to that specific tenure
    disposition    = string           # "eliminated" | "reassigned"
    reassigned_to  = optional(string) # Entity ID into var.people -- required iff disposition == "reassigned"
    confirmed_by   = string           # Entity ID into var.people
    confirmed_date = string           # ISO-8601 date (YYYY-MM-DD)
  }))
  default = {}

  validation {
    condition     = alltrue([for id in keys(var.retirement_confirmations) : can(regex("^[a-z0-9]+(-[a-z0-9]+)*$", id))])
    error_message = "retirement_confirmations keys must be lowercase kebab-case Entity IDs."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : contains(["role", "authority_line", "head_deputy"], r.entity_type)])
    error_message = "retirement_confirmations.entity_type must be one of: role, authority_line, head_deputy."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : contains(["eliminated", "reassigned"], r.disposition)])
    error_message = "retirement_confirmations.disposition must be one of: eliminated, reassigned."
  }

  validation {
    # `? :` rather than `r.disposition == "reassigned" && ... || ...`: neither `&&` nor `||` is
    # lazy in HCL, so a bare boolean form fails whenever reassigned_to is null even when the
    # null check alone decides the result.
    condition = alltrue([
      for id, r in var.retirement_confirmations :
      r.disposition == "reassigned" ? r.reassigned_to != null : r.reassigned_to == null
    ])
    error_message = "retirement_confirmations.reassigned_to must be set if and only if disposition is \"reassigned\"."
  }

  validation {
    condition = alltrue([
      for id, r in var.retirement_confirmations :
      r.entity_type == "head_deputy" ? r.former_person != null : r.former_person == null
    ])
    error_message = "retirement_confirmations.former_person must be set if and only if entity_type is \"head_deputy\"."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : contains(keys(var.people), r.confirmed_by)])
    error_message = "retirement_confirmations.confirmed_by must reference an existing key in var.people."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : !contains(local.departed_person_ids, r.confirmed_by)])
    error_message = "retirement_confirmations.confirmed_by must reference a person who has not departed."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : r.reassigned_to == null ? true : contains(keys(var.people), r.reassigned_to)])
    error_message = "retirement_confirmations.reassigned_to must reference an existing key in var.people, if set."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : r.reassigned_to == null ? true : !contains(local.departed_person_ids, r.reassigned_to)])
    error_message = "retirement_confirmations.reassigned_to must reference a person who has not departed, if set."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : r.former_person == null ? true : contains(keys(var.people), r.former_person)])
    error_message = "retirement_confirmations.former_person must reference an existing key in var.people, if set."
  }

  validation {
    condition     = alltrue([for id, r in var.retirement_confirmations : can(timeadd("${r.confirmed_date}T00:00:00Z", "0s"))])
    error_message = "retirement_confirmations.confirmed_date must be a valid ISO-8601 date (YYYY-MM-DD)."
  }
}
