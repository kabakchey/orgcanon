#!/usr/bin/env python3
"""Blocks any Reviewable across the org whose expiration_date has either already passed or is
more than MAX_HORIZON_DAYS out -- see docs/invariants.md's "Reviewable expiration must not be
lapsed" and "Reviewable expiration must not be set too far out". Reads `terraform show -json`
output from stdin, same pattern as check_team_hierarchy.py -- never parses .tf files. Both
comparisons happen in Python against `plan` output, not through an HCL `validation` block
depending on `timestamp()`, so unlike the departed-person checks this never needs `apply`.

Usage:
    terraform -chdir=org-model plan -input=false -out=tfplan
    terraform -chdir=org-model show -json tfplan | python3 scripts/check_reviewable_expiration.py
    # or, to check against a specific date instead of today (useful for testing by hand):
    ... | python3 scripts/check_reviewable_expiration.py --as-of 2027-06-01
"""

import argparse
import datetime
import json
import sys
from typing import Any

# Every entity type's output key, matching org-model/outputs.tf / org-model/validated/outputs.tf.
ENTITY_KEYS = (
    "formal_position_types",
    "authority_line_types",
    "team_types",
    "component_types",
    "people",
    "roles",
    "teams",
    "authority_lines",
    "components",
)

# A Reviewable more than this many days past `as_of` fails alongside an already-overdue one --
# forces at least an annual re-confirmation cadence instead of letting an expiration_date be
# pushed out indefinitely. See docs/invariants.md's "Reviewable expiration must not be set too
# far out".
MAX_HORIZON_DAYS = 365


def find_reviewables(outputs: dict[str, Any]) -> list[tuple[str, str, dict[str, Any]]]:
    """Returns (entity_key, path, reviewable) for every Reviewable in the data. Every entity
    type carries a top-level `reviewable`; `people[*].positions[*]` is the one place a second,
    nested Reviewable exists (see org-model/validated/variables.tf's `people` variable)."""
    found: list[tuple[str, str, dict[str, Any]]] = []
    for entity_key in ENTITY_KEYS:
        entities = outputs.get(entity_key, {}).get("value", {}) or {}
        for entity_id, entity in entities.items():
            if "reviewable" in entity:
                found.append((entity_key, entity_id, entity["reviewable"]))
            if entity_key == "people":
                for i, position in enumerate(entity.get("positions", [])):
                    found.append(
                        (entity_key, f"{entity_id}.positions[{i}]", position["reviewable"])
                    )
    return found


def find_violations(
    outputs: dict[str, Any], as_of: str, max_horizon_days: int
) -> list[tuple[str, str, str, str]]:
    """Returns (entity_key, path, expiration_date, kind) for every Reviewable whose
    expiration_date is either before `as_of` ("overdue") or more than `max_horizon_days` days
    after it ("too far in the future"), sorted by expiration_date. ISO-8601 dates compare
    correctly as plain strings (unlike HCL, which needs timecmp())."""
    cutoff = (
        datetime.date.fromisoformat(as_of) + datetime.timedelta(days=max_horizon_days)
    ).isoformat()
    violations = []
    for entity_key, path, reviewable in find_reviewables(outputs):
        expiration_date = reviewable["expiration_date"]
        if expiration_date < as_of:
            violations.append((entity_key, path, expiration_date, "overdue"))
        elif expiration_date > cutoff:
            violations.append((entity_key, path, expiration_date, "too far in the future"))
    return sorted(violations, key=lambda row: row[2])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--as-of",
        default=None,
        help="Compare against this YYYY-MM-DD date instead of today.",
    )
    args = parser.parse_args()
    as_of = args.as_of or datetime.date.today().isoformat()

    plan = json.load(sys.stdin)
    outputs = plan.get("planned_values", {}).get("outputs")
    if not outputs:
        print(
            "error: no planned_values.outputs found in the plan JSON -- did "
            "org-model/outputs.tf or org-model/validated/outputs.tf get removed or renamed?",
            file=sys.stderr,
        )
        return 1

    violations = find_violations(outputs, as_of, MAX_HORIZON_DAYS)

    if not violations:
        print(
            f"ok: no reviewable expiration violations as of {as_of} "
            f"(must be on or after {as_of}, and no more than {MAX_HORIZON_DAYS} days out)"
        )
        return 0

    print(f"error: {len(violations)} reviewable expiration violation(s) as of {as_of}:", file=sys.stderr)
    for entity_key, path, expiration_date, kind in violations:
        print(f"  {entity_key}.{path}  expiration_date={expiration_date} ({kind})", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
