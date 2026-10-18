# Architecture map

This is the tech-facing map of the repo: what the three pieces are, how they depend on each
other, where the code actually lives, and the reasoning behind each major design decision. If
you want the non-technical picture instead, see [`docs/for-management.md`](./for-management.md).

## The pieces and how they relate

The repo is four components with a strict, one-directional dependency chain — nothing
downstream is ever consumed by anything upstream of it:

1. **`org-model/`** — Terraform data (no `resource`/`provider` blocks, no `apply` against real
   infrastructure, no backend-configured state — Terraform is used here purely as a typed,
   git-diffable data format, not a provisioning tool) plus its own schema/validation logic. This
   is the actual source of truth. Nothing else in the repo holds org data independently;
   everything downstream reads *this*, evaluated.
2. **`tools/orgapi`** — a Python/FastAPI service. At startup it runs `terraform plan` +
   `terraform show -json` against `org-model/` (or an `examples/` subtree) once and holds the
   result in memory for the process's lifetime — the org data lives in the same deployment as
   the service itself, so it can't change without a redeploy, and redeploy is already the
   mechanism that exposes new data. It re-exposes that data as a filterable HTTP JSON API and,
   from the same FastAPI app, an MCP server generated from the same routes.
3. **`tools/orgviewer`** — a Vite/React single-page app (an earlier Next.js-based design that
   shelled out to `terraform` itself was superseded once orgapi existed to serve the same data
   over HTTP). It never touches Terraform; it fetches from orgapi over HTTP, client-side, per
   view, and renders the graph.
4. **`tools/orgconfluence`** — an Atlassian Forge app for Confluence Cloud: inline macros that
   store a position on a team, or one entity's id, and on every page view ask orgapi who holds
   it or what it is called now. Like orgviewer
   it never touches Terraform and holds no org data of its own.

**Nothing downstream of `org-model/` re-implements or re-validates the schema.** All of it trusts
Terraform's own evaluated JSON output as-is — the same "don't build a second parser/validator
for data Terraform already checked" principle behind `scripts/check_team_hierarchy.py` (the one
check — team-hierarchy cycle detection — that lives outside a Terraform `validation` block
because HCL can't express unbounded-depth recursion).

orgapi re-runs that same team-hierarchy cycle check on every load, via
`tools/orgapi/src/orgapi/team_hierarchy.py`'s `find_cycle` — a deliberate duplicate of
`scripts/check_team_hierarchy.py`'s DFS (same algorithm, same signature), not a shared import,
since there's no shared import path between this unpackaged, stdlib-only script and orgapi's
uv-managed package. `org_data.py` raises if a cycle is found, so orgapi's data guarantees match
`make check`'s here.

## Data flow: from .tf files to a rendered org chart

```
org-model/*.tf --(terraform plan + show -json)--> orgapi --(HTTP/MCP)--> orgviewer
                                             \          \
                                              \          --(HTTP)--> orgconfluence
                                               \
                                                --(same evaluated JSON)--> check_team_hierarchy.py
```

`orgapi` and `scripts/check_team_hierarchy.py` are two independent consumers of the same
Terraform-evaluated JSON — neither one feeds the other. `orgviewer` never talks to Terraform at
all; everything it renders came from `orgapi`. The same goes for `orgconfluence`.

## Repository layout

