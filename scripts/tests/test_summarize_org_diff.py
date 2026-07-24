import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from summarize_org_diff import (  # noqa: E402
    find_primary_team,
    summarize,
    summarize_component_dependency_changes,
    summarize_head_changes,
    summarize_primary_team_moves,
)


def _plan(teams=None, components=None):
    outputs = {}
    if teams is not None:
        outputs["teams"] = {"value": teams}
    if components is not None:
        outputs["components"] = {"value": components}
    return {"planned_values": {"outputs": outputs}}


class TestFindPrimaryTeam(unittest.TestCase):
    def test_maps_person_to_their_primary_team(self):
        teams = {
            "team-a": {"members": [{"person": "alice", "is_primary_team": True}]},
            "team-b": {"members": [{"person": "bob", "is_primary_team": False}]},
        }
        self.assertEqual(find_primary_team(teams), {"alice": "team-a"})


class TestSummarizePrimaryTeamMoves(unittest.TestCase):
    def test_detects_a_move_between_two_teams(self):
        before = {"team-a": {"members": [{"person": "alice", "is_primary_team": True}]}}
        after = {"team-b": {"members": [{"person": "alice", "is_primary_team": True}]}}
        lines = summarize_primary_team_moves(before, after)
        self.assertEqual(lines, ["- `alice` moved from `team-a` to `team-b`"])

    def test_detects_a_new_join(self):
        before = {}
        after = {"team-a": {"members": [{"person": "alice", "is_primary_team": True}]}}
        lines = summarize_primary_team_moves(before, after)
        self.assertEqual(lines, ["- `alice` joined `team-a` as their primary team"])

    def test_no_change_produces_no_lines(self):
        teams = {"team-a": {"members": [{"person": "alice", "is_primary_team": True}]}}
        self.assertEqual(summarize_primary_team_moves(teams, teams), [])


class TestSummarizeComponentDependencyChanges(unittest.TestCase):
    def test_detects_an_added_dependency(self):
        before = {"web": {"dependency_components": []}}
        after = {"web": {"dependency_components": ["api"]}}
        lines = summarize_component_dependency_changes(before, after)
        self.assertEqual(lines, ["- `web` now depends on `api`"])

    def test_detects_a_removed_dependency(self):
        before = {"web": {"dependency_components": ["api"]}}
        after = {"web": {"dependency_components": []}}
        lines = summarize_component_dependency_changes(before, after)
        self.assertEqual(lines, ["- `web` no longer depends on `api`"])


class TestSummarizeHeadChanges(unittest.TestCase):
    def test_detects_a_head_change(self):
        before = {"platform": {"head": "alice", "head_deputy": None}}
        after = {"platform": {"head": "bob", "head_deputy": None}}
        lines = summarize_head_changes(before, after)
        self.assertEqual(lines, ["- `platform`'s head changed from `alice` to `bob`"])

    def test_ignores_teams_only_present_on_one_side(self):
        before = {}
        after = {"new-team": {"head": "alice", "head_deputy": None}}
        self.assertEqual(summarize_head_changes(before, after), [])


class TestSummarizeEndToEnd(unittest.TestCase):
    def test_combines_all_three_kinds_of_change(self):
        before = _plan(
            teams={
                "team-a": {
                    "head": "alice",
                    "head_deputy": None,
                    "members": [{"person": "alice", "is_primary_team": True}],
                },
                "team-b": {"head": "bob", "head_deputy": None, "members": []},
            },
            components={"web": {"dependency_components": []}},
        )
        after = _plan(
            teams={
                "team-a": {"head": "alice", "head_deputy": None, "members": []},
                "team-b": {
                    "head": "bob",
                    "head_deputy": None,
                    "members": [{"person": "alice", "is_primary_team": True}],
                },
            },
            components={"web": {"dependency_components": ["api"]}},
        )
        result = summarize(before, after)
        self.assertIn("`alice` moved from `team-a` to `team-b`", result)
        self.assertIn("`web` now depends on `api`", result)

    def test_no_changes_produces_a_clean_message(self):
        plan = _plan(teams={}, components={})
        self.assertEqual(
            summarize(plan, plan),
            "No team-membership, component-dependency, or team-head changes detected in this PR.",
        )


if __name__ == "__main__":
    unittest.main()
