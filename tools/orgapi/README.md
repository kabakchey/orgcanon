# OrgAPI

Read-only HTTP API over the org-as-code data model (see the root `CONTEXT.md`): fetch by id,
fetch-all, filter by basic attrs. No UI, no auth. It's Python/FastAPI (a pure JSON data API,
FastAPI's core use case) using `uv` for dependency management. See
[`../../docs/architecture.md`](../../docs/architecture.md#key-design-decisions) for the full
reasoning, including how its schema-drift test works and how its MCP layer is generated.

CORS is enabled for any origin (`Access-Control-Allow-Origin: *`) on all routes -- safe here only
because OrgAPI is read-only and has no auth/session state. This lets `orgviewer` (or any other
browser-based client) call OrgAPI from a different origin, e.g. a local dev server pointed at a
separately-running OrgAPI instance.

## Running it

```
make install   # uv sync
make dev        # serves the real org-model/ data at http://127.0.0.1:8387, --reload on
make test       # uv run pytest
```

`make dev-<name>` serves one of the `../../examples/<name>` directories instead, e.g.
`make dev-single-team`, `make dev-three-level-hierarchy`, or `make dev-complex-org` (the biggest
of the three -- see [`../../examples/README.md`](../../examples/README.md) for what each is for).

## Configuration

Read once at process startup (see `src/orgapi/app.py`'s `lifespan`) -- if loading fails for any
reason (bad path, `terraform` not found, data that fails a Terraform `validation` block), the
process exits before accepting any connections, rather than serving errors per request.

- `DATA_DIR` (default `../../terraform`, relative to this directory) -- the Terraform root
  module to serve.
- `TERRAFORM_BIN` (default `terraform`, resolved via `PATH`) -- the `terraform` binary to shell out to.

Host/port aren't app-level settings; use uvicorn's own flags (`uv run uvicorn orgapi.app:app
--host --port`), which `make dev` already wires up for the default port.

## Endpoints

One route pair per entity in `org-model/validated/variables.tf`, named exactly like
`org-model/outputs.tf`'s output keys (snake_case, not kebab-case -- this API's job is to expose
Terraform's own vocabulary faithfully, not translate it):

```
GET /formal_position_types           GET /formal_position_types/{id}
GET /authority_line_types            GET /authority_line_types/{id}
GET /team_types                      GET /team_types/{id}
GET /component_types                 GET /component_types/{id}
GET /people                          GET /people/{id}
GET /roles                           GET /roles/{id}
GET /teams                           GET /teams/{id}
GET /authority_lines                 GET /authority_lines/{id}
GET /components                      GET /components/{id}
```

`GET /{entity}/{id}` returns the entity plus its `id` (the Terraform map key, spliced in --
Terraform's own data never carries `id` on the entity itself); 404 if the id doesn't exist.

`GET /{entity}` returns an array of every entity, `id` included, optionally narrowed by query
params.

`GET /all` returns the entire org data model in one response: a JSON object keyed by entity type
(same keys as above), each value the same unfiltered array `GET /{entity}` returns. No query
params -- use this for a full snapshot instead of calling every `/{entity}` route separately.

## Filtering

Query params match the entity's **scalar fields only** (`str`, `bool`, and reference-id
strings, which are also `str`) -- e.g. `GET /components?team=platform&is_end_user_facing=true`.
List fields (`dependency_components`, `secondary_specializations`, ...) and nested objects
(`reviewable`, `positions`, `members`, ...) aren't filterable; fetch-all and filter client-side
for those. Multiple params combine with AND. An unrecognized param name, or a value that
doesn't match the field's type (e.g. `is_hierarchical=maybe`), is rejected with `422` -- each
entity's allowed filters are generated from its Pydantic model, so this is enforced the same
way FastAPI enforces everything else, not hand-rolled.

Full interactive docs (including the exact filter fields per entity): `GET /docs` once the
server is running. Swagger UI there loads its spec from `GET /spec` -- FastAPI's normal
`/openapi.json` path isn't served; the spec is generated live from the routes and Pydantic
models on every request, never hand-maintained.

## MCP

Every route above is also exposed as an MCP tool, mounted at `/mcp` on the same process. Tools
are generated from the app's own OpenAPI schema by
[`fastapi-mcp`](https://github.com/tadata-org/fastapi_mcp) --
`list_{entity}` and `get_{entity}_by_id` per entity (18 tools), plus `get_all` and
`get_team_people_by_position`, 20 tools total, with the same filter arguments as the REST query
params. There's nothing to hand-maintain here: add or change a route and its MCP tool follows
automatically.

Point any MCP client (streamable HTTP transport) at `http://127.0.0.1:8387/mcp` once the server
is running.

## Tests

- `tests/test_org_data.py` -- loads `tests/fixtures/orgdata/` (a small hand-crafted Terraform
  module, distinct from `../../examples/`) through the real `terraform` binary.
- `tests/test_api.py` -- endpoint behavior (fetch/filter/404/422) via FastAPI's `TestClient`,
  with the org-data dependency overridden to the fixture above (no real `terraform` call in
  these).
- `tests/test_schema_drift.py` -- the schema-drift check (round-trips real Terraform JSON
  through the Pydantic models so an added/removed field fails as an unexpected/missing key), run
  against both the real `org-model/` data and the fixture above.
