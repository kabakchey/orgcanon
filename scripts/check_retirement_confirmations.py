#!/usr/bin/env python3
"""Blocks a Role/AuthorityLine/team.head_deputy losing active status without a matching entry
in `retirement_confirmations` -- see docs/invariants.md's "Retirement confirmation" section.
Unlike every other invariant in this repo, this one is inherently a diff: nothing in
`org-model/validated/`'s single-state Terraform validation can see that a key used to exist, so
this reads two `terraform show -json` plan documents (before/after), the same shape
scripts/summarize_org_diff.py already consumes -- but unlike that script (informational only),
this one is a hard gate: see Makefile's `_check-retirement-confirmations`.

A transition needs a fresh confirmation every time it happens, even if the same entity was
already confirmed once before (e.g. retired-with-confirmation now being pruned from the data
entirely still needs its own confirmation for the prune itself) -- simpler to implement and
reason about than tracking whether an earlier confirmation already "covers" a later one, and
errs toward re-confirming rather than silently letting a second loss ride on the first.

Usage:
    python3 scripts/check_retirement_confirmations.py before.json after.json
"""

import json
import sys
from typing import Any


def _outputs_value(plan_json: dict[str, Any], key: str) -> dict[str, Any]:
    return (
        plan_json.get("planned_values", {}).get("outputs", {}).get(key, {}).get("value", {})
        or {}
    )


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
    """team_id -> the person id who was head_deputy, for every team whose head_deputy went
    from set to unset. Teams present on only one side are ignored -- team creation/deletion
    itself isn't this script's concern."""
    return {
        team_id: before_teams[team_id]["head_deputy"]
        for team_id in set(before_teams) & set(after_teams)
        if before_teams[team_id].get("head_deputy") is not None
        and after_teams[team_id].get("head_deputy") is None
    }


def find_missing_confirmations(before: dict[str, Any], after: dict[str, Any]) -> list[str]:
    before_roles, after_roles = _outputs_value(before, "roles"), _outputs_value(after, "roles")
    before_lines, after_lines = (
        _outputs_value(before, "authority_lines"),
        _outputs_value(after, "authority_lines"),
    )
    before_teams, after_teams = _outputs_value(before, "teams"), _outputs_value(after, "teams")
    confirmations = _outputs_value(after, "retirement_confirmations").values()

    errors = []

    for role_id in sorted(removed_role_ids(before_roles, after_roles)):
        if not any(
            c["entity_type"] == "role" and c["entity_id"] == role_id for c in confirmations
        ):
            errors.append(
                f"role `{role_id}` was removed with no matching retirement_confirmations entry "
                f'(entity_type="role", entity_id="{role_id}")'
            )

    for line_id in sorted(newly_retired_authority_line_ids(before_lines, after_lines)):
        if not any(
            c["entity_type"] == "authority_line" and c["entity_id"] == line_id
            for c in confirmations
        ):
            errors.append(
                f"authority_line `{line_id}` was removed or end-dated with no matching "
                f'retirement_confirmations entry (entity_type="authority_line", '
                f'entity_id="{line_id}")'
            )

    for team_id, former_person in sorted(
        cleared_head_deputies(before_teams, after_teams).items()
    ):
        if not any(
            c["entity_type"] == "head_deputy"
            and c["entity_id"] == team_id
            and c.get("former_person") == former_person
            for c in confirmations
        ):
            errors.append(
                f"team `{team_id}`'s head_deputy (`{former_person}`) was cleared with no "
                f'matching retirement_confirmations entry (entity_type="head_deputy", '
                f'entity_id="{team_id}", former_person="{former_person}")'
            )

    return errors


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: check_retirement_confirmations.py <before.json> <after.json>", file=sys.stderr)
        return 2
    with open(sys.argv[1]) as f:
        before = json.load(f)
    with open(sys.argv[2]) as f:
        after = json.load(f)

    errors = find_missing_confirmations(before, after)
    if errors:
        print("error: retirement(s) missing a required retirement_confirmations entry:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("ok: every Role/AuthorityLine/head_deputy retirement in this change is confirmed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
