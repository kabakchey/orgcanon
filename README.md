# OrgCanon

<img src="./docs/assets/mascot/mascot-readme.png" alt="OrgCanon mascot: a bee wearing a hardhat" width="360" />

**Status: experimental, pre-1.0.** The schema, the file layout, and the validation approach
are all still actively evolving — expect breaking changes between commits, no tagged releases
exist yet, and nothing here should be depended on as stable until that changes.

Org-as-code: your organization's structure — people, teams, roles, components, who leads
what, who reports to whom — modeled as versioned, structured data instead of scattered HR
tools, spreadsheets, and wiki pages, and validated the same way infrastructure already is.

## Table of contents

- [Why this exists](#why-this-exists)
- [Alternatives](#alternatives)
- [Non-negotiable principles](#non-negotiable-principles)
- [What it models](#what-it-models)
- [How it works](#how-it-works)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Examples](#examples)
- [Editing org data](#editing-org-data)
- [Using this as a framework in your own org](#using-this-as-a-framework-in-your-own-org)
- [Documentation map](#documentation-map)
- [Contributing](#contributing)
- [License](#license)

## Why this exists

Org structure today typically lives scattered across an HR system, spreadsheets, wiki pages,
and tribal knowledge — each maintained independently, each drifting out of sync with the
others and with reality. Answering a simple question ("who's the backup for this role," "what
does this team actually own," "what are all of this person's responsibilities across teams")
means manually cross-referencing several of these sources by hand, with no way to tell if any
of them are actually current.

OrgCanon treats org structure as code: one versioned, structured source of truth that HR, Tech,
Security, Finance, and Legal can each read through their own filter, instead of several teams
independently maintaining several documents that say several slightly different things.

- **Structured, not prose** — relationships (who backs up whom, which components a team owns,
  which roles aggregate to which person) are explicit and queryable, not inferred from
  scattered docs.
- **Versioned** — change history is git history; there's no separate audit log to build or
  maintain.
- **Validated** — the same review/diff/validation tooling already used for infrastructure
  applies here too, so bad data (a dangling reference, a broken invariant) is caught before it
  merges, not discovered months later when someone finally needs the answer.
- **Ownable** — different parts of the data are reviewed by the people who actually have
  authority over that content (see [Editing org data](#editing-org-data)), not by whoever
  happens to have write access to one shared document.
- **Deterministic** — automating is the answer: no human error, no loose ends, nothing left to
  chance. Population Modules turn validated org data into real-world state, exactly the same way
  every time.

## Alternatives

OrgCanon is not the first project to describe itself as "org as code," and it isn't the only way to
link org structure to component ownership or to manage organizational settings as code. The
table below is honest about what each alternative already does well, specifically so the actual
differentiator is visible rather than assumed:

| Project | What it models | Strictness / validation stance | Where OrgCanon differs |
|---|---|---|---|
| [org-as-code.com](https://org-as-code.com) ([`andreassiemes/org-as-code`](https://github.com/andreassiemes/org-as-code), spec name OPI) | Governance, decision rights (DACI/RAPID), AI-agent mandates, decisions-as-a-graph | Its own validator (YAML + JSON Schema, ~100 rules) is strict, but explicitly designed "strict producer, permissive consumer" — consumers are told to tolerate unknown keys and broken links | No permissive-consumer escape hatch anywhere downstream; models `Role`/`AuthorityLine`/line-management as three non-substitutable channels instead of one accountability shape |
| [Backstage software catalog](https://backstage.io/docs/features/software-catalog/descriptor-format/) | `User`/`Group` (org structure) alongside `Component`/`System` (software), linked via an `owner` field | Format/name validated, but the catalog's own docs say `owner` is "for display purposes... not authorization enforcement" | `Reviewable.owner` is a required, schema-level field on every entity, and CODEOWNERS ties git's own review-gating to that same mapping — ownership isn't just displayed, editing is actually gated by it |
| [TeamAPI-As-Code](https://github.com/TeamTopologies/TeamAPI-As-Code) | Team-to-team relationships per Team Topologies (interaction modes, dependency types) | Schema-referenced; enforcement unconfirmed; early-stage (v0.0.1) | Models individual people's authority (`Role`/`AuthorityLine`/`FormalPosition`/line-management), not just team-level interaction patterns |
| [42futures/firm](https://github.com/42futures/firm) | Generic version-controlled business-data graph (organizations, contacts, projects, tasks) via a custom Rust DSL | User-defined schemas — flexible by design, no built-in org-specific invariants | Org structure (line management, authority, component ownership) is a fixed, validated shape, not a schema every adopter redefines from scratch |
| GitHub-permissions-as-code (e.g. [Optum/orgs-as-code](https://github.com/Optum/orgs-as-code), [ipdxco/github-as-code](https://github.com/ipdxco/github-as-code), [xebis/github-organization-as-code](https://github.com/xebis/github-organization-as-code), [Pulumi's GitHub setup](https://www.pulumi.com/blog/managing-github-with-pulumi/)) | GitHub repos, teams, branch protection, permissions | Terraform/Pulumi-provider-level validation on GitHub *resources* | Doesn't model human org structure at all — these describe GitHub settings, not who reports to whom or who owns what. This is the most common thing people actually mean by "org as code," and it isn't what OrgCanon does |

None of the above are wrong, and several model things OrgCanon doesn't — org-as-code.com's decision
graph and AI-agent mandates, TeamAPI-As-Code's team-interaction modes. The real differentiator
isn't a missing feature; it's a refusal every one of them makes somewhere that OrgCanon doesn't. That
refusal — strictness, with no exceptions carved out for convenience — **is the entire idea of
this project, not a rough edge to be smoothed over**:

- **No permissive-consumer escape hatch.** org-as-code.com and Backstage both validate at the
  edge and then explicitly tolerate looseness downstream (broken links, display-only ownership).
  Every one of OrgCanon's downstream consumers trusts the already-validated schema output as-is — see
  principle 8 below.
- **Line management is derived, never stored.** Every alternative above stores authority or
  management as a settable field that can silently diverge from actual structure after a reorg.
  OrgCanon computes it from three direct rules at read time, so there's nothing to desync.
- **Ownership is structurally enforced, not just described.** CODEOWNERS ties git's own native
  review-gating to the same directory → authority mapping the schema encodes, instead of leaving
  "who's allowed to edit this" as a separate manual setup layered on top of descriptive governance
  data.
- **The strictness is targeted, not blanket.** `team.parent_team` must be acyclic because a real
  hierarchy can't cycle; `component.dependency_components` is deliberately allowed to, because
  real service dependencies do. Strictness here tracks what's actually true about orgs, not
  maximalism for its own sake.
- **Validation and provisioning stay in separate trust boundaries.** This repo's core never runs
  `apply` against anything real and never holds credentials — not a refusal to ever provision, but
  a deliberate separation: provisioning is an opt-in future layer (Population Modules, not yet
  built — see [`docs/architecture.md`](./docs/architecture.md#key-design-decisions)) that ships
  from here but only ever applies inside an adopting org's own repo, with their own credentials.

See [Non-negotiable principles](#non-negotiable-principles) below for why every one of these is
treated as a package deal rather than something to relax under pressure.

## Non-negotiable principles

The items below are a package deal, not a menu. Adapting your own org data, extending the
schema, forking the tooling — all expected, all fine. But each principle and validation here was
chosen for a concrete real-world reason (see [`docs/architecture.md`](./docs/architecture.md#key-design-decisions)
and [`docs/invariants.md`](./docs/invariants.md) for those reasons), not arbitrarily. If one
genuinely doesn't fit how your org works, treat that as a signal to re-examine the fit — not as
license to quietly drop the rule. If you still need to drop one, what you're building at that
point is no longer OrgCanon; give it its own name.

This ruleset is deliberately the strictest configuration available for keeping org data
unambiguous and error-free — every rule closes off one specific way that data can drift or
contradict itself. A rule that chafes is a signal you already have, or soon will have, the
problem it prevents. The exception is small orgs, where asking the one person who'd know still
works — but that's borrowed time, since it depends on institutional memory that doesn't survive
turnover or growth, not evidence the rule doesn't fit long-term.

**Framework principles:**

1. **Structured data, not documents** — relationships are explicit, queryable data, never
   inferred from prose scattered across other systems.
2. **A data format at its core, provisioning kept as a separate opt-in layer** —
   `org-model/validated/` is a typed, git-diffable schema only, with no `resource`/`provider`
   blocks, and nothing in `org-model/` is ever applied against real infrastructure. Provisioning
   into real systems (GitHub, Atlassian, Google Workspace, ...) is a deliberately separate
   concern: optional Population Modules ship from this repo the same way the schema does, but
   only ever `apply` inside an adopting org's own repo.
3. **Validated like infrastructure** — every invariant below is enforced by the same
   plan/review/diff tooling infrastructure code already trusts, before a change merges, not
   discovered later.
4. **Git is the audit log** — versioned by construction; there is no separate change-history
   system to build or keep in sync.
5. **Ownership follows authority** — who can approve a change matches who actually has authority
   over that content, not who happens to have write access to the repo.
6. **Power is split by kind, never by scope** — component ownership (`Role`), functional/advisory
   leadership (`AuthorityLine`), and formal people-management (`Team.head`/line management) stay
   three distinct channels, regardless of how many teams a given function currently touches.
7. **Derived, not duplicated** — anything computable from the graph (line management, above all)
   is computed at read time, never stored, so there is nothing that can silently go stale.
8. **One source of truth, no shadow validators** — downstream consumers (`orgapi`, `orgviewer`)
   trust the evaluated schema output as-is; neither re-implements a second parser or validator for
   data already checked once.
9. **Self-contained and adoptable, not proprietary** — the schema and validation logic ship as a
   versioned module another org pins and builds on, not something that only works forked or
   vendored in place.
10. **Only data and its ownership routing are yours to edit** — adopting this framework means
    writing your own `common/`/`teams/<team>/` data and your own CODEOWNERS, and pinning
    everything else (the schema/validation logic, scripts, `orgapi`, `orgviewer`, CI) as-is via
    the versioned-module pattern. Editing anything outside those two is forking, not adopting —
    see principle 9.

**Data validations:** every rule in [`docs/invariants.md`](./docs/invariants.md) is part of this
same set, in full — reference integrity, no self-reference, graph shape, composite/cross-row
consistency, uniqueness, format, type entities, `Reviewable.owner`, and the currently-active-person
check — with two explicit exceptions, because that file already marks them non-binding itself:
its "Deliberately NOT validated" and "Lints (non-blocking)" sections.

## What it models

A quick, plain-language tour — see [`CONTEXT.md`](./CONTEXT.md) for the precise, canonical
definitions (including the distinctions that are easy to blur, like *Role* vs *AuthorityLine*
vs *FormalPosition*, or *Team* vs *Component*).

| Concept | Answers |
|---|---|
| **Person** | Who someone is — name, contact info, specialization, career history. |
| **Team** | A group of people working toward common goals — has a head, a type (department, squad, guild, ...), and an optional parent team. |
| **Role** | What a person *owns* within one specific team (a component/area of responsibility). Never carries authority over other people. |
| **AuthorityLine** | What leadership or influence function a person performs, and over whom (Tech Lead, Mentor, Scrum Master, ...). Functional/advisory only — never formal people-management. |
| **FormalPosition** | A person's job title and level — their HR/career-ladder identity, separate from what team(s) they're actually on. |
| **Component** | A discrete thing — software or otherwise — that a team owns and is accountable for (a repo, a service, a database, a recurring duty, ...). Also covers 3rd-party dependencies and external consumers, where `team` means "accountable for tracking," not "built" — see `ComponentType.is_external`. |
| **Reviewable** | Composed into every entity above — who owns keeping it current, and when it next needs review. |

Line management (who formally manages whom — hiring/firing/performance authority) is
**derived**, not stored directly, from three simple rules based on team structure. See
[`CONTEXT.md`](./CONTEXT.md)'s "Line management" entry.

## How it works

The schema and its validation rules are pure Terraform/HCL — `variable` blocks with
`object()` type constraints define the shape, and `validation` blocks enforce cross-entity
invariants (reference integrity, no orphaned records, no cycles, uniqueness, date sanity, and
more — see [`docs/invariants.md`](./docs/invariants.md) for the full list). There are
deliberately **no `resource` or `provider` blocks anywhere in `org-model/`** — this is a pure
data schema, not something that provisions infrastructure, so `terraform apply` never touches
anything real, even though it does now run (against a throwaway local state file) for one
specific check that needs it. See
[`docs/architecture.md`](./docs/architecture.md#key-design-decisions) for the full reasoning.

Three checks live outside plain `terraform plan`: real cycle detection on the team hierarchy and
reviewable-expiration bounds (staleness and max horizon), each in a small external script — the
former because HCL genuinely cannot express unbounded recursion, the latter because it's a plain
Python date comparison against `plan` output rather than an HCL `validation` block; and departed-person
reference checks, which need `terraform apply` because they depend on `timestamp()`, which
Terraform defers past plan time. All three are narrow, deliberate exceptions rather than a
general pattern — see
[`docs/architecture.md`](./docs/architecture.md#key-design-decisions) for why.

## Repository structure

```text
org-model/
  common/            org-wide data: the single root team, and shared type vocabulary
                      (TeamType, ComponentType, AuthorityLineType, FormalPositionType).
                      Ships as a placeholder template — see "Getting started" below.
  teams/<team>/       empty by default; one directory per team goes here (at every level of
                      the hierarchy that has its own head — departments included, not just
                      leaf squads), each owning its own people/roles/authority-lines/components
  validated/          the schema + all validation logic (a child module, so it can receive
                      merged data from main.tf)
  main.tf             composes common/ + every teams/<team>/ into validated/
  outputs.tf          re-exports the fully merged/validated data

examples/             three worked, runnable examples of filled-in org data — see "Examples" below

scripts/
  check_team_hierarchy.py   real cycle detection on the team hierarchy (see "How it works")
  friendly_check.py         plain-English validation errors for non-technical editors (`make check-friendly`)
  report_data_quality.py    non-blocking data-quality lints (`make report-data-quality`)
  check_reviewable_expiration.py   blocks Reviewables whose expiration_date is past due or more than a year out (`make check-reviewable-expiration`, part of `make check`)
  summarize_org_diff.py     plain-English org-model diff summary, used by the PR-diff bot
  post_review_comment.py    posts/updates the PR-diff bot's comment on GitHub and GitLab
  orgcanon_cli.py                guided scaffolding for common edits (`add-person`, `add-team-member`)

tools/
  orgapi/             Python/FastAPI service — loads org-model/ once at startup and re-exposes
                      it as a filterable HTTP API plus an MCP server
  orgviewer/          Vite/React SPA — fetches from orgapi and renders the org/component graphs

docs/
  invariants.md        the source of truth for what must hold, independent of how it's enforced
  for-management.md     non-technical explainer for leaders and stakeholders
  onboarding-people-ops.md   guide for editing org data with no Terraform/HCL background required
  architecture.md        how org-model/, orgapi, and orgviewer relate, the reasoning behind every
                          non-obvious design decision, and where to start
  asking-questions-via-mcp.md   how to connect an MCP client to orgapi's generated MCP server

CONTEXT.md             the glossary — precise definitions for every domain term
.github/workflows/, .gitlab-ci.yml, .pre-commit-config.yaml   CI, all delegating to the Makefile
Makefile                single source of truth for prerequisite installation + validation commands
Dockerfile              the one place Terraform/Python/Node toolchains get installed — every
                        Makefile (this one, tools/orgapi/, tools/orgviewer/) runs its targets
                        inside it by default
```

Every level of the org hierarchy that has its own head gets its own `teams/<team>/` directory,
nested directly inside its `parent_team`'s directory (e.g.
`teams/engineering/payments-squad/payments-core/`), so the org chart is visible from the tree
itself — a reorg (changing `parent_team`) does mean moving the directory and updating its module
source path and CODEOWNERS entry, the same as any other file move. This is also deliberately
*not* gated by review: a team taking a dependency on another team's component is a unilateral,
consumer's-call-to-make decision, the same way importing a public package doesn't need the
package owner's permission. See
[`docs/architecture.md`](./docs/architecture.md#key-design-decisions) for the full reasoning.

For how these pieces relate, see [`docs/architecture.md`](./docs/architecture.md).

## Getting started

Requirements: `make` and [Docker](https://docs.docker.com/get-docker/). Every Makefile target
runs inside an image built from the root [`Dockerfile`](./Dockerfile) by default — Terraform,
Python, and Node/pnpm all get installed there, pinned to the Dockerfile's own `TF_VERSION`
build arg, its own Python base image tag, and
[`tools/orgviewer/package.json`](./tools/orgviewer/package.json)'s `engines`/`packageManager`
respectively, so nothing else needs installing locally. Set `RUN_IN_DOCKER=0` (e.g. `make check
RUN_IN_DOCKER=0`) to run natively instead — then `terraform`/`python3` are the assumed
prerequisites for this section, plus `uv`/Node+pnpm if you're also touching
`tools/orgapi`/`tools/orgviewer` natively.

```sh
make check      # fmt + validate + plan + team-hierarchy cycle check -- the full pipeline
```

Individual steps (`make fmt`, `make validate`, `make plan`, `make check-team-hierarchy`) are
also available — see the [`Makefile`](./Makefile). This is the same thing CI runs
(`.github/workflows/validate.yml`, `.gitlab-ci.yml`) and what
[`.pre-commit-config.yaml`](./.pre-commit-config.yaml) wires up locally via
[pre-commit](https://pre-commit.com/):

```sh
pip install pre-commit
pre-commit install
```

Two more targets are informational only — never part of `check`, never block a merge, always
exit 0: `make check-friendly` (plain-English validation errors) and `make report-data-quality`
(orphaned people, empty teams, and similar lints). `make check-reviewable-expiration`
(Reviewables past their `expiration_date`, or set more than a year out) is not one of these — it's
a hard gate, part of `make check`.

`make check-orgapi` and `make check-orgviewer` run [`tools/orgapi`](./tools/orgapi/)'s and
[`tools/orgviewer`](./tools/orgviewer/)'s own test suites — separate targets from `check` (same
reasoning as `check-examples` below), also wired into CI and pre-commit.

`org-model/common/org.tf` ships with a placeholder root team (`your-organization` / a
`replace-me` person) rather than real data — `make check` passes against it out of the box, but
it exists to be replaced, not kept. See [Editing org data](#editing-org-data) below.

## Examples

Three worked, runnable examples live under [`examples/`](./examples/), each a self-contained
Terraform root module that sources `org-model/validated/` directly — none is wired into the
root `org-model/` tree above:

- [`examples/single-team/`](./examples/single-team/) — the simplest valid org: one team, no
  departments or squads.
- [`examples/three-level-hierarchy/`](./examples/three-level-hierarchy/) — a 3-level hierarchy
  (organization → department → squad), split into `common/` + `teams/<team>/` the same way the
  root tree is.
- [`examples/complex-org/`](./examples/complex-org/) — a bigger, branchier org (5 levels, 10
  teams, 15 components) covering every scenario `orgviewer`'s graph views can show: direct and
  transitive dependencies, a real dependency cycle, cross-team dependencies, a large
  chain-of-command fan-out, a two-team AuthorityLine, a secondary team membership, a person
  heading two teams at once, a person holding two AuthorityLines at once, and a person holding
  two Roles on one team.

```sh
terraform -chdir=examples/single-team init -backend=false
terraform -chdir=examples/single-team plan
```

Or validate every example at once, the same way CI does:

```sh
make check-examples
```

This is deliberately a separate target from `make check` (not part of the default CI/pre-commit
gate), so a fork that deletes `examples/` never has to untangle its validation logic from the
main gate — see [`docs/architecture.md`](./docs/architecture.md#key-design-decisions).

## Editing org data

**If you're adding or changing people/roles/components for your own team:** edit your team's
file directly under `org-model/teams/<your-team>/`. You never need to touch `common/` or
`validated/` for this. Every field with a plain value (a name, an email, a date) is safe to
edit; fields that reference another entity by its ID (e.g. `head = "alice-nguyen"`) must match
an existing entry somewhere in the data, or `make check` will tell you exactly which check
failed and why.

**If you're a content owner without a Terraform background** (e.g. people-ops maintaining
`org-model/common/` — its organizational content is owned separately from the engineering side;
see [`docs/architecture.md`](./docs/architecture.md#key-design-decisions) for why): the files
use plain HCL syntax
(`key = "value"`, nested with `{ }`), and the fields you'll actually touch are the readable
ones — a person's `name`/`email`, `reviewable.expiration_date`/`notes`, a team's `head`. You
don't need to understand Terraform as infrastructure tooling to edit these safely; the
validation (`make check`) will catch mistakes before they merge either way. See
[`docs/onboarding-people-ops.md`](./docs/onboarding-people-ops.md) for a guide written
specifically for non-engineers — no Terraform background required.

Every directory's review requirements are enforced by
[`.github/CODEOWNERS`](./.github/CODEOWNERS) on GitHub and
[`.gitlab/CODEOWNERS`](./.gitlab/CODEOWNERS) on GitLab (on GitLab, enforcing these as
*required* approvals needs Premium+ — on Free tier it's an informational ownership reference
only) — who can approve a change depends on which directory it touches, not on who happens to
have write access to the repo.

## Using this as a framework in your own org

The intent (see [`docs/architecture.md`](./docs/architecture.md#key-design-decisions) for the
full reasoning) is for `org-model/validated/` to be consumable as a versioned module by other
repos, so an
adopting org writes their own `common/`/`teams/<team>/` data and pins a released version of
the schema/validation logic rather than forking it:

```hcl
module "org" {
  source = "git::https://github.com/<org>/<repo>.git//org-model/validated?ref=vX.Y.Z"
  # GitLab equivalent:
  # source = "git::https://gitlab.com/<group>/<repo>.git//org-model/validated?ref=vX.Y.Z"

  # ... your own merged common/ + teams/<team>/ data, see org-model/main.tf for the pattern
}
```

**No tagged release exists yet** — this is aspirational until the project actually cuts one.
Today, the realistic path is to fork or vendor.

## Documentation map

- [`docs/for-management.md`](./docs/for-management.md) — a non-technical explainer for
  leaders and stakeholders: what this is, why it exists, how to read the org chart.
- [`CONTEXT.md`](./CONTEXT.md) — the glossary. Precise definitions for every domain term, and
  the distinctions between similar-sounding ones.
- [`docs/invariants.md`](./docs/invariants.md) — the source of truth for *what* must hold
  across the data, independent of *how* it's currently enforced.
- [`docs/onboarding-people-ops.md`](./docs/onboarding-people-ops.md) — a guide for editing org
  data with no Terraform/HCL background required.
- [`docs/architecture.md`](./docs/architecture.md) — how `org-model/`, `orgapi`, and
  `orgviewer` relate, and the reasoning behind every non-obvious design decision.
- [`docs/asking-questions-via-mcp.md`](./docs/asking-questions-via-mcp.md) — how to connect an
  MCP client and ask natural-language questions about the org.

## Contributing

Run `make check` before opening a PR/MR — it's the same thing CI enforces. Review requirements
are defined by [`.github/CODEOWNERS`](./.github/CODEOWNERS) (GitHub) and
[`.gitlab/CODEOWNERS`](./.gitlab/CODEOWNERS) (GitLab) and vary by directory.

**GitLab CI needs a Docker-capable runner.** `.gitlab-ci.yml` runs every job through
docker-in-docker (a `docker:27-dind` service) since all CI here goes through the root
[`Dockerfile`](./Dockerfile) — this works out of the box on gitlab.com's own shared runners, but
if you're running self-hosted/custom GitLab runners for your fork, confirm they support the
Docker executor with a `dind` service before relying on this CI passing.

Every PR/MR
touching `org-model/**` also gets an automated, informational plain-English summary of what
changed, posted as a comment/note (see `scripts/summarize_org_diff.py` and
`scripts/post_review_comment.py`) — on GitHub this needs no setup (it uses the automatic
`github.token`); on GitLab it needs a one-time `GITLAB_MR_TOKEN` CI/CD variable (Settings →
CI/CD → Variables — a project access token with `api` scope; GitLab's built-in job token
doesn't reliably have Notes-API permission). Mark that variable **Masked** so it can't surface
validation logic itself (`org-model/validated/`), consider whether it's the kind of decision
that warrants an ADR — see the existing ones in [`docs/adr/`](./docs/adr/) for the bar (hard to
reverse, surprising without context, a real trade-off with genuine alternatives).

## License

Not yet finalized. The current intent — source-available licensing (BUSL 1.1 or PolyForm
Shield) permitting broad commercial/internal use while preventing resale of the project
itself as a standalone product or hosted service, plus trademark protection on the project
name — is undecided. No license has been chosen or applied yet;
until it is, treat this repository as all-rights-reserved.