```text
org-model/            Terraform data + schema — the source of truth. common/ (org-wide types,
                       the single root team), teams/<team>/ (per-team data, empty by default),
                       validated/ (schema + validation), main.tf (composes it all).
tools/
  orgapi/              Python/FastAPI service — loads org-model/ once at startup, re-exposes
                        it as a filterable REST API and an MCP server. See its own
                        README.md for how to run it locally (ports, make targets).
    src/orgapi/
      app.py            the FastAPI app: route registration, filtering, CORS, MCP mount.
      models.py          one Pydantic model per entity, field-for-field against
                          org-model/validated/variables.tf.
      org_data.py        runs terraform plan + show -json once, holds the result for the
                          process's lifetime.
    tests/               endpoint tests, MCP tests, and the schema-drift round-trip test.
  orgviewer/           Vite/React SPA — fetches from orgapi, renders the org/component graphs.
                        See its own README.md for how to run it locally (ports, make targets).
    src/
      pages/             top-level routes: home, a generic view page, an entity detail page.
      views/             one file per graph view (org tree, chain of command, authority-over,
                          team components, component dependencies) plus the view registry.
      components/        shared UI: the graph canvas, node/edge styling, the orgapi-URL setting.
      lib/                orgapi/ (HTTP client, cache, types, data-fetching hooks) and
                          relationships/ (derive line-management, authority, and dependency
                          edges from raw entity data).
    tests/               component and view tests.
  orgconfluence/       Atlassian Forge app — Confluence macros that expand a position on a
                        team into its current holders, or an entity's id into its current name.
                        See its own README.md for how to deploy it.
    src/
      position/          resolving a stored position against orgapi and formatting the result;
                          nothing Confluence-specific.
      entity/            the same for a reference to one entity.
      orgapi/            the HTTP client for orgapi.
      frontend/          the macros and their settings panels (Forge UI Kit).
    tests/               unit tests for everything outside frontend/.
scripts/
  check_team_hierarchy.py   real DFS cycle detection on team.parent_team, reading the same
                             Terraform-evaluated JSON orgapi does — the one invariant a
                             Terraform validation block structurally can't express.
  friendly_check.py         re-prints `terraform plan`'s validation failures as just the
                             error_message text, skipping the module trace/stack context —
                             for the non-technical editing workflow (`make check-friendly`).
  report_data_quality.py    non-blocking data-quality lints (orphaned people, empty teams,
                             blank external_references) — always exits 0 (`make report-data-quality`).
  check_reviewable_expiration.py   blocks any Reviewable whose expiration_date has already
                             passed, or is more than a year out, reading a single `terraform
                             show -json` plan — a hard gate (`make check-reviewable-expiration`,
                             part of `make check`).
  summarize_org_diff.py     plain-English Markdown summary of an org-model diff between two
                             `terraform show -json` plans; drives the PR-diff bot
                             (`.github/workflows/pr-diff-summary.yml`).
  check_retirement_confirmations.py   blocks a Role/AuthorityLine/team.head_deputy going inactive
                             between two `terraform show -json` plans with no matching
                             `retirement_confirmations` entry (`make check-retirement-confirmations`,
                             part of `make check`) -- see docs/invariants.md's "Retirement
                             confirmation".
  post_review_comment.py    posts/updates the PR-diff bot's single comment/note, identically
                             from both the GitHub Actions workflow and the GitLab CI job.
  orgcanon_cli.py                guided scaffolding for common edits (`add-person`, `add-team-member`)
  plan_json.py              the one reader of `terraform show -json` plan documents the scripts
                             above share.
  tests/                    unit tests for the scripts (`make check-scripts`, part of `make check`).
                             — emits plain HCL, then runs `terraform fmt` on the touched file.
examples/              three runnable worked examples (single-team, three-level-hierarchy,
                       complex-org) that source org-model/validated directly — the pattern a
                       real adopter follows.
docs/
  invariants.md          the source of truth for what must hold, independent of how it's enforced.
  architecture.md        this file.
  for-management.md      non-technical explainer for leaders and stakeholders.
  onboarding-people-ops.md   guide for editing org data with no Terraform/HCL background required.
```

## Key design decisions

The reasoning behind every non-obvious choice in this repo, grouped by theme. Each entry states
the decision and the core reason for it — not the full exploration of rejected alternatives,
just enough to know *why* the code looks the way it does before you change it.

**Why Terraform, and its limits**
- **Terraform as data format, not provisioner.** This repo's data flattens into HCL purely as a
  typed, git-diffable format — no custom Terraform provider, no `apply` against real
  infrastructure, no state file tracking real-world resources. Several entities here
  (`AuthorityLine`, `Role`) have no 1:1 counterpart in any downstream system, so building a
  provider around them now would mean inventing synthetic mappings before the schema itself is
  stable. Real provisioning, if it happens, is a separate future consumer that reads this data.
- **Real `terraform plan`/`console`, no resources or providers.** `variable` blocks with
  `object()` constraints define the shape; `terraform plan`/`console` do the type-checking and
  cross-entity invariant checking. Plain `terraform validate` is deliberately *not* used — per
  its own `--help` text it checks validity "regardless of any provided variables," so it never
  evaluates a `validation` block against real data at all. `apply` now also runs, but only
  against a local, git-ignored, throwaway state file (see "departed-person checks" below) — there
  is still nothing for it to provision, so it stays exactly as inert against real infrastructure
  as `plan`-only ever was.
