def test_get_by_id_returns_the_matching_entity(client):
    response = client.get("/people/bob-santos")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "bob-santos"
    assert body["email"] == "bob.santos@example.com"
    assert body["name"] == "Bob Santos"


def test_get_by_id_404s_when_the_id_does_not_exist(client):
    response = client.get("/people/does-not-exist")

    assert response.status_code == 404


def test_list_all_returns_every_entity_with_id_embedded(client):
    response = client.get("/people")

    assert response.status_code == 200
    ids = {person["id"] for person in response.json()}
    assert ids == {"alice-nguyen", "bob-santos", "carol-diaz"}


def test_list_all_preserves_null_optional_fields(client):
    response = client.get("/teams/acme-hq")

    assert response.status_code == 200
    body = response.json()
    assert body["parent_team"] is None
    assert body["head_deputy"] is None
    assert body["head_deputy_title"] is None


def test_filter_by_a_scalar_field_narrows_results(client):
    response = client.get("/components", params={"team": "platform"})

    assert response.status_code == 200
    assert {c["id"] for c in response.json()} == {"api", "web"}


def test_filter_with_no_matches_returns_an_empty_list(client):
    response = client.get("/components", params={"team": "no-such-team"})

    assert response.status_code == 200
    assert response.json() == []


def test_multiple_filters_combine_with_and(client):
    response = client.get("/components", params={"team": "platform", "type": "service"})

    assert response.status_code == 200
    assert {c["id"] for c in response.json()} == {"api"}


def test_filter_on_a_bool_field(client):
    response = client.get("/components", params={"is_end_user_facing": "true"})

    assert response.status_code == 200
    assert {c["id"] for c in response.json()} == {"web"}


def test_unknown_filter_param_is_rejected(client):
    response = client.get("/people", params={"nam": "Bob"})

    assert response.status_code == 422


def test_wrong_typed_filter_value_is_rejected(client):
    response = client.get("/teams", params={"is_hierarchical": "maybe"})

    assert response.status_code == 422


def test_filter_only_on_scalar_fields_not_lists_or_nested_objects(client):
    # secondary_specializations is a list -- not a recognized filter field at all.
    response = client.get("/people", params={"secondary_specializations": "backend"})

    assert response.status_code == 422


def test_get_all_returns_every_entity_of_every_type_unfiltered(client):
    response = client.get("/all")

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "formal_position_types",
        "authority_line_types",
        "team_types",
        "component_types",
        "people",
        "roles",
        "teams",
        "authority_lines",
        "components",
    }
    assert {p["id"] for p in body["people"]} == {"alice-nguyen", "bob-santos", "carol-diaz"}
    assert {c["id"] for c in body["components"]} == {"api", "web"}


def test_generic_router_also_works_for_other_entity_types(client):
    response = client.get("/teams", params={"parent_team": "acme-hq"})

    assert response.status_code == 200
    assert {t["id"] for t in response.json()} == {"platform"}

    response = client.get("/authority_lines/bob-tech-lead")
    assert response.status_code == 200
    assert response.json()["person"] == "bob-santos"


def test_team_people_by_role_returns_every_person_holding_it(client):
    response = client.get("/teams/platform/people", params={"role": "platform-owner"})

    assert response.status_code == 200
    assert {p["id"] for p in response.json()} == {"bob-santos", "carol-diaz"}


def test_team_people_by_role_with_no_matches_returns_an_empty_list(client):
    response = client.get("/teams/platform/people", params={"role": "no-such-role"})

    assert response.status_code == 200
    assert response.json() == []


def test_team_people_by_head_position(client):
    response = client.get("/teams/platform/people", params={"position": "head"})

    assert response.status_code == 200
    assert [p["id"] for p in response.json()] == ["bob-santos"]


def test_team_people_by_head_deputy_position_when_unset_returns_an_empty_list(client):
    response = client.get("/teams/platform/people", params={"position": "head_deputy"})

    assert response.status_code == 200
    assert response.json() == []


def test_team_people_rejects_invalid_position_value(client):
    response = client.get("/teams/platform/people", params={"position": "tech-lead"})

    assert response.status_code == 422


def test_team_people_404s_for_unknown_team(client):
    response = client.get("/teams/no-such-team/people", params={"position": "head"})

    assert response.status_code == 404


def test_team_people_rejects_both_role_and_position(client):
    response = client.get(
        "/teams/platform/people", params={"role": "platform-owner", "position": "head"}
    )

    assert response.status_code == 400


def test_team_people_rejects_neither_role_nor_position(client):
    response = client.get("/teams/platform/people")

    assert response.status_code == 400
