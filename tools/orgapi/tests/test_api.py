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


def _summaries(response):
    return [
        (
            entry["person"]["id"],
            entry["kind"],
            entry["deputy_for"],
            entry["role"],
            entry["authority_line"],
        )
        for entry in response.json()
    ]


def test_team_people_without_filters_lists_every_holding_on_the_team(client):
    response = client.get("/teams/platform/people")

    assert response.status_code == 200
    assert _summaries(response) == [
        ("bob-santos", "head", None, None, None),
        ("carol-diaz", "head", "bob-santos", None, None),
        ("bob-santos", "role", None, "platform-owner", None),
        ("carol-diaz", "role", "bob-santos", "platform-owner", None),
        ("carol-diaz", "role", None, "platform-owner", None),
        ("bob-santos", "authority_line", None, None, "bob-tech-lead"),
        ("alice-nguyen", "authority_line", "bob-santos", None, "bob-tech-lead"),
    ]


def test_team_people_head_entries_carry_the_head_title_and_interim_flags(client):
    response = client.get("/teams/platform/people", params={"kind": "head"})

    head, head_deputy = response.json()
    assert (head["title"], head["is_interim"]) == ("Software Engineer", False)
    assert (head_deputy["title"], head_deputy["is_interim"]) == ("Deputy Lead", True)
    assert head["person"] == client.get("/people/bob-santos").json()


def test_team_people_role_deputy_has_no_title_of_its_own(client):
    response = client.get(
        "/teams/platform/people", params={"role": "platform-owner", "is_deputy": True}
    )

    assert _summaries(response) == [
        ("carol-diaz", "role", "bob-santos", "platform-owner", None)
    ]
    assert response.json()[0]["title"] is None
    assert response.json()[0]["is_interim"] is False


def test_team_people_by_role_excluding_deputies_returns_every_holder(client):
    response = client.get(
        "/teams/platform/people", params={"role": "platform-owner", "is_deputy": False}
    )

    assert [entry["person"]["id"] for entry in response.json()] == ["bob-santos", "carol-diaz"]
    assert {entry["title"] for entry in response.json()} == {"Platform Owner"}


def test_team_people_by_authority_line_type_skips_ended_and_not_yet_started_lines(client):
    response = client.get("/teams/platform/people", params={"authority_line_type": "tech-lead"})

    assert _summaries(response) == [
        ("bob-santos", "authority_line", None, None, "bob-tech-lead"),
        ("alice-nguyen", "authority_line", "bob-santos", None, "bob-tech-lead"),
    ]
    assert {entry["authority_line_type"] for entry in response.json()} == {"tech-lead"}
    assert {entry["title"] for entry in response.json()} == {None}


def test_team_people_entries_carry_the_display_name_of_what_is_held(client):
    response = client.get("/teams/platform/people")

    assert [
        (entry["kind"], entry["role_name"], entry["authority_line_type_title"])
        for entry in response.json()
    ] == [
        ("head", None, None),
        ("head", None, None),
        ("role", "Platform Owner", None),
        ("role", "Platform Owner", None),
        ("role", "Platform Owner", None),
        ("authority_line", None, "Tech Lead"),
        ("authority_line", None, "Tech Lead"),
    ]


def test_team_people_authority_lines_do_not_cascade_to_other_teams(client):
    response = client.get("/teams/acme-hq/people")

    assert _summaries(response) == [("alice-nguyen", "head", None, None, None)]


def test_team_people_filters_combine_with_and(client):
    response = client.get(
        "/teams/platform/people", params={"kind": "head", "role": "platform-owner"}
    )

    assert response.status_code == 200
    assert response.json() == []


def test_team_people_with_no_matches_returns_an_empty_list(client):
    response = client.get("/teams/platform/people", params={"role": "no-such-role"})

    assert response.status_code == 200
    assert response.json() == []


def test_team_people_rejects_invalid_kind_value(client):
    response = client.get("/teams/platform/people", params={"kind": "tech-lead"})

    assert response.status_code == 422


def test_team_people_404s_for_unknown_team(client):
    response = client.get("/teams/no-such-team/people")

    assert response.status_code == 404
