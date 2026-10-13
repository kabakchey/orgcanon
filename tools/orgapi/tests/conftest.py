from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mcp.shared.memory import create_connected_server_and_client_session

from orgapi.app import app, fastapi_mcp, get_org_data
from orgapi.org_data import load_org_data

FIXTURES_DIR = Path(__file__).parent / "fixtures"
TERRAFORM_BIN = "terraform"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
def fixture_org_data():
    return load_org_data(str(FIXTURES_DIR / "orgdata"), TERRAFORM_BIN)


@pytest.fixture
def serving_fixture_org_data(fixture_org_data):
    app.dependency_overrides[get_org_data] = lambda: fixture_org_data
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_org_data, None)


@pytest.fixture
def client(serving_fixture_org_data):
    return TestClient(app)


@pytest.fixture
async def mcp_session(serving_fixture_org_data):
    """An MCP ClientSession connected in-memory to orgapi's MCP server -- no real sockets."""
    async with create_connected_server_and_client_session(fastapi_mcp.server) as session:
        yield session
