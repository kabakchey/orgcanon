import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from check_retirement_confirmations import (  # noqa: E402
    cleared_head_deputies,
    find_missing_confirmations,
    newly_retired_authority_line_ids,
    removed_role_ids,
)


class TestRemovedRoleIds(unittest.TestCase):
    def test_detects_a_removed_role(self):
        before = {"backend-owner": {}, "frontend-owner": {}}
        after = {"frontend-owner": {}}
        self.assertEqual(removed_role_ids(before, after), {"backend-owner"})

    def test_no_removal_is_empty(self):
        roles = {"backend-owner": {}}
        self.assertEqual(removed_role_ids(roles, roles), set())

    def test_a_new_role_is_not_a_removal(self):
        before = {}
        after = {"backend-owner": {}}
        self.assertEqual(removed_role_ids(before, after), set())


class TestNewlyRetiredAuthorityLineIds(unittest.TestCase):
    def test_detects_outright_removal(self):
        before = {"tech-lead-a": {"end_date": None}}
        after = {}
        self.assertEqual(newly_retired_authority_line_ids(before, after), {"tech-lead-a"})

    def test_detects_end_date_newly_set(self):
        before = {"tech-lead-a": {"end_date": None}}
        after = {"tech-lead-a": {"end_date": "2026-09-01"}}
        self.assertEqual(newly_retired_authority_line_ids(before, after), {"tech-lead-a"})

    def test_end_date_already_set_is_not_newly_retired(self):
        before = {"tech-lead-a": {"end_date": "2026-09-01"}}
        after = {"tech-lead-a": {"end_date": "2026-09-01"}}
        self.assertEqual(newly_retired_authority_line_ids(before, after), set())

    def test_still_active_is_not_retired(self):
        before = {"tech-lead-a": {"end_date": None}}
        after = {"tech-lead-a": {"end_date": None}}
        self.assertEqual(newly_retired_authority_line_ids(before, after), set())


class TestClearedHeadDeputies(unittest.TestCase):
    def test_detects_a_cleared_deputy(self):
        before = {"platform": {"head_deputy": "alice"}}
        after = {"platform": {"head_deputy": None}}
        self.assertEqual(cleared_head_deputies(before, after), {"platform": "alice"})

    def test_deputy_staying_set_is_not_cleared(self):
        before = {"platform": {"head_deputy": "alice"}}
        after = {"platform": {"head_deputy": "alice"}}
        self.assertEqual(cleared_head_deputies(before, after), {})

    def test_team_only_present_on_one_side_is_ignored(self):
        before = {}
        after = {"new-team": {"head_deputy": None}}
        self.assertEqual(cleared_head_deputies(before, after), {})

    def test_never_having_a_deputy_is_not_cleared(self):
        before = {"platform": {"head_deputy": None}}
        after = {"platform": {"head_deputy": None}}
        self.assertEqual(cleared_head_deputies(before, after), {})


def _plan(roles=None, authority_lines=None, teams=None, retirement_confirmations=None):
    outputs = {}
    for key, value in (
        ("roles", roles),
        ("authority_lines", authority_lines),
        ("teams", teams),
        ("retirement_confirmations", retirement_confirmations),
    ):
        if value is not None:
            outputs[key] = {"value": value}
    return {"planned_values": {"outputs": outputs}}


class TestFindMissingConfirmations(unittest.TestCase):
    def test_no_changes_produces_no_errors(self):
        plan = _plan(roles={}, authority_lines={}, teams={}, retirement_confirmations={})
        self.assertEqual(find_missing_confirmations(plan, plan), [])

    def test_removed_role_without_confirmation_is_an_error(self):
        before = _plan(roles={"backend-owner": {}}, authority_lines={}, teams={})
        after = _plan(roles={}, authority_lines={}, teams={}, retirement_confirmations={})
        errors = find_missing_confirmations(before, after)
        self.assertEqual(len(errors), 1)
        self.assertIn("backend-owner", errors[0])

    def test_removed_role_with_matching_confirmation_is_fine(self):
        before = _plan(roles={"backend-owner": {}}, authority_lines={}, teams={})
        after = _plan(
            roles={},
            authority_lines={},
            teams={},
            retirement_confirmations={
                "confirm-1": {
                    "entity_type": "role",
                    "entity_id": "backend-owner",
                    "disposition": "eliminated",
                }
            },
        )
        self.assertEqual(find_missing_confirmations(before, after), [])

    def test_retired_authority_line_without_confirmation_is_an_error(self):
        before = _plan(roles={}, authority_lines={"tech-lead-a": {"end_date": None}}, teams={})
        after = _plan(
            roles={},
            authority_lines={"tech-lead-a": {"end_date": "2026-09-01"}},
            teams={},
            retirement_confirmations={},
        )
        errors = find_missing_confirmations(before, after)
        self.assertEqual(len(errors), 1)
        self.assertIn("tech-lead-a", errors[0])

    def test_cleared_head_deputy_without_confirmation_is_an_error(self):
        before = _plan(roles={}, authority_lines={}, teams={"platform": {"head_deputy": "alice"}})
        after = _plan(
            roles={},
            authority_lines={},
            teams={"platform": {"head_deputy": None}},
            retirement_confirmations={},
        )
        errors = find_missing_confirmations(before, after)
        self.assertEqual(len(errors), 1)
        self.assertIn("platform", errors[0])
        self.assertIn("alice", errors[0])

    def test_confirmation_for_a_different_former_deputy_does_not_count(self):
        before = _plan(roles={}, authority_lines={}, teams={"platform": {"head_deputy": "alice"}})
        after = _plan(
            roles={},
            authority_lines={},
            teams={"platform": {"head_deputy": None}},
            retirement_confirmations={
                "confirm-1": {
                    "entity_type": "head_deputy",
                    "entity_id": "platform",
                    "former_person": "bob",
                    "disposition": "eliminated",
                }
            },
        )
        errors = find_missing_confirmations(before, after)
        self.assertEqual(len(errors), 1)

    def test_matching_head_deputy_confirmation_is_fine(self):
        before = _plan(roles={}, authority_lines={}, teams={"platform": {"head_deputy": "alice"}})
        after = _plan(
            roles={},
            authority_lines={},
            teams={"platform": {"head_deputy": None}},
            retirement_confirmations={
                "confirm-1": {
                    "entity_type": "head_deputy",
                    "entity_id": "platform",
                    "former_person": "alice",
                    "disposition": "reassigned",
                    "reassigned_to": "carol",
                }
            },
        )
        self.assertEqual(find_missing_confirmations(before, after), [])


if __name__ == "__main__":
    unittest.main()
