"""Reads `terraform show -json` plan documents for the scripts in this directory.

Stdlib-only, like its callers, so every script still runs as a bare `python3 scripts/<name>.py`.
"""

import json
import sys
from typing import Any


def output_value(plan: dict[str, Any], key: str) -> dict[str, Any]:
    return plan.get("planned_values", {}).get("outputs", {}).get(key, {}).get("value") or {}


def read_plan_file(path: str) -> dict[str, Any]:
    with open(path) as f:
        return json.load(f)


def read_stdin_plan() -> dict[str, Any]:
    """Return the plan piped to stdin, exiting with an error if it carries no outputs."""
    plan = json.load(sys.stdin)
    if not plan.get("planned_values", {}).get("outputs"):
        sys.exit(
            "error: no planned_values.outputs found in the plan JSON -- did "
            "org-model/outputs.tf or org-model/validated/outputs.tf get removed or renamed?"
        )
    return plan
