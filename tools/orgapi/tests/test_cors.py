def test_cross_origin_get_is_allowed_from_any_origin(client):
    response = client.get("/people", headers={"Origin": "https://example.com"})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
