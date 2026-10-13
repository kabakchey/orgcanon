#!/usr/bin/env python3
"""Blocks a Role/AuthorityLine/team.head_deputy losing active status without a confirmation.

A matching entry in `retirement_confirmations` is required -- see docs/invariants.md's
"Retirement confirmation" section. Unlike every other invariant in this repo, this one is
inherently a diff: nothing in `org-model/validated/`'s single-state Terraform validation can see
that a key used to exist, so this reads two `terraform show -json` plan documents
(before/after).

A transition needs a fresh confirmation every time it happens, even if the same entity was
already confirmed once before (e.g. retired-with-confirmation now being pruned from the data
entirely still needs its own confirmation for the prune itself) -- simpler to implement and
reason about than tracking whether an earlier confirmation already "covers" a later one, and
errs toward re-confirming rather than silently letting a second loss ride on the first.

Usage:
    python3 scripts/check_retirement_confirmations.py before.json after.json
"""

import sys
from typing import Any

from plan_json import output_value, read_plan_file


def removed_role_ids(before_roles: dict[str, Any], after_roles: dict[str, Any]) -> set[str]:
    return set(before_roles) - set(after_roles)


def newly_retired_authority_line_ids(
    before_lines: dict[str, Any], after_lines: dict[str, Any]
) -> set[str]:
    """AuthorityLine ids removed outright, or whose end_date went from unset to set."""
    removed = set(before_lines) - set(after_lines)
    newly_end_dated = {
        line_id
        for line_id in set(before_lines) & set(after_lines)
        if before_lines[line_id].get("end_date") is None
        and after_lines[line_id].get("end_date") is not None
    }
    return removed | newly_end_dated


def cleared_head_deputies(
    before_teams: dict[str, Any], after_teams: dict[str, Any]
) -> dict[str, str]:
    """Map team_id to the former head_deputy, for every team whose head_deputy was cleared.

    Teams present on only one side are ignored -- team creation/deletion itself isn't this
    script's concern.
    """
    return {
        team_id: before_teams[team_id]["head_deputy"]
        for team_id in set(before_teams) & set(after_teams)
        if before_teams[team_id].get("head_deputy") is not None
        and after_teams[team_id].get("head_deputy") is None
    }


def find_missing_confirmations(before: dict[str, Any], after: dict[str, Any]) -> list[str]:
    def changed(key: str) -> tuple[dict[str, Any], dict[str, Any]]:
        return output_value(before, key), output_value(after, key)

    required = [
        *(
            (f"role `{role_id}` was removed", {"entity_type": "role", "entity_id": role_id})
            for role_id in sorted(removed_role_ids(*changed("roles")))
        ),
        *(
            (
                f"authority_line `{line_id}` was removed or end-dated",
                {"entity_type": "authority_line", "entity_id": line_id},
            )
            for line_id in sorted(newly_retired_authority_line_ids(*changed("authority_lines")))
        ),
        *(
            (
                f"team `{team_id}`'s head_deputy (`{former_person}`) was cleared",
                {"entity_type": "head_deputy", "entity_id": team_id, "former_person": former_person},
            )
            for team_id, former_person in sorted(cleared_head_deputies(*changed("teams")).items())
        ),
    ]
    confirmations = output_value(after, "retirement_confirmations").values()
    return [
        f"{what} with no matching retirement_confirmations entry "
        + "(" + ", ".join(f'{field}="{value}"' for field, value in expected.items()) + ")"
        for what, expected in required
        if not any(
            all(confirmation.get(field) == value for field, value in expected.items())
            for confirmation in confirmations
        )
    ]


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check_retirement_confirmations.py <before.json> <after.json>", file=sys.stderr)
        return 2
    errors = find_missing_confirmations(read_plan_file(sys.argv[1]), read_plan_file(sys.argv[2]))
    if errors:
        print("error: retirement(s) missing a required retirement_confirmations entry:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("ok: every Role/AuthorityLine/head_deputy retirement in this change is confirmed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