- **Team-hierarchy cycle detection lives outside Terraform.** HCL's `for` expressions can't do
  unbounded recursion, so `team.parent_team` acyclicity can't be checked inside a `validation`
  block at all. `scripts/check_team_hierarchy.py` runs a real DFS instead, reading Terraform's
  own evaluated `teams` output — the one deliberately narrow exception to "every invariant is a
  Terraform `validation` block."
- **Reviewable-expiration bounds checking also lives outside Terraform, but never needs
  `apply`.** `scripts/check_reviewable_expiration.py` reads the same single `terraform show
  -json` plan `check_team_hierarchy.py` does and compares `expiration_date` against
  `datetime.date.today()` in Python — a plain string comparison, not an HCL `validation` block,
  so it never hits the `timestamp()`-defers-to-`apply` behavior described next. The staleness
  (too-old) side was previously a periodic, always-exit-0 report; it's now a hard gate, joined by
  a symmetric max-horizon (too-far-out) bound (`make check-reviewable-expiration`, part of `make
  check`) — see docs/invariants.md's "Reviewable expiration must not be lapsed" and "Reviewable
  expiration must not be set too far out".
- **Departed-person checks require `apply`, not just `plan`.** These checks depend on
  `timestamp()`, and Terraform defers evaluating any `validation` condition that depends on
  `timestamp()` until `apply` — confirmed by testing, not documented behavior. `plan` alone
  silently lets a violation through. `make check` and orgapi's `load_org_data` both now run
  `apply -state=<throwaway path>` after `plan` for this reason.
- **Retirement-confirmation checking lives outside Terraform, for a different reason than
  team-hierarchy cycle detection.** A single `terraform plan`/`apply` only ever sees one state,
  so nothing inside `org-model/validated/` can tell that a Role/AuthorityLine/`head_deputy`
  *used to* be active — that requires a real git diff between two commits.
  `scripts/check_retirement_confirmations.py` reads two `terraform show -json` plans (before/after,
  via `git worktree`, same mechanism `scripts/summarize_org_diff.py` already uses) instead. Unlike
  that script (informational only), this one is a hard gate — see docs/invariants.md's
  "Retirement confirmation" section.
