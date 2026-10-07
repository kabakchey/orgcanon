# Org Structure

Org-as-code: org structure (people, teams, roles, components) modeled as versioned,
structured data instead of scattered documents. See `README.md` for the project overview,
`org-model/validated/` for the schema design, and `docs/architecture.md` for the decisions
behind how it's authored and validated.

The distinctions defined below (Role vs. AuthorityLine vs. FormalPosition, chief among them) are
part of the framework's [non-negotiable principles](./README.md#non-negotiable-principles) — see
that section before treating any of them as optional.

## Language

**Entity ID**:
A synthetic, stable identifier assigned to each entity (`Person`, `Team`, `Component`, etc.),
used only as the map key for inter-entity references (e.g. `line_manager = "<entity id>"`).
A human-readable slug (e.g. `alice-nguyen`) generated once from the entity's name/title at
creation time and frozen from then on — it does not change if the underlying name later does.
Collisions are handled with a disambiguating suffix, not by changing the id format.
_Avoid_: slug, key, identifier

**Reviewable**:
A nested sub-object (`expiration_date`, `notes`, `owner`) composed into every top-level
entity, capturing when the entity needs review, free-text notes, and who's responsible for
keeping it current. Composition, not inheritance — Terraform/HCL has no type inheritance, so
nesting keeps the Python and eventual HCL shapes structurally identical. `owner` is a
required reference to a `Person` — restricted to `Person` only for now, not `Team` or
anything else, since no need for team-owned review has come up yet.
_Avoid_: base class, mixin

**FormalPosition**:
Answers "what is your job title and level." HR/career-ladder identity, backed by
`FormalPositionType` (`level`, link to the personal profile or similar). Fairly static — changes
only on promotion or role change. `Person.positions` is a history of these over time via
`start_date`/`end_date`, not a set of concurrent hats.
_Avoid_: role, title (alone — always qualify as "formal position title")

**Role**:
Answers "what do you own within this specific team." An area of responsibility expressed as
`components: list[Component]`, scoped to exactly one `Team.members` entry — a person on two
teams has two (possibly different) Roles. Never carries authority over other people; a
function that does is an `AuthorityLine`, not a `Role`, even if scoped to one team.
_Avoid_: position, authority, leadership

**AuthorityLine**:
Answers "what leadership or influence function do you perform, and over whom." Covers Mentor,
Tech Lead, Scrum Master, Product Owner, Chapter Lead, Guild Lead, Committee Chair, HR/Finance/
Security Partner, etc. (illustrative, not a closed list). Always modeled
this way regardless of scope: a Tech Lead for exactly one team is still an `AuthorityLine`
with `teams` of length 1, not a `Role`, because the `deputy` and explicit `start_date`/
`end_date` succession-tracking a leadership function needs doesn't disappear just because its
scope is currently narrow. The dividing test against `Role`: directing people/process →
`AuthorityLine`; owning a component → `Role`.
**Crucially, `AuthorityLine` is functional/advisory power only — it never confers formal
people-management authority** (hiring, firing, performance review). That power is Line
Management, a categorically different and stronger channel — see below. `AuthorityLine`'s
category is a validated reference (`type: AuthorityLineType`), not a freeform string — see
below. When `teams` spans more than one team, the `AuthorityLine` is authored under their
lowest common ancestor team, not under any one of the named teams — it's a claim of
authority *over* those teams, not a claim *by* one of them, so no single named team's data
should be the one asserting it. Requires a single-rooted `team.parent_team` hierarchy to
always be well-defined (see docs/invariants.md "Graph shape"). `teams` is an explicit,
non-cascading enumeration — an `AuthorityLine` over a team does not automatically extend to
that team's descendant teams; a descendant only falls under it if separately listed.
_Avoid_: role, position, line management, authority line title

**AuthorityLineType**:
Category definitions for `AuthorityLine` (`title`, `description`, `documentation_url`,
`reviewable`), mirroring `FormalPositionType`. Gives every `AuthorityLine` a validated
category via `type` — no separate per-instance freeform title, unlike `FormalPosition`, which
has a documented naming convention `FormalPositionType` doesn't need to cover.

