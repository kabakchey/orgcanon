from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mcp.shared.memory import create_connected_server_and_client_session

from orgapi.app import app, fastapi_mcp, get_org_data
from orgapi.org_data import load_org_data

FIXTURE_DIR = Path(__file__).parent / "fixtures" / "orgdata"
TERRAFORM_BIN = "terraform"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
def fixture_org_data():
    return load_org_data(str(FIXTURE_DIR), str(TERRAFORM_BIN))


@pytest.fixture
def client(fixture_org_data):
    app.dependency_overrides[get_org_data] = lambda: fixture_org_data
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_org_data, None)


@pytest.fixture
async def mcp_session(fixture_org_data):
    """An MCP ClientSession connected in-memory to orgapi's mounted MCP server -- no real
    sockets."""
    app.dependency_overrides[get_org_data] = lambda: fixture_org_data
    try:
        async with create_connected_server_and_client_session(fastapi_mcp.server) as session:
            yield session
    finally:
        app.dependency_overrides.pop(get_org_data, None)
