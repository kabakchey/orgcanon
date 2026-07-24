import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from report_data_quality import (  # noqa: E402
    find_empty_teams,
    find_malformed_external_references,
    find_orphaned_people,
)


class TestFindOrphanedPeople(unittest.TestCase):
    def test_person_referenced_as_a_member_is_not_orphaned(self):
        people = {"alice": {}, "bob": {}}
        teams = {"t": {"head": "alice", "members": [{"person": "bob"}]}}
        self.assertEqual(find_orphaned_people(people, teams), [])

    def test_person_referenced_only_as_head_deputy_is_not_orphaned(self):
        people = {"alice": {}, "bob": {}}
        teams = {"t": {"head": "alice", "head_deputy": "bob", "members": []}}
        self.assertEqual(find_orphaned_people(people, teams), [])

    def test_person_with_no_team_relationship_is_orphaned(self):
        people = {"alice": {}, "ghost": {}}
        teams = {"t": {"head": "alice", "members": []}}
        self.assertEqual(find_orphaned_people(people, teams), ["ghost"])


class TestFindEmptyTeams(unittest.TestCase):
    def test_team_with_members_is_not_flagged(self):
        teams = {"t": {"members": [{"person": "alice"}]}}
        self.assertEqual(find_empty_teams(teams), [])

    def test_team_with_no_members_is_flagged(self):
        teams = {"t": {"members": []}}
        self.assertEqual(find_empty_teams(teams), ["t"])


class TestFindMalformedExternalReferences(unittest.TestCase):
    def test_non_empty_reference_values_pass(self):
        entities = {"people": {"alice": {"external_references": {"github_username": "anguyen"}}}}
        self.assertEqual(find_malformed_external_references(entities), [])

    def test_empty_string_reference_value_is_flagged(self):
        entities = {"people": {"alice": {"external_references": {"github_username": "  "}}}}
        self.assertEqual(
            find_malformed_external_references(entities),
            [("people", "alice", "github_username")],
        )


if __name__ == "__main__":
    unittest.main()
