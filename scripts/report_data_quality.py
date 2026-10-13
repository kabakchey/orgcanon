#!/usr/bin/env python3
"""Soft, non-blocking data-quality lints -- NOT part of docs/invariants.md's enforced invariants.

Flags: orphaned people (not referenced as a team's head/head_deputy/member anywhere), teams
with zero members, and empty-string external_references values. Always exits 0 -- these are
lints, not hard failures.

Usage:
    terraform -chdir=org-model plan -input=false -out=tfplan
    terraform -chdir=org-model show -json tfplan | python3 scripts/report_data_quality.py
"""

import sys
from typing import Any

from plan_json import output_value, read_stdin_plan


def find_orphaned_people(people: dict[str, Any], teams: dict[str, Any]) -> list[str]:
    member_ids = {m["person"] for t in teams.values() for m in t.get("members", [])}
    head_ids = {t["head"] for t in teams.values() if t.get("head")}
    deputy_ids = {t["head_deputy"] for t in teams.values() if t.get("head_deputy")}
    referenced = member_ids | head_ids | deputy_ids
    return sorted(person_id for person_id in people if person_id not in referenced)


def find_empty_teams(teams: dict[str, Any]) -> list[str]:
    return sorted(team_id for team_id, t in teams.items() if not t.get("members"))


def find_malformed_external_references(
    entities_by_key: dict[str, dict[str, Any]],
) -> list[tuple[str, str, str]]:
    problems = []
    for entity_key, entities in entities_by_key.items():
        for entity_id, entity in entities.items():
            for ref_key, ref_value in entity.get("external_references", {}).items():
                if not ref_value.strip():
                    problems.append((entity_key, entity_id, ref_key))
    return problems


def main() -> int:
    plan = read_stdin_plan()
    people = output_value(plan, "people")
    teams = output_value(plan, "teams")
    components = output_value(plan, "components")

    orphaned = find_orphaned_people(people, teams)
    empty_teams = find_empty_teams(teams)
    malformed_refs = find_malformed_external_references(
        {"people": people, "teams": teams, "components": components}
    )

    if not (orphaned or empty_teams or malformed_refs):
        print("ok: no data-quality lint findings")
        return 0

    if orphaned:
        print(f"{len(orphaned)} orphaned person/people (not a member/head/deputy of any team):")
        for person_id in orphaned:
            print(f"  {person_id}")
    if empty_teams:
        print(f"{len(empty_teams)} team(s) with zero members:")
        for team_id in empty_teams:
            print(f"  {team_id}")
    if malformed_refs:
        print(f"{len(malformed_refs)} empty external_references value(s):")
        for entity_key, entity_id, ref_key in malformed_refs:
            print(f"  {entity_key}.{entity_id}.external_references.{ref_key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
