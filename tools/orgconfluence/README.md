# Org Confluence

Two Confluence Cloud macros that keep what a page says about the org in step with the org data.

**OrgCanon position** turns a position on a team into the people who hold it right now:

> Sign-off comes from the **Tech Lead (Bob Santos, deputy Carol Diaz)** of the platform team.

The page stores the *position* (a team plus its head, one of its Roles, or an AuthorityLine type
over it), never the person, so a page never needs editing when a position changes hands.

**OrgCanon entity** shows the current name of any one entity in the org data -- a person, team,
Role, component, AuthorityLine, or one of the type lists:

> The **Payments API** is owned by **Platform**.

The page stores the entity's id, so the name follows a rename and a removed entity shows up as an
error instead of a stale name.

Both ask [`orgapi`](../orgapi/README.md) on every page view, and link what they show to its page in
[`orgviewer`](../orgviewer/README.md) -- and a person who has an Atlassian account to their
Atlassian profile as well.

It is an [Atlassian Forge](https://developer.atlassian.com/platform/forge/) app that each
organisation deploys for itself, pointed at its own orgapi -- there is no shared, hosted copy. See
[`../../docs/architecture.md`](../../docs/architecture.md#key-design-decisions) for the reasoning.

## Using the macros

Type `/orgcanon` in the Confluence editor and pick one.

**OrgCanon position** asks for:

- **Team**, then **Position** -- the positions currently held on that team: its head, each Role in
  its `members`, and each type of AuthorityLine active over it.
- **Show** -- the holder (default), the deputy, or both.
- **Text to show instead of the position's name** -- optional, for sentences where the name from
  the org data reads badly ("our security contact (Alice Nguyen)").

**OrgCanon entity** asks for a **Type** and then the **Entity**, searchable by name, with its id
alongside to tell namesakes apart. AuthorityLines have no name of their own, so each is listed as
its type, holder and teams, and only the ones active today are offered.

## People with an Atlassian account

Wherever either macro shows a person, it checks that person's `external_references` for
`atlassian_account_id` (see [external references](../../docs/external-references.md)):

- **With it**, the name links to the person's Atlassian profile on your site, followed by a small
  `↗` that links to their orgviewer page: `Tech Lead (Bob Santos ↗)`. The `↗` is left out when no
  orgviewer URL is configured.
- **Without it**, the name links to orgviewer.

The name shown is always the org data's. Everything around it -- brackets, `deputy`, `interim`,
`ended` -- is the same either way, and one rendering can mix both kinds. Teams and every other
entity always link to orgviewer.

The account id is not checked: a mistyped one gives a link to a profile page that doesn't exist.

This is a link, not a Confluence @-mention, because a Forge macro can't render a working one: the
elements Forge offers for it draw the name without the profile card or any link.

## What a position renders

| Situation | Rendering |
|---|---|
| One holder | `Tech Lead (Bob Santos)` |
| Several holders | `Tech Lead (Bob Santos, Dana Lee)` |
| Holder and deputy | `Tech Lead (Bob Santos, deputy Carol Diaz; Dana Lee)` |
| Deputy only | `Deputy Tech Lead (Carol Diaz)` |
| An interim holder or deputy | `Tech Lead (Bob Santos, interim, interim deputy Carol Diaz)` |
| Nobody holds it, or no deputy is set | `Tech Lead (vacant)` |
| orgapi can't be reached | `Tech Lead (⚠ unavailable)` |
| The team, Role or AuthorityLine type no longer exists | `⚠ unknown position: platform / tech-lead` |

The position's text is the Role's `name`, the AuthorityLine type's `title`, or the team's
`head_title` -- the same for every holder. A head deputy is shown under the team's
`head_deputy_title`; any other deputy under `Deputy <name>`.

Nothing is cached and no last-known name is kept: an unreachable orgapi shows `unavailable` rather
than a name that may be out of date. Only AuthorityLines active today count, and nothing cascades
from parent teams -- see orgapi's `GET /teams/{team_id}/people`, which this is a rendering of.

## What an entity renders

| Situation | Rendering |
|---|---|
| Any entity but an AuthorityLine | its `name` (or, for the type lists, `title`): `Platform` |
| An AuthorityLine | its type and holder: `Tech Lead (Bob Santos)` |
| An AuthorityLine that has ended | `Tech Lead (Bob Santos, ended)` |
| An AuthorityLine that hasn't started | `Tech Lead (Bob Santos, from 2027-01-01)` |
| orgapi can't be reached | the name it had when the macro was set up: `Platform (⚠ unavailable)` |
| The entity no longer exists | `⚠ unknown team: platform` |

An AuthorityLine keeps rendering after it ends, marked as ended -- a reference to one is a pointer
to that record, unlike a position, which only ever counts the lines active today. Its deputy and
interim flag are not shown; use a position for those.

## Deploying

You need an Atlassian account that can install apps on your Confluence site, Node 22 or 24, and
the Forge CLI (`npm install -g @forge/cli`, then `forge login`). Run everything below from this
directory, starting with `npm install`: Forge packages the app from this directory's own
`node_modules`, which `make check` never creates here -- it keeps its copy inside Docker. If Docker
has left an empty, root-owned `node_modules` behind, remove it first.

### 1. Expose orgapi, behind a shared secret

Forge calls orgapi from Atlassian's servers, so orgapi needs a public HTTPS address. orgapi itself
has no authentication -- it is built to sit on a trusted network -- so the check belongs on
whatever exposes it. The macro sends `Authorization: Bearer <secret>` on every request; reject
anything else there. With nginx, for example:

```nginx
location / {
    if ($http_authorization != "Bearer <secret>") { return 401; }
    proxy_pass http://orgapi:8387;
}
```

Internal callers (orgviewer, MCP clients) keep reaching orgapi directly and need no secret.
Restricting that address to
[Atlassian's published IP ranges](https://support.atlassian.com/organization-administration/docs/ip-addresses-and-domains-for-atlassian-cloud-products/)
as well is a sensible second layer.

orgviewer only has to be reachable from readers' browsers, so it can stay internal.

### 2. Register your own copy of the app

`manifest.yml` takes the app id and the orgapi address from two environment variables, so nothing
specific to your organisation is committed:

```sh
export ORGAPI_URL=https://orgapi.example.com
export FORGE_APP_ID=ari:cloud:ecosystem::app/00000000-0000-0000-0000-000000000000  # any value, until registered
forge register org-position
```

`forge register` creates the app under your account and writes its real id into `manifest.yml`'s
`app.id`. Export that id as `FORGE_APP_ID` and put `id: ${FORGE_APP_ID}` back, or keep the edit as
a local change -- either works.

### 3. Configure, deploy, install

```sh
forge variables set ORGAPI_URL https://orgapi.example.com
forge variables set --encrypt ORGAPI_SECRET <secret>
forge variables set ORGVIEWER_URL https://org.example.com/ui   # optional; without it nothing is linked

forge deploy
forge install --product confluence --site <your-site>.atlassian.net
```

`ORGAPI_URL` appears twice on purpose: the exported one is read when the manifest is parsed and
becomes the one external address Forge lets the app call; the `forge variables` one is what the
running app reads. They must match. Changing the address means changing both and redeploying, and
Confluence will ask a site admin to approve the new address.

`forge deploy` and `forge install` target Forge's `development` environment by default; add
`-e production` to both, and to each `forge variables set`, for the real thing.

## Who can see what

The macros return names and Atlassian account ids, not the rest of any record. Anyone who can view a page on the site can
make their backend list every entity of every type and look up any team's positions, so treat
every name in the org data -- people's included -- as visible to every Confluence user on the site.

## Code layout

```text
manifest.yml           the Forge app: two inline macros, their settings panels, one backend
                        function.
src/
  index.ts              the backend function's entry point.
  resolvers.ts          what the UI can ask the backend: list what can be picked, and resolve a
                         stored position or entity.
  orgapi/client.ts      the only code that talks to orgapi.
  orgviewer.ts          builds links to orgviewer's entity pages.
  segments.ts           the text-and-link pieces both macros render.
  position/             everything about a position that isn't Confluence-specific: reading a
                         stored macro config, resolving it against orgapi, and turning the result
                         into segments.
  entity/               the same for an entity reference.
  frontend/
    position.tsx, entity.tsx                  each macro as it appears on a page.
    position-config.tsx, entity-config.tsx    each macro's settings panel.
tests/                 unit tests for everything outside frontend/.
```

Nothing outside `src/frontend/` knows about Confluence, so another Forge module (a Jira custom
field, say) can reuse it.

## Tests

```
make check     # lint + typecheck + test, each also a target of its own
```

This is what `make check-orgconfluence` at the repo root, CI and pre-commit run. It covers the
logic and type-checks the UI against Forge's own component types; it does not deploy anything. The
macros' behaviour inside Confluence can only be checked by deploying it to a site.
