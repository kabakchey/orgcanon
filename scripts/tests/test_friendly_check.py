import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from friendly_check import extract_messages  # noqa: E402

# Captured verbatim from a real `terraform plan -no-color` run against org-model/.
TWO_FAILURES_FIXTURE = """\
Error: Invalid value for variable

  on main.tf line 55, in module "org":
  55:   teams  = module.common.teams
    ├────────────────
    │ var.people is map of object with 1 element
    │ var.teams is map of object with 1 element

teams.head must reference an existing key in var.people.

This was checked by the validation rule at validated/variables.tf:438,3-13.

Error: Invalid value for variable

  on main.tf line 55, in module "org":
  55:   teams  = module.common.teams
    ├────────────────
    │ var.people is map of object with 1 element
    │ var.teams is map of object with 1 element

teams.head_deputy must reference an existing key in var.people, if set.

This was checked by the validation rule at validated/variables.tf:443,3-13.
"""


class TestExtractMessages(unittest.TestCase):
    def test_extracts_every_error_message_from_multiple_failures(self):
        messages = extract_messages(TWO_FAILURES_FIXTURE)
        self.assertEqual(
            messages,
            [
                "teams.head must reference an existing key in var.people.",
                "teams.head_deputy must reference an existing key in var.people, if set.",
            ],
        )

    def test_returns_empty_list_for_clean_output(self):
        self.assertEqual(extract_messages("No changes. Your infrastructure matches...\n"), [])


if __name__ == "__main__":
    unittest.main()
