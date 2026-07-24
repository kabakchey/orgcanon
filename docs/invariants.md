# Invariants & Validations

This is the source of truth for *what* must hold across the org structure data,
independent of *how* it happens to be enforced today. Current enforcement lives in
`org-model/validated/variables.tf` — Terraform is used here purely as a typed, git-diffable data
format, not a provisioning tool (see [`docs/architecture.md`](./architecture.md#key-design-decisions)) —
but this file exists so switching tech stacks later doesn't mean rediscovering these rules from
scratch.
Actual org data is assembled from `org-model/common/` and `org-model/teams/<team>/` and passed
into `org-model/validated/` via `org-model/main.tf` -- see CONTEXT.md for why the data is split
that way.
Each rule below notes where its Terraform implementation lives, for cross-reference.

Every rule below (excluding the "Deliberately NOT validated" and "Lints (non-blocking)"
sections, which mark themselves non-binding) is part of the framework's
[non-negotiable principles](../README.md#non-negotiable-principles) — see that section before
treating any of them as optional.

## Reference integrity

Every reference below is a synthetic, human-readable Entity ID frozen at creation (see
[`CONTEXT.md`](../CONTEXT.md)'s "Entity ID" entry) that must match an existing key of the target
entity.

- `role.components[*]` → an existing `component`
- `person.positions[*].type` → an existing `formal_position_type`
- `authority_line.person` → an existing `person`
- `authority_line.deputy` → an existing `person`, if set
- `authority_line.type` → an existing `authority_line_type` (see "Type entities" below)
- `authority_line.teams[*]` → an existing `team`
- `team.parent_team` → an existing `team`, if set (omitted for the root team)
- `team.head` → an existing `person`
- `team.head_deputy` → an existing `person`, if set
- `team.type` → an existing `team_type` (see "Type entities" below)
- `team.members[*].person` → an existing `person`
- `team.members[*].role` → an existing `role`
- `team.members[*].deputy` → an existing `person`, if set
- `component.team` → an existing `team` (no component may be orphaned)
- `component.type` → an existing `component_type` (see "Type entities" below)
- `component.dependency_components[*]` → an existing `component`
- `reviewable.owner` → an existing `person`, on **every** entity's `reviewable` (see
  "Reviewable.owner" below)
- `retirement_confirmations.confirmed_by` → an existing `person`
- `retirement_confirmations.reassigned_to` → an existing `person`, if set
- `retirement_confirmations.former_person` → an existing `person`, if set

## No self-reference

- `authority_line.deputy` must not equal `authority_line.person`
- `team.head_deputy` must not equal `team.head`
- `team.members[*].deputy` must not equal that row's `person`

## Graph shape

- `team.parent_team` hierarchy must be acyclic (a team can't be its own ancestor)
- Exactly one `team` must have `parent_team` unset -- the single root of the hierarchy.
  Guards against a disconnected second tree (almost always a missing `parent_team`, not a
  deliberate second org), and is required for "lowest common ancestor" to be well-defined
  when placing a cross-team `AuthorityLine` (see CONTEXT.md).
- `component.dependency_components` is **not** required to be acyclic. This is a deliberate
  asymmetry with `team.parent_team`, not an oversight: `parent_team` is a strict hierarchy by
  construction, while component dependencies describe real technical relationships, and real
  systems legitimately have circular dependencies (service A calls service B calls service A back
  for a different concern).

Terraform implementation note: HCL's `for` expressions can't do unbounded recursion, so
`team.parent_team` acyclicity is not checked inside Terraform at all. It's enforced instead by
`scripts/check_team_hierarchy.py`, a real DFS run against Terraform's own evaluated `teams`
output (`terraform plan -out=tfplan && terraform show -json tfplan`) -- the one deliberately
narrow exception to every other invariant here being a plain Terraform `validation` block.

## Composite / cross-row consistency

- Every **currently-active** person must have **exactly one** primary team, globally -- counted
  across three possible signals: an `is_primary_team` `members` row, being `team.head` with
  `team.is_head_primary_team = true`, or being `team.head_deputy` with
  `team.is_head_deputy_primary_team = true`. This is what makes "primary team" well-defined for
  the line-management derivation (see [`CONTEXT.md`](../CONTEXT.md)'s "Line management" entry)
  and for unambiguous team/headcount attribution generally. `head`/`head_deputy` still don't
  need a mirrored `members` entry -- the two `is_head*_primary_team` flags on `Team` are how a
  headship declares primary-team-ness without one, rather than requiring a `members` row (which
  would conflate `Role`, i.e. component ownership, with line management).
- A **departed** person is exempt from the "at least one" half above -- they can't hold any of
  the three signals to begin with, since a departed person can't be `team.head`/`head_deputy`/
  a `members[*].person` (see "Currently-active person required" below). They remain subject to
  "at most one" (trivially true at zero).
- `team.is_head_deputy_primary_team` must be set if and only if `team.head_deputy` is set
- Within **one** team, every `members` row for the same person must agree on
  `is_primary_team` (can't be primary in one row and not-primary in another row of the same
  team)
- `team.is_head_deputy_interim` must be set if and only if `team.head_deputy` is set
- `authority_line.is_deputy_interim` must be set if and only if `authority_line.deputy` is set
- `team.members[*].is_deputy_interim` must be set if and only if that row's `deputy` is set

  These three mirror `is_head_deputy_primary_team` above.
  `is_head_interim`/`authority_line.is_interim`/`team.members[*].is_interim` carry no such
  pairing rule -- they're plain required booleans, always set, independent of whether a deputy
  exists.

## Uniqueness

- Entity IDs are unique within their own entity type (guaranteed structurally by using them
  as map keys -- not something a future stack needs to re-derive as a business rule, just
  keep whatever the equivalent "no duplicate key" guarantee is)
- `person.email` must be unique across all people

## Format

- Entity IDs must be lowercase kebab-case slugs, frozen at creation (see
  [`CONTEXT.md`](../CONTEXT.md)'s "Entity ID" entry)
- All date fields (`reviewable.expiration_date`, `start_date`, `end_date`,
  `retirement_confirmations.confirmed_date`) must be valid ISO-8601 calendar dates
  (`YYYY-MM-DD`) -- validity means a real calendar date, not just the right shape (e.g.
  `2027-02-30` must be rejected, not just anything matching `\d{4}-\d{2}-\d{2}`)
- `authority_line.start_date` must be on or before `end_date`, if `end_date` is set
- `person.positions[*].start_date` must be on or before `end_date`, if `end_date` is set
- `team.contact_email` must look like an email address (a basic `local@domain.tld` pattern
  check, not full RFC 5322 validation)

## Type entities

`FormalPositionType`, `AuthorityLineType`, `TeamType`, and `ComponentType` all follow the same
shape and purpose: give `FormalPosition`/`AuthorityLine`/`Team`/`Component` a referenced
category (`title`, `description`, `documentation_url`, `reviewable`) instead of a freeform or
inline-validated string.

- `AuthorityLine` has no freeform title, only `type` -- no equivalent per-instance naming need
  has ever come up for it the way `FormalPosition`'s documented naming convention exists, so
  there's no separate freeform instance-level title alongside the reference.
- `Team.type` and `Component.type` follow this same reference pattern rather than being plain
  strings, for consistency with `FormalPosition`/`AuthorityLine`. `Team.type`/`Component.type`
  are existence-checked against `team_types`/`component_types`, with no enum guarantee on the
  referenced entity's `title`.
- `ComponentType` alone additionally carries `is_external: bool` (required) -- whether that
  category is a 3rd-party dependency or external consumer, not something an org team owns/built.

## Reviewable.owner

Every `Reviewable` (composed into all entities) has an `owner: Person` -- who is responsible for
keeping that specific entity current. Required, not optional. Restricted to `Person` only for
now, not `Team` or any other entity: a team could plausibly own an entity's review instead of an
individual, but nothing in current usage has established a need for that yet, and narrowing scope
now costs little -- extending `owner` to accept a `Team` reference later would be a small,
additive change if the need shows up.

## Currently-active person required

A person who has left the company must not still be referenced as though they hold ongoing
authority or responsibility. This is a hard-blocking check, same as `reviewable.expiration_date`
staleness below -- both are time-relative, and both are judged serious enough to block all
unrelated `plan`/`apply` runs org-wide until fixed. The two differ in mechanism, not in
severity: this check is a genuine HCL `validation` block depending on `timestamp()`, so it needs
`apply` (see "Tooling caveat" below), while staleness is a plain Python date comparison against
`plan` output and never needs `apply` -- see "Reviewable expiration must not be lapsed" below.

- `people[*].positions` must be **non-empty** -- every person must have at least one position.
  Without this, "departed" would be ambiguous (never hired, vs. hired but never recorded).
- A person is **departed** iff every position they've ever held has an `end_date` set and
  strictly before today (`end_date == today` still counts as active -- its last day).
  `start_date` is deliberately not part of this: a not-yet-started future hire has a
  null-or-future `end_date`, so falls outside this definition without a separate case.
- A departed person must not be referenced as:
  - `team.head`, `team.head_deputy`
  - `team.members[*].person`, `team.members[*].deputy`
  - `authority_line.person`, `authority_line.deputy`
  - `reviewable.owner`, on **every** entity's `reviewable` (see "Reviewable.owner" above)
  - `retirement_confirmations.confirmed_by`, `retirement_confirmations.reassigned_to` (if set)

Terraform implementation note: `plan` alone does **not** evaluate this -- see "Tooling caveat"
below. These `validation` conditions depend on `timestamp()`, and Terraform defers evaluating
any condition that depends on `timestamp()` until `apply` -- this isn't documented Terraform
behavior, just its observed behavior today, so treat it as worth re-checking if you upgrade
Terraform versions -- so a `plan`-only check here would look like a hard block while never
actually firing in practice. Implemented as `org-model/validated/locals.tf`'s `departed_person_ids`, plus
one `validation` block per reference above, parallel to that reference's existing existence
check in `variables.tf`.

## Retirement confirmation

A `Role`, `AuthorityLine`, or `team.head_deputy` going from active to inactive must be
accompanied by a matching entry in `retirement_confirmations` -- otherwise it's a hard-blocking
failure, not just a warning. This is deliberately stricter than every other invariant in this
file: it's the only one that can't be checked from a single state, and the only one whose
"correctness" is a real-world fact (does the work still need covering, and if so, who has it
now) that no amount of schema validation can derive on its own -- it can only be attested to.

- **Trigger conditions** -- exactly three, deliberately narrow:
  - A `role` key disappears from `roles` entirely.
  - An `authority_line` key disappears from `authority_lines`, **or** an existing one's
    `end_date` goes from unset to set (retiring itself is the event that matters, not just the
    eventual pruning of the record -- an `AuthorityLine` still present with a *past* `end_date`
    that gets removed later needs its own fresh confirmation too, same as any other removal).
  - A `team.head_deputy` goes from set to unset.
  - `team.head` is explicitly **not** in scope -- it's a mandatory field and can only be
    *replaced*, never removed, so there's no "went inactive" transition for it to catch.
    `team.members[*]` rows are also out of scope for now.
- **Confirmation shape** -- `retirement_confirmations` is a new entity type, composed per-team
  exactly like `roles`/`authority_lines`/`components` (see `org-model/main.tf`'s onboarding
  comment), so a team's own CODEOWNERS review gates confirming its own retirements, same as
  every other entity a team owns. Each entry declares:
  - `entity_type` (`role` | `authority_line` | `head_deputy`) and `entity_id` (the Role/
    AuthorityLine id, or the team id for `head_deputy`)
  - `disposition`: `eliminated` (the responsibility genuinely no longer exists) or `reassigned`
    (`reassigned_to`, a person id, is required in this case) -- a forced choice rather than a
    freeform reason, so "was this covered by someone else" is a structured, checkable fact
    instead of something a vague note could paper over
  - `former_person`, required only when `entity_type` is `head_deputy` -- ties the confirmation
    to that specific tenure, so a team that clears/re-fills/clears its deputy again over time
    needs a fresh confirmation each time rather than one entry silently covering every future
    clearing
  - `confirmed_by` (person id) and `confirmed_date`
- **`entity_id` is not existence-checked** against `roles`/`authority_lines`/`teams` inside
  `org-model/validated/` -- by the time a confirmation matters, the Role/AuthorityLine it
  references is expected to already be gone from current state (that's what it's confirming).
  Matching a confirmation to the specific transition it claims to cover needs both the before
  and after state, which no single Terraform `plan`/`apply` ever has.
- **Enforcement is a diff, not a `validation` block** -- `scripts/check_retirement_confirmations.py`
  compares two `terraform show -json` plans (before/after), the same shape
  `scripts/check_team_hierarchy.py` and `scripts/summarize_org_diff.py` already consume. Unlike
  `summarize_org_diff.py` (informational only), this is a hard gate: `make
  check-retirement-confirmations`, wired into `make check`. "Before" is the PR/MR base SHA in
  CI, and the local default branch (`origin/main`) in pre-commit, which has no concept of a PR
  base -- see the Makefile's `BASE_SHA` default and `_diff-plans`.
- **No backfill** -- this is purely diff-triggered going forward. Existing data that predates
  this invariant is untouched; nothing needs a `retirement_confirmations` entry unless it's
  actively retired or removed after this check exists.

## Reviewable expiration must not be lapsed

Every `Reviewable` (composed into all nine entity types, plus `people[*].positions[*]`'s own
nested one) must have an `expiration_date` on or after today -- a lapsed review blocks `plan`,
org-wide, until the owner re-confirms and pushes out the date. This was previously a periodic
report rather than a hard block; that changed because the paperwork-vs-correctness distinction
that justified leaving it as a report doesn't hold up as a reason to let it merge silently --
an overdue review is still worth surfacing before code review, not just after the fact.

- Implemented as `scripts/check_reviewable_expiration.py`, reading a single `terraform show -json`
  plan the same way `scripts/check_team_hierarchy.py` does -- never parses `.tf` files, and never
  needs a second (before/after) plan the way `check_retirement_confirmations.py` does.
- The comparison against "today" happens in Python (`datetime.date.today()`), not through an HCL
  `validation` block's `timestamp()` -- so unlike "Currently-active person required" above, this
  check fires on `plan` alone and never needs `apply`.
- Wired into `make check-reviewable-expiration`, part of `make check`.

## Reviewable expiration must not be set too far out

Every `Reviewable` must also have an `expiration_date` no more than `MAX_HORIZON_DAYS` (365 days,
i.e. one year) past today -- the symmetric upper bound to "Reviewable expiration must not be
lapsed" above, on the same field. Without it, a reviewer could push `expiration_date` out
indefinitely and never have to re-confirm; this forces at least an annual re-confirmation cadence
on every Reviewable across the org. Same severity as staleness: a hard block, not a lint.

- One global constant (`MAX_HORIZON_DAYS` in `scripts/check_reviewable_expiration.py`) applies
  uniformly to every Reviewable -- no per-entity-type override.
- Implemented in the same script and the same `find_violations()` pass as the staleness check
  above, reusing the identical `find_reviewables()` traversal and the identical
  plain-Python-string-comparison-against-`plan`-output mechanism (no `apply` needed, for the same
  reason).
- Wired into the same `make check-reviewable-expiration` target, part of `make check` -- there is
  no separate target for this bound.

## Deliberately NOT validated (and why)

- `formal_position_type.title` / `.level` / `authority_line_type.title` / `team_type.title` /
  `component_type.title`: all five are illustrative, not closed. A hardcoded closed-list
  `validation` block would mean keeping two independent copies of the same list in sync by hand;
  `common/`'s people-ops review already catches an unlisted value a different way. No enum
  validation applies to any of them. Contrast with `retirement_confirmations.entity_type`/
  `.disposition` (see "Retirement confirmation" above) -- those *are* closed enums, the only ones
  in this schema, because their whole purpose is a forced structured choice, not an illustrative
  category label; there's no open-ended "new kind of retirement" the way there's a new job title.
- Team-type-conditional mandatory fields ("some types of teams should have a mandatory field
  filled in that aren't applicable to others"): needs a tagged-union schema. Terraform's
  `object()` type constraints can't express "attribute X is required only when `type == Y`" --
  every attribute of a given object type is uniformly required/optional regardless of a
  discriminator field. Would need a custom script outside Terraform, not a `validation` block.
- `formal_position.title` naming-convention string (`"<title> (<spec>) * <team> @ ..."`, see
  `org-model/validated/variables.tf`'s `people` variable for the full convention): deliberately
  freeform, a good-enough default, not something to enforce with a regex.

## Lints (non-blocking)

These are **not** invariants -- nothing in the schema or CI enforces them, and violating one
never blocks a merge. They surface as an informational report only
(`scripts/report_data_quality.py`), run via `make report-data-quality`. If one of these ever
graduates to a real invariant, move it out of this section and into the appropriate section
above, and add a real `validation` block (or script, per the same reasoning as `team.parent_team`
acyclicity above) to enforce it.

- A person referenced by no team's `head`, `head_deputy`, or any `members[*].person` --
  possibly an offboarded person whose team rows were removed but whose `people` entry wasn't.
- A team with an empty `members` list -- not necessarily wrong (a newly created team, or one
  whose only "member" is its `head`), but worth a human glance.
- An `external_references` value that's empty or whitespace-only -- likely a placeholder that
  was never filled in.

## Tooling caveat (Terraform-specific, not an invariant)

Plain `terraform validate` does **not** evaluate any of the above against real data -- per its
own `--help` text, it checks validity "regardless of any provided variables." Use
`terraform plan` or `terraform console` (run from `org-model/`, no `-var-file` needed -- data
is wired in by `org-model/main.tf`'s module composition, see `org-model/common/` and
`org-model/teams/`) to actually enforce these rules.

**Exception**: "Currently-active person required" above needs `terraform apply`, not just
`plan` -- its `validation` conditions depend on `timestamp()`, which Terraform defers
evaluating until `apply`. This deferral isn't documented Terraform behavior, just its observed
behavior today, so re-check it if you upgrade Terraform versions. `plan` alone will report
success even when a departed person is still referenced somewhere. `make check` and
`make check-examples` (`Makefile`) both run `apply` against a throwaway local state file for
this reason.
