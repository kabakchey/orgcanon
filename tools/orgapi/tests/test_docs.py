"""Pins the /docs + /spec wiring.

Swagger UI at /docs must load its spec from /spec (not the FastAPI default /openapi.json), and
/spec must be the live OpenAPI document FastAPI derives from the actual routes and Pydantic
models -- not a hand-maintained file.
"""


def test_docs_serves_swagger_ui_pointed_at_spec(client):
    response = client.get("/docs")

    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower()
    assert "url: '/spec'" in response.text


def test_openapi_json_default_path_is_not_served(client):
    response = client.get("/openapi.json")

    assert response.status_code == 404


def test_spec_reflects_the_actual_routes_and_models(client):
    response = client.get("/spec")

    assert response.status_code == 200
    spec = response.json()

    assert "/people/{entity_id}" in spec["paths"]
    assert "/teams" in spec["paths"]

    person_schema = spec["components"]["schemas"]["Person"]
    assert set(person_schema["required"]) >= {"name", "email", "id"}


def test_spec_picks_up_a_newly_registered_route(client):
    from orgapi.app import app

    @app.get("/_test_only_probe_route")
    def _probe():
        return {}

    app.openapi_schema = None  # force regeneration; FastAPI caches the schema after first use
    try:
        response = client.get("/spec")
        assert "/_test_only_probe_route" in response.json()["paths"]
    finally:
        app.router.routes = [
            route for route in app.router.routes if getattr(route, "path", None) != "/_test_only_probe_route"
        ]
        app.openapi_schema = None