**TeamType / ComponentType**:
Category definitions for `Team`/`Component`, same shape as `AuthorityLineType`/
`FormalPositionType`. `TeamType.title`/`ComponentType.title` are illustrative/freeform — same
treatment as every other type entity's `title`. `Team.type`/
`Component.type` themselves are just references, existence-checked against
`team_types`/`component_types` with no enum guarantee on the referenced entity's `title`.
`ComponentType` additionally carries `is_external: bool` (required) — whether that category is a
3rd-party dependency or external consumer, not something an org team owns/built. For an
`is_external` `Component`, `team` means the org team accountable for tracking the dependency (the
consuming team for a 3rd-party API/library, the API-owning team for an external consumer), not a
claim of authorship. External parties are never modeled as `Team` — see "Line management" below
for why that would corrupt `Person.line_manager` derivation; a bare point of contact is already
covered by `Reviewable.owner`.

**Line management**:
The one formal, structural authority channel (hiring, firing, performance review) —
categorically stronger than `AuthorityLine`'s functional/advisory power. `Team.head` is never
modeled as an `AuthorityLine` because of this distinction. `Person.line_manager` is derived
from three direct rules, not one rule applied recursively through team membership — the
obvious recursive generalization self-contradicts for `Team.head`, producing a self-loop:
1. Ordinary member: `line_manager = head of their primary team`
2. Team head: `line_manager = head of the parent team` (root team's head has none)
3. Team head's deputy: `line_manager = the team's own head`

None of these require `head`/`head_deputy` to appear in `Team.members` — deliberate, since
`AuthorityLine`'s deputy/succession shape doesn't extend to line management (a categorically
stronger, different channel — see "Line management" above).
_Avoid_: authority line, tech lead, manager (alone — always say "line manager")

**Role (multi-membership note)**:
A person can hold more than one `Role` within the *same* team (multiple `Team.members` rows
with the same `Person`, different `Role`s), and can be a member of multiple teams with only
one marked `is_primary_team = true`. `is_primary_team` must agree across every row for the
same `(Person, Team)` pair — a person can't be simultaneously primary and non-primary in one
team. Every currently-active person must have **exactly one** primary team, globally — not just
at most one. A `Team.head`/`head_deputy` doesn't need a `Team.members` row to satisfy this (see
"Line management" below): `Team.is_head_primary_team`/`is_head_deputy_primary_team` let a
headship itself carry the primary-team designation instead.

**External reference**:
A freeform `map(string)` on a `Person`, `Team` or `Component` holding that entity's identifier
in one specific downstream system, keyed by a `<system>_<field>` convention (e.g.
`github_accountname`, `github_team_slug`, `github_repo`) -- see
[`docs/external-references.md`](./docs/external-references.md) for the exact keys to use and
which of them tooling reads. Distinct from `extensions`: an external reference's value is always a single
string identifier used to *locate* the same entity in another system, never a blob of that
system's own data — richer per-system data belongs in `extensions[<domain>]` instead. An
entity absent from a given system just omits that key; a Population Module skips anything
unset rather than inventing a default.
_Avoid_: identity mapping, external id (alone)

**Population Module**:
A Terraform module (`modules/<system>/`, e.g. `modules/github/`) that maps org-model's
entities onto real resources in one external system (GitHub, Atlassian, Google Workspace,
...), read via each entity's `external_references`. Ships from this repo the same way
`org-model/validated/` does — versioned, imported by an adopting org's own separate infra repo,
which supplies the real org data plus the provider credentials and owns the actual
`apply`/state. A Population Module never runs `apply` and never holds credentials itself; this
repo's CI stays validate-only no matter how many Population Modules exist (see
[`docs/architecture.md`](./docs/architecture.md#key-design-decisions) for the full reasoning).
_Avoid_: provisioning module (too close to org-model itself's own "data format, not a
provisioning tool" framing), sync module

## Position vs Role vs Authority Line

Three different questions about a person, each answered by a different construct:
- **FormalPosition** — what is your job title/level (HR identity)
- **Role** — what do you own within this team (component responsibility)
- **AuthorityLine** — what do you lead or influence, and over whom (people/process authority)

## Notes

- `date`-typed fields (`Reviewable.expiration_date`, `AuthorityLine`/`FormalPosition`
  `start_date`/`end_date`) are Python `date` objects in this design-phase schema, but HCL has
  no date primitive — they become HCL `string` holding ISO-8601 text (e.g. `"2027-01-01"`)
  once serialized. Not a decision with alternatives, just a translation fact worth knowing.