- **`component.dependency_components` is allowed to cycle; `team.parent_team` isn't.** This is a
  deliberate asymmetry, not an oversight — `parent_team` is a strict hierarchy by construction (a
  team can't organizationally report up through itself), while component dependencies describe
  real technical relationships, and real systems legitimately have circular dependencies. Only
  reference integrity is checked on `dependency_components`.

**Entity modeling**
- **Synthetic Entity ID, not `email`/`name`, as the reference key.** HCL variables have no object
  pointers — a reference field can only point at another entity via a string matching a map key.
  Reusing `email`/`name` directly was rejected because org data churns (renames, email domain
  migrations); a synthetic id used only for pointers stays stable regardless of what the
  human-readable fields say later.
- **The Entity ID is a human-readable slug, frozen at creation** (e.g. `alice-nguyen`), not an
  opaque UUID — this project's value proposition rests on git diffs and PR review being
  meaningful, and an opaque id in a reference field defeats that. It never regenerates even if
  the underlying name changes later; collisions get a disambiguating suffix.
- **`FormalPosition`/`Role`/`AuthorityLine` split by function, not by team-scope.** Every
  leadership function is an `AuthorityLine`, even one that currently applies to exactly one team
  — scope is incidental (a Tech Lead can grow from one team to several without the function
  itself changing), so splitting by scope would mean reclassifying data every time a function's
  reach changed. `Role` is reserved strictly for non-leadership component ownership.
- **`Team.head` is not an `AuthorityLine`**, despite having the same deputy/succession shape.
  `AuthorityLine` is deliberately a *weaker, functional* power channel; `Team.head` is the one
  formal, structural management channel. Collapsing them would erase the distinction between
  "someone who directs your work" and "someone who can hire, fire, and review you."
- **Line-management is three independent, direct rules, not one rule applied recursively.** The
  obvious generalization ("your line manager is the head of your primary team, and a team's head
  is themselves a primary member of their parent team") self-contradicts for `Team.head` — it
  produces a self-loop. The three direct rules: an ordinary member's line manager is their
  primary team's head; a team head's line manager is the parent team's head; a team head's
  deputy's line manager is that team's own head. The root team's head has none.
- **`Person.line_manager` is derived, never stored.** A stored copy creates a second place that
  can silently go stale when `Team.head` changes in a reorg. A derived value can't desync because
  there's nothing to desync — it's recomputed from `Team`/`Team.members` every time.
- **`AuthorityLine`'s category is a validated reference (`AuthorityLineType`), with no separate
  freeform title** — unlike `FormalPosition`, which keeps both a `type` reference and its own
  concrete `title` per a documented naming convention. No equivalent per-instance naming need has
  ever come up for `AuthorityLine`, so there's no second field for it.
- **`Reviewable.owner` is restricted to `Person`, not `Team`, for now.** A team could plausibly
  own an entity's review instead of an individual, but nothing in current usage has established a
  need for that yet — narrowing scope now costs little, and extending `owner` to accept a `Team`
  reference later would be a small, additive change if the need shows up.
- **`Team.type`/`Component.type` are references to type entities, not plain strings** —
  mirroring how `FormalPosition`/`AuthorityLine` already express their categories, and letting a
  type record carry `description`/`documentation_url`/`reviewable` metadata a bare string never
  could. The referenced type's `title` itself stays illustrative, not a closed list — a hardcoded
  closed-list `validation` block would mean keeping two independent copies of the same list in
  sync by hand, for a guarantee `common/`'s people-ops review already provides a different way.

**Directory/ownership structure**
- **Org data is split into per-team directories, nested to mirror the org chart, owned by
  CODEOWNERS.** A single shared data file makes per-team review impossible. Every level of the
  hierarchy with its own head gets its own `org-model/teams/<team-id>/` directory, nested
  directly inside its `parent_team`'s directory (e.g.
  `org-model/teams/engineering/payments-squad/payments-core/`), so the org chart is visible from
  the tree itself. A reorg (changing `parent_team`) does require moving the directory and
  updating its module `source` string and CODEOWNERS entry — a same-shape cost to any other file
  move, traded for every other read of the hierarchy being easier. CODEOWNERS still requires one
  explicit line per team at its full nested path regardless of depth, since path-prefix matching
  would otherwise let a parent team's line silently cover its descendants. `org-model/main.tf`
  composes every team module's outputs; CODEOWNERS gates review per directory, with `common/`'s
  organizational content (root team, type vocabulary) owned by people-ops rather than platform.
  This is enforced by [`.github/CODEOWNERS`](../.github/CODEOWNERS) on GitHub and
  [`.gitlab/CODEOWNERS`](../.gitlab/CODEOWNERS) on GitLab — same directory→owner mapping,
  translated per-platform (GitLab enforcement as *required* approvals needs Premium+; on Free
  tier it's an informational ownership reference). A team may reference another team's entities
  directly with no required review from the referenced team — a dependency is the consumer's
  call to make, the same way importing a public package doesn't need the package owner's
  permission.
- **Worked example org data lives under `examples/`, not the root tree.** The root `org-model/`
  tree ships as a clean skeleton (one obviously-fake placeholder team/person) instead, so an
  adopting org's first PR is additive, not a deletion of someone else's example data.
  `examples/single-team/`, `examples/three-level-hierarchy/`, and `examples/complex-org/` are
  separate, self-contained Terraform root modules; `make check-examples` is a distinct target
  from `make check` so a fork that deletes `examples/` never has to untangle its validation logic
  from the main gate.

**Editability & distribution**
- **`org-model/validated/` ships as a versioned Terraform module; editing stays raw HCL.** An
  adopting org writes their own `common/`/`teams/<team>/` data and pins a released version of the
  schema, rather than forking it — editing raw HCL directly avoids maintaining a second,
  generated-format editing pipeline alongside it.
- **Population Modules ship from this repo; `apply`ing them happens in the adopting org's own
  repo.** `modules/<system>/` map org-model's entities onto real provider resources
  (`github_team`, etc.), read via each entity's `external_references`. This repo and its CI never
  gain provisioning credentials or run `apply` against anything real — an adopting org's own infra
  repo imports both `org-model/validated` and these modules, supplies real credentials, and owns
  the actual `plan`/`apply`/state.

**The orgapi/orgviewer stack**
- **orgapi is Python/FastAPI, not TypeScript like orgviewer.** orgapi is a pure JSON data API
  with no graph-rendering deliverable pulling in React/JS, and Python is already this project's
  dominant language everywhere except orgviewer's UI layer. orgapi's own "shell out to
  `terraform plan`/`show -json` once at startup" logic is independent of orgviewer, which never
  touches Terraform itself — it fetches everything from orgapi over HTTP instead — with its own
  Pydantic models mirroring `org-model/validated/variables.tf`'s shape.
- **orgapi uses `uv` for Python dependency management** — a single static binary managing the
  virtualenv, lockfile, and pinned Python version with no separate install step, the same
  self-contained-toolchain shape as Terraform's own version pinning.
- **All dev/CI tooling installs route through one Dockerfile, Docker-first by default.** The
  root [`Dockerfile`](../Dockerfile) is a single stage on `python:3.12-slim` that always
  installs Terraform, `gh`, `uv`, and Node/pnpm, and builds orgviewer's bundle into the image —
  one image, `orgcanon`, for validation and every tool, rather than a matrix of toolchain
  combinations to keep straight. Its only switch is the `DEV_TOOLS` build arg: `0` leaves out
  what only tests need (orgapi's `dev` dependency group, orgconfluence's dependencies) for an
  image that just runs orgapi. Every Makefile here (root and each `tools/*/`) runs its targets
  inside that image by default (`RUN_IN_DOCKER=1`), so Docker plus `make` are the only real
  local prerequisites — set `RUN_IN_DOCKER=0` to fall back to native execution instead, which
  expects `terraform`/`uv`/pnpm already on `PATH` rather than installing them. Building the
  image is its own explicit step (`make docker-image`), never a side effect of another target:
  a rebuild re-runs the bundle build on any source change, too slow to pay on every `make dev`
  or `make test`, and source edits reach a running target through the bind-mounted working tree
  anyway — only the Dockerfile, the dependency manifests, and the baked bundle need a rebuild
  to take effect. `check-orgapi`/`check-orgviewer`/`check-orgconfluence` (each tool's own `make check`: every
  kind of check it has, each also a target of its own) are part of CI and pre-commit alongside
  the Terraform checks. Containers run as root rather than a
  host-UID-mapped user — dependency-linking tools like `pnpm install`'s bin-linking step
  `chmod` files unconditionally, which only the owner (root, baked in at image-build time) can
  do. This is harmless because nothing root writes ever lands on the host filesystem in the
  first place: dependency dirs (`.venv`, `node_modules`) and every target's own output
  (Terraform's plan/provider cache, pytest's cache, the orgviewer build) all live in named
  Docker volumes rather than the bind-mounted working tree, so there's no ownership to fix up
  afterwards. Every `docker run` uses `--init` with `TINI_KILL_PROCESS_GROUP=true`: otherwise
  the container's PID 1 is `make` itself, Docker delivers Ctrl+C to that one PID only, and a
  `dev` target never stops. CI's automated PR/MR-comment posting (`post-review-comment`) runs the same way, as
  its own Docker-wrapped Makefile target reading the prior target's output off that same volume
  — nothing needs to reach the host at all.
- **The schema-drift test round-trips real Terraform JSON, not a hand-written HCL parser.**
  orgapi's Pydantic models duplicate the shape already declared in
  `org-model/validated/variables.tf` — a second, hand-maintained description that can silently
  drift. The test runs `terraform show -json` against real data and feeds each entity's JSON into
  its bare Pydantic model with `extra="forbid"`, so an added or removed field fails as an
  unexpected or missing key, with zero new dependencies.
- **The MCP layer is generated by `fastapi-mcp`, not hand-written tools.** It builds one MCP tool
  per route directly from the FastAPI app's own OpenAPI schema, so there's no second,
  hand-maintained tool definition to drift out of sync. Each tool call runs as an in-process ASGI
  request against the same FastAPI app object, so an MCP call and the equivalent REST call go
  through identical routing, dependency injection, validation, and serialization.
- **orgviewer is a Vite/React SPA that fetches from orgapi client-side, per view, and never
  touches Terraform directly.** It ships as a static bundle deployable to an arbitrary static
  host (S3 or similar) with no Node runtime required to serve it.
- **orgviewer is one shared graph canvas per structure, with relationship types as overlay
  edges** — not a separate page per relationship. Chain-of-command and authority-over are
  relationships *on top of* the same org tree, not separate graphs, so they render as
  distinctly-styled overlay edges on one react-flow canvas rather than a separate
  list/breadcrumb page each. This is about relationship views; the entities table below is
  deliberately not one.
- **orgviewer's entities table derives its columns from the data and filters/exports in the
  browser.** Columns are whatever fields orgapi returned (nested ones flattened), not a column
  list kept in orgviewer — a third hand-maintained copy of the schema would go stale silently,
  and freeform map keys (`external_references`, `extensions`) can only come from data anyway.
  Filtering and CSV export run client-side over the whole collection, with no orgapi export
  endpoint: orgapi's own filters are exact-match on scalar fields only, and the export has to be
  exactly the filtered, reordered table the user is looking at.
- **orgviewer's routes are hash-based, prefixed `/ui`.** Browser-History-API routing would need
  the host to serve `index.html` for any unrecognized path — a per-host config step that can't be
  verified without knowing the eventual host. Hash-based routing (`/ui/#/views/...`) means the
  fragment never reaches the server, so the only real path any host needs to serve is
  `/ui/index.html`.
- **orgconfluence is a Forge app each organisation deploys itself, and stores references, not
  names.** A position macro holds a team plus a head/Role/AuthorityLine type, never the person;
  an entity macro holds a type and id, never the name. Both ask orgapi on every page view, with no cache and no remembered last answer — a page showing an out-of-date holder
  is worse than one saying it can't tell. It is a Forge UI Kit macro rather than a browser
  extension or an iframe app so it renders for every reader with nothing to install and sits
  inline in a sentence. Forge fixes an app's callable addresses in its manifest and calls them
  from Atlassian's servers, so there is no shared, hosted copy: each organisation registers its
  own, with its orgapi address and app id supplied as deploy-time variables.
- **orgconfluence links a person to their Atlassian profile when the org data has their
  Atlassian account id**, read from `external_references.atlassian_account_id`, keeping a small
  second link to orgviewer; without the id the name links to orgviewer. It is a plain link rather
  than a Confluence mention because a Forge macro can't render a working one. It is the first shipped tooling to read a
  specific `external_references` key, which is why the keys are now listed in one place
  ([`external-references.md`](./external-references.md)) with the ones tooling reads marked: a
  freeform map only works as an integration point if everyone files an identifier under the same
  name.
- **The credentials protecting an exposed orgapi are checked in front of orgapi, not by it.**
  orgconfluence needs orgapi reachable from the internet and sends whatever request headers its
  deployment configures (a bearer token, Cloudflare Access service-token headers, an API key);
  whatever proxy exposes orgapi rejects requests without them. The headers are configured as
  data rather than as a choice of named schemes, so a new kind of proxy needs no code change. orgapi stays
  authentication-free for the callers on its own network — orgviewer runs in the browser and
  could not keep a secret anyway.
- **orgapi can serve orgviewer's bundle itself, under `/ui`.** Pointing orgapi's `VIEWER_DIR`
  at a built bundle mounts it at `/ui` next to orgapi's own root-level routes, so one process
  on one origin is a complete deployment with no reverse proxy to stand up; the image built
  from the root Dockerfile comes wired this way. It stays optional — unset, orgapi is API-only
  — so orgapi never needs Node to run or test, and orgviewer remains a plain static bundle any
  other host can serve. orgviewer's default orgapi URL is its own origin to match.
- **orgapi allows CORS from any origin.** orgapi's base URL, from orgviewer's side, is a
  user-editable field that can point at an instance on a different origin than the one serving
  the SPA (e.g. local dev, with orgviewer on Vite's dev server). This is safe specifically because orgapi is read-only with no
  authentication or session state — there's no credential or cookie permissive CORS could leak.
