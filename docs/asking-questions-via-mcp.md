# Asking questions about the org via MCP

`orgapi` exposes every entity as an MCP tool, generated automatically from its REST API's own
OpenAPI schema — there's no second, hand-maintained tool definition to drift out of sync. Any
MCP-capable client (Claude Desktop, Claude Code, and others) can connect to a running `orgapi`
instance and answer questions like:

- "Who leads the platform squad?"
- "Which components does the platform team own?"
- "List everyone with the tech-lead authority line."

## Connecting

Start `orgapi` locally (from `tools/orgapi/`): `make dev` — serves on `http://localhost:8387`
by default. The MCP endpoint is `http://localhost:8387/mcp` (streamable HTTP transport).

Example client configuration (adjust for your specific MCP client):

```json
{
  "mcpServers": {
    "orgapi": {
      "url": "http://localhost:8387/mcp"
    }
  }
}
```

## What it can and can't do

Read-only — there is no MCP tool that changes data. Every tool maps 1:1 to a REST route (see
`tools/orgapi/src/orgapi/app.py`); nothing exists in the MCP surface that isn't also reachable
over plain HTTP. For editing org data, see
[`docs/onboarding-people-ops.md`](./onboarding-people-ops.md) (non-technical, covers the guided
`scripts/orgcanon_cli.py` scaffolding too).
