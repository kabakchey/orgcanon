import io
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parents[1]))

from check_reviewable_expiration import MAX_HORIZON_DAYS, find_reviewables, find_violations, main  # noqa: E402


def _wrap(value):
    return {"value": value}


class TestFindReviewables(unittest.TestCase):
    def test_finds_top_level_reviewable_on_every_entity_type(self):
        outputs = {
            "teams": _wrap({"acme-hq": {"reviewable": {"expiration_date": "2027-01-01"}}}),
            "components": _wrap({"api": {"reviewable": {"expiration_date": "2026-01-01"}}}),
        }
        found = find_reviewables(outputs)
        keys = {(entity_key, path) for entity_key, path, _ in found}
        self.assertEqual(keys, {("teams", "acme-hq"), ("components", "api")})

    def test_finds_nested_reviewable_on_each_person_position(self):
        outputs = {
            "people": _wrap(
                {
                    "alice-nguyen": {
                        "reviewable": {"expiration_date": "2027-01-01"},
                        "positions": [
                            {"reviewable": {"expiration_date": "2026-06-01"}},
                            {"reviewable": {"expiration_date": "2028-01-01"}},
                        ],
                    }
                }
            )
        }
        found = find_reviewables(outputs)
        paths = {path for _, path, _ in found}
        self.assertEqual(
            paths,
            {"alice-nguyen", "alice-nguyen.positions[0]", "alice-nguyen.positions[1]"},
        )


class TestFindViolations(unittest.TestCase):
    def test_overdue_entries_are_flagged_and_sorted_by_expiration_date(self):
        outputs = {
            "teams": _wrap(
                {
                    "old": {"reviewable": {"expiration_date": "2025-01-01"}},
                    "older": {"reviewable": {"expiration_date": "2024-01-01"}},
                    "current": {"reviewable": {"expiration_date": "2026-09-04"}},
                }
            )
        }
        violations = find_violations(outputs, as_of="2026-08-25", max_horizon_days=365)
        self.assertEqual(
            violations,
            [
                ("teams", "older", "2024-01-01", "overdue"),
                ("teams", "old", "2025-01-01", "overdue"),
            ],
        )

    def test_expiration_date_equal_to_as_of_is_not_a_violation(self):
        outputs = {"teams": _wrap({"t": {"reviewable": {"expiration_date": "2026-08-25"}}})}
        self.assertEqual(find_violations(outputs, as_of="2026-08-25", max_horizon_days=365), [])

    def test_expiration_date_beyond_max_horizon_is_flagged_too_far_in_the_future(self):
        outputs = {"teams": _wrap({"t": {"reviewable": {"expiration_date": "2027-08-26"}}})}
        violations = find_violations(outputs, as_of="2026-08-25", max_horizon_days=365)
        self.assertEqual(violations, [("teams", "t", "2027-08-26", "too far in the future")])

    def test_expiration_date_exactly_at_max_horizon_is_not_a_violation(self):
        outputs = {"teams": _wrap({"t": {"reviewable": {"expiration_date": "2027-08-25"}}})}
        self.assertEqual(find_violations(outputs, as_of="2026-08-25", max_horizon_days=365), [])

    def test_overdue_and_too_far_out_can_both_be_flagged_together_sorted(self):
        outputs = {
            "teams": _wrap(
                {
                    "past": {"reviewable": {"expiration_date": "2024-01-01"}},
                    "distant-future": {"reviewable": {"expiration_date": "2099-01-01"}},
                }
            )
        }
        violations = find_violations(outputs, as_of="2026-08-25", max_horizon_days=365)
        self.assertEqual(
            violations,
            [
                ("teams", "past", "2024-01-01", "overdue"),
                ("teams", "distant-future", "2099-01-01", "too far in the future"),
            ],
        )


class TestMainExitCode(unittest.TestCase):
    def _run(self, outputs, as_of):
        plan = {"planned_values": {"outputs": outputs}}
        argv = ["check_reviewable_expiration.py", "--as-of", as_of]
        with mock.patch.object(sys, "argv", argv), mock.patch.object(
            sys, "stdin", io.StringIO(json.dumps(plan))
        ):
            return main()

    def test_exits_nonzero_when_a_reviewable_is_overdue(self):
        outputs = _wrap_outputs("2024-01-01")
        self.assertEqual(self._run(outputs, "2026-08-25"), 1)

    def test_exits_nonzero_when_a_reviewable_is_too_far_in_the_future(self):
        outputs = _wrap_outputs("2099-01-01")
        self.assertEqual(self._run(outputs, "2026-08-25"), 1)

    def test_exits_zero_when_nothing_is_out_of_bounds(self):
        outputs = _wrap_outputs("2027-01-01")
        self.assertEqual(self._run(outputs, "2026-08-25"), 0)


class TestMaxHorizonDays(unittest.TestCase):
    def test_max_horizon_is_one_year(self):
        self.assertEqual(MAX_HORIZON_DAYS, 365)


def _wrap_outputs(expiration_date):
    return {"teams": _wrap({"acme-hq": {"reviewable": {"expiration_date": expiration_date}}})}


if __name__ == "__main__":
    unittest.main()
