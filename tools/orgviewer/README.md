# Org Viewer

<img src="../../docs/assets/mascot/mascot-square.png" alt="OrgCanon mascot: a bee wearing a hardhat" width="160" />

A static single-page app that visualizes org structure (org tree, chain of command, authority,
team components, component dependencies) as react-flow graphs. It has no backend of its own --
all data comes from [`orgapi`](../orgapi/README.md) over HTTP. It's a Vite/React SPA rather than
the original Next.js design, since Org Viewer ships as a static bundle to an arbitrary static
host with no server-side work left once OrgAPI exists to serve the data; its routes are
hash-based under `/ui` so no host-specific rewrite/fallback config is needed. See
[`../../docs/architecture.md`](../../docs/architecture.md#key-design-decisions) for the full
reasoning.

## Running it

```
make install   # pnpm install
make dev       # vite dev server with HMR, http://127.0.0.1:5173/ui/
make build     # tsc --noEmit && vite build -> dist/, a static bundle deployable as-is
make test      # pnpm test (vitest)
```

`dist/` needs no server-side logic to serve -- any static file host works (S3, a CDN, a plain
`vite preview`, etc.), as long as it serves `dist/index.html` for the one real path
(`/ui/index.html`); the hash-based router handles everything after `#` client-side, so no
rewrite/fallback rule is required.

## Pointing it at OrgAPI

OrgAPI's URL is set in the app itself (top of every page), not baked in at build time: it
defaults to `<current origin>/api` (i.e. Org Viewer and OrgAPI are assumed to be fronted by the
same host, split by path -- `/ui` for this app, `/api` for OrgAPI), and can be overridden by
hand. An override is saved to the browser's `localStorage` and reused on future loads.

In local dev, the default guess is wrong (Vite's dev server and a locally-running OrgAPI are on
different ports) -- type the real URL (e.g. `http://127.0.0.1:8387`, from OrgAPI's own `make dev`)
into the field once; it's remembered from then on. This only works because OrgAPI allows CORS
from any origin -- without that, the browser would block the cross-origin request.

## Views

Each view fetches only the OrgAPI entity collections it needs (not one big fetch-everything
call), through a client-side cache shared across views so navigating between views that need the
same entities (`teams`, `people`) doesn't re-fetch them every time. `component-dependencies` and
`team-components` both fetch the full `components` collection unfiltered rather than using
OrgAPI's server-side `?team=...` filter: dependency counts on a component card need the full
dependency graph regardless of which team owns it, and `team-components`' indirect mode needs
components owned by more than one team at once, so a single team's filtered slice is no longer
enough. `chain-of-command` and `authority-over` filter on list fields OrgAPI's own filtering
doesn't support, so those still fetch full collections and filter in the browser.

Every view is related-only and blank until its picker has a selection, except `org-tree` (which
always renders the whole tree; selection there only drives the highlight and camera). To see
every scenario at once -- a real dependency cycle, cross-team dependencies, a large
chain-of-command fan-out, an AuthorityLine spanning two teams, a secondary team membership, a
person heading two teams at once, the same person holding two AuthorityLines at once, and a
different person holding two Roles on one team -- point it at OrgAPI serving
[`examples/complex-org`](../../examples/complex-org) rather than the
smaller `examples/three-level-hierarchy` (`make dev-complex-org` from `tools/orgapi/`); see
[`../../examples/README.md`](../../examples/README.md) for what each example is for.

Every view's graph auto-lays-out with ELK by default, but both node cards and connections are
manually rearrangeable: drag a card to move it, or drag anywhere along a connection to bend it
there (double-click or right-click a bend point to remove it). The moment you touch anything, that
one graph's exact arrangement -- which selection, which mode (e.g. direct vs. transitive) -- is
saved to the browser's `localStorage` and used instead of the auto layout on future visits; a
"Reset graph" button appears once you have and puts that one graph back to its auto layout.
Rearranging is entirely manual from that point on -- untouched connections still auto-follow a
card you move, but nothing auto-avoids new overlaps the way the initial ELK layout does.

## Tests

`tests/lib/orgapi/` -- the base-URL resolution/persistence, the orgapi fetch client (URL/query
construction, response reshaping), and the shared cache's dedupe behavior, all against a mocked
`fetch`.

`tests/views/` -- each view rendered with `fetch` mocked against a small fixture
(`tests/fixtures/three-level-org-data.json`), asserting the same invariant the pre-orgapi tests
did: every edge fed to `<GraphCanvas>` references a node that actually exists.
`<GraphCanvas>` itself is mocked out in these tests -- react-flow needs real layout dimensions to
render edges at all, which jsdom doesn't provide, so props are captured directly instead.

`tests/lib/relationships/` and `tests/components/` -- unchanged pure-function/component tests,
unaffected by the orgapi rework.
