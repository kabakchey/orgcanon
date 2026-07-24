from orgapi.team_hierarchy import find_cycle


def test_find_cycle_returns_none_for_acyclic_hierarchy():
    teams = {
        "root": {"parent_team": None},
        "child": {"parent_team": "root"},
        "grandchild": {"parent_team": "child"},
    }
    assert find_cycle(teams) is None


def test_find_cycle_detects_a_two_node_cycle():
    teams = {
        "root": {"parent_team": None},
        "platform": {"parent_team": "growth"},
        "growth": {"parent_team": "platform"},
    }
    cycle = find_cycle(teams)
    assert cycle is not None
    assert cycle[0] == cycle[-1]
    assert set(cycle) == {"platform", "growth"}


def test_find_cycle_ignores_a_parent_id_that_does_not_exist():
    # In real usage org-model/validated/variables.tf's existence check runs first, but find_cycle itself must not crash on a dangling reference.
    teams = {"root": {"parent_team": None}, "orphan": {"parent_team": "does-not-exist"}}
    assert find_cycle(teams) is None
