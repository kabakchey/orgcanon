"""Pins the MCP layer: fastapi-mcp auto-generates one MCP tool per REST route from the app's
own OpenAPI schema, then executes each tool call in-process against
the same FastAPI app -- so these tests confirm tool discovery and prove tool calls behave
identically to the equivalent REST call, not a second, hand-maintained implementation.
"""

import json

import pytest

from orgapi.org_data import ORG_DATA_OUTPUT_KEYS

pytestmark = pytest.mark.anyio

EXPECTED_TOOL_NAMES = (
    {f"list_{key}" for key in ORG_DATA_OUTPUT_KEYS}
    | {f"get_{key}_by_id" for key in ORG_DATA_OUTPUT_KEYS}
    | {"get_all", "get_team_people_by_position"}
)


async def test_lists_a_tool_for_every_entity_route(mcp_session):
    result = await mcp_session.list_tools()

    names = {tool.name for tool in result.tools}
    assert names == EXPECTED_TOOL_NAMES


async def test_get_by_id_tool_matches_the_equivalent_rest_response(mcp_session, client):
    tool_result = await mcp_session.call_tool("get_people_by_id", {"entity_id": "bob-santos"})
    rest_response = client.get("/people/bob-santos")

    assert json.loads(tool_result.content[0].text) == rest_response.json()


async def test_list_tool_filters_the_same_way_the_rest_query_param_does(mcp_session, client):
    tool_result = await mcp_session.call_tool("list_components", {"team": "platform"})
    rest_response = client.get("/components", params={"team": "platform"})

    tool_ids = {c["id"] for c in json.loads(tool_result.content[0].text)}
    rest_ids = {c["id"] for c in rest_response.json()}
    assert tool_ids == rest_ids == {"api", "web"}
