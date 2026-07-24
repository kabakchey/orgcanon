#!/usr/bin/env python3
"""Compares two `terraform show -json` plan documents (before/after) for org-model/ and
prints a plain-English Markdown summary of what changed. Used by the PR-diff bot workflow
(.github/workflows/pr-diff-summary.yml). Deliberately narrow in scope -- primary-team moves,
component dependency changes, and team head/head-deputy changes only, deliberately, as a first
version -- other kinds of changes are out of scope for now.

Usage:
    python3 scripts/summarize_org_diff.py before.json after.json
"""

import json
import sys
from typing import Any


def _outputs_value(plan_json: dict[str, Any], key: str) -> dict[str, Any]:
    return (
        plan_json.get("planned_values", {}).get("outputs", {}).get(key, {}).get("value", {})
        or {}
    )


def find_primary_team(teams: dict[str, Any]) -> dict[str, str]:
    """person_id -> team_id, for whichever team that person is the is_primary_team member of."""
    result: dict[str, str] = {}
    for team_id, team in teams.items():
        for member in team.get("members", []):
            if member.get("is_primary_team"):
                result[member["person"]] = team_id
    return result


def summarize_primary_team_moves(before_teams: dict[str, Any], after_teams: dict[str, Any]) -> list[str]:
    before = find_primary_team(before_teams)
    after = find_primary_team(after_teams)
    lines = []
    for person_id in sorted(set(before) | set(after)):
        old_team, new_team = before.get(person_id), after.get(person_id)
        if old_team == new_team:
            continue
        if old_team is None:
            lines.append(f"- `{person_id}` joined `{new_team}` as their primary team")
        elif new_team is None:
            lines.append(f"- `{person_id}` is no longer a primary member of `{old_team}`")
        else:
            lines.append(f"- `{person_id}` moved from `{old_team}` to `{new_team}`")
    return lines


def summarize_component_dependency_changes(
    before_components: dict[str, Any], after_components: dict[str, Any]
) -> list[str]:
    lines = []
    for component_id in sorted(set(before_components) | set(after_components)):
        before_deps = set(before_components.get(component_id, {}).get("dependency_components", []))
        after_deps = set(after_components.get(component_id, {}).get("dependency_components", []))
        for added in sorted(after_deps - before_deps):
            lines.append(f"- `{component_id}` now depends on `{added}`")
        for removed in sorted(before_deps - after_deps):
            lines.append(f"- `{component_id}` no longer depends on `{removed}`")
    return lines


def summarize_head_changes(before_teams: dict[str, Any], after_teams: dict[str, Any]) -> list[str]:
    lines = []
    for team_id in sorted(set(before_teams) & set(after_teams)):
        before_team, after_team = before_teams[team_id], after_teams[team_id]
        for field, label in (("head", "head"), ("head_deputy", "head deputy")):
            if before_team.get(field) != after_team.get(field):
                lines.append(
                    f"- `{team_id}`'s {label} changed from `{before_team.get(field)}` "
                    f"to `{after_team.get(field)}`"
                )
    return lines


def summarize(before: dict[str, Any], after: dict[str, Any]) -> str:
    before_teams, after_teams = _outputs_value(before, "teams"), _outputs_value(after, "teams")
    before_components, after_components = (
        _outputs_value(before, "components"),
        _outputs_value(after, "components"),
    )
    lines = [
        *summarize_primary_team_moves(before_teams, after_teams),
        *summarize_component_dependency_changes(before_components, after_components),
        *summarize_head_changes(before_teams, after_teams),
    ]
    if not lines:
        return "No team-membership, component-dependency, or team-head changes detected in this PR."
    return "**Org data changes in this PR:**\n\n" + "\n".join(lines)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: summarize_org_diff.py <before.json> <after.json>", file=sys.stderr)
        return 2
    with open(sys.argv[1]) as f:
        before = json.load(f)
    with open(sys.argv[2]) as f:
        after = json.load(f)
    print(summarize(before, after))
    return 0


if __name__ == "__main__":
    sys.exit(main())
