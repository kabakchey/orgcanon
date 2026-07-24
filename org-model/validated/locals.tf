# Shared helpers for the "currently-active person" checks in variables.tf -- a departed person
# still holding a Team.head/AuthorityLine/Reviewable.owner slot hard-blocks `apply` (these
# `validation` conditions depend on timestamp(), which Terraform defers past `plan` -- see
# docs/invariants.md's "Tooling caveat"). `reviewable.expiration_date` staleness is also
# blocking, but as a plain Python comparison in scripts/check_reviewable_staleness.py against
# `plan` output, so it never needs `apply` -- see docs/invariants.md's "Reviewable expiration
# must not be lapsed".
#
# `local.departed_person_ids` can't be referenced from inside `variable "people"`'s own
# validation -- it depends on var.people, a real dependency cycle (confirmed by testing). The
# three checks hosted inside `people` inline the same predicate directly instead.

locals {
  today = formatdate("YYYY-MM-DD", timestamp())

  # "Departed" iff every position has fully ended (end_date set and strictly before today;
  # end_date == today still counts as active). start_date isn't part of this -- a not-yet-started
  # position has a null/future end_date, so it falls out without a separate case. An empty
  # positions list also counts as departed, defensively (can't happen in valid data).
  #
  # `? :` not `&&`: neither is lazy in HCL, so timecmp() would error on a null end_date even
  # when the null check alone decides the result -- see the same pattern in variables.tf.
  departed_person_ids = toset([
    for id, p in var.people : id
    if length(p.positions) > 0 && alltrue([
      for pos in p.positions :
      pos.end_date == null ? false : timecmp("${pos.end_date}T00:00:00Z", "${local.today}T00:00:00Z") < 0
    ])
  ])

  # Every active person, for the "exactly one primary team" validation in variables.tf's
  # `teams` -- safe there (unlike inside `people`'s own) since this depends on var.people, not
  # var.teams.
  active_person_ids = setsubtract(keys(var.people), local.departed_person_ids)
}
