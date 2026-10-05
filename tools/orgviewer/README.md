# Org Viewer

<img src="../../docs/assets/mascot/mascot-square.png" alt="OrgCanon mascot: a bee wearing a hardhat" width="160" />

A static single-page app that visualizes org structure (org tree, chain of command, authority,
team components, component dependencies) as react-flow graphs, plus a table of any entity type
that exports to CSV. It has no backend of its own -- all data comes from
[`orgapi`](../orgapi/README.md) over HTTP. It's a Vite/React SPA rather than the original Next.js
design, since Org Viewer ships as a static bundle to an arbitrary static host with no server-side
work left once OrgAPI exists to serve the data; its routes are hash-based under `/ui` so no
host-specific rewrite/fallback config is needed. See
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

Each view's picker is a collapsible tree with a filter box: teams nest by parent team, people by
derived line manager, and components under their owning team. It opens fully expanded; branches
you collapse stay collapsed until the page reloads. Typing filters to matching names
plus their ancestors; arrow keys move and expand/collapse, Enter selects, Esc closes.

Each view's toolbar state -- the picker selection and every checkbox -- lives in the URL's query
string, so a copied link reopens the same view as it was. Defaults (the picker's default selection
and each checkbox's default) are written into the URL as soon as the view opens. Each view also remembers the query string it was last left with (in
`localStorage`), and the navigation links reopen it, so switching between views keeps every
view's selection and checkboxes.

Every graph has a legend in the bottom-right corner listing the kinds of connection currently on
screen. It can be collapsed, and that choice is kept in the query string (`legend`).

Any graph with foldable cards also gets "Fold all" (⊟) and "Unfold all" (⊞) buttons in the
bottom-left controls. "Fold all" folds every foldable card, nested ones included, so expanding a
card afterwards reveals one level at a time. Both choices are saved like a single card's fold.

The camera (`zoom`, plus the pan as `x`/`y`) is part of the query string too, updated whenever it
settles without adding history entries, so a reload or a copied link opens the graph exactly as it
was framed. A graph whose URL has no camera yet is fitted to the screen when it first appears.
After that, re-laying it out (folding, changing the selection or a checkbox, "Reset graph") keeps
your zoom and holds one card still on screen: the card whose fold button you clicked, otherwise
the selected card. If neither card is in both the old and the new layout, the camera stays where
it was.

## Entities table

The `entities` view lists any one entity type as a table: one row per entity, switched with the
tabs at the top (`people` by default). It's the one view that isn't a graph -- it exists to list,
filter and export, not to show a relationship.

Columns come from the data OrgAPI returns, not from a column list kept in this app, so a field
added to the schema shows up with no change here. Nested fields flatten into dotted columns
(`reviewable.owner`, `external_references.github_accountname`, `extensions.hr.hiring_type`); a list
of ids is one column joined with `; `; a list of objects (`members`, `positions`) is one column
with each item written as `key=value, key=value`. References show the Entity ID, linked to that
entity's page, and the first column is always the row's own `id`.

The **Columns** button picks which columns are shown and in what order (checkboxes, plus up/down
buttons). By default `id`, the plain fields and lists of ids are shown; flattened columns, object
lists and `description` start hidden. The layout is remembered per entity type in `localStorage`
and comes back when you switch to that type's tab; **Reset to default** forgets it.

The row under the header filters: each box matches a case-insensitive substring of that column's
text, and filters on several columns must all match. A lone `-` matches only empty cells (e.g.
teams with no `head_deputy`). True/false columns get an any/true/false dropdown instead. Clicking
a header sorts by it -- ascending, then descending, then off. Hiding a column drops its filter and
sort, so nothing you can't see narrows the table.

**Export CSV** downloads `<entity>.csv` with exactly what's on screen: the visible columns in
their order, the rows that pass the filters, in the current sort order. It's comma-separated with
a header row of column names, UTF-8 with a byte-order mark (so Excel reads non-ASCII names
correctly), and any value starting with `=`, `+`, `-` or `@` is prefixed with `'` so a spreadsheet
doesn't run it as a formula.

Everything but the remembered layout is in the query string, so a copied link reopens the same
table: `entity`, `cols` (comma-separated, omitted for the default layout), `sort` (a column name,
`-` prefix for descending) and one `f.<column>` per filter, e.g.
`#/views/entities?entity=teams&cols=id,name,head&sort=-name&f.head=alice`.

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

`tests/lib/table/` -- the entities table's pure pipeline (deriving columns and rows from a
collection, filtering/sorting, CSV serialization, URL-param handling, layout memory), with no
rendering. `tests/views/entities-view.test.tsx` covers the same pipeline end to end through the UI,
including the exact CSV handed to the download.
