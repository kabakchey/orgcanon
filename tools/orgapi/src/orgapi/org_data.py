"""Loads the org-as-code data model from Terraform, once.

Trusts Terraform's own evaluated output (`terraform plan` + `apply` + `show -json`) rather than
parsing .tf files -- no second parser for Terraform's own format.

`apply` runs (against a state file inside the same ephemeral tempdir as the plan, never a real
backend -- there's no backend/provider block anywhere in this schema) because `plan` alone does
not evaluate a `validation` condition that depends on `timestamp()`; Terraform defers those to
`apply`. The departed-person checks are the only such conditions today.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
from dataclasses import dataclass, fields
from pathlib import Path
from typing import Any

from .team_hierarchy import find_cycle

@dataclass(frozen=True)
class OrgData:
    formal_position_types: dict[str, Any]
    authority_line_types: dict[str, Any]
    team_types: dict[str, Any]
    component_types: dict[str, Any]
    people: dict[str, Any]
    roles: dict[str, Any]
    teams: dict[str, Any]
    authority_lines: dict[str, Any]
    components: dict[str, Any]


ORG_DATA_OUTPUT_KEYS = tuple(field.name for field in fields(OrgData))


def load_org_data(data_dir: str, terraform_bin: str) -> OrgData:
    def terraform(*args: str) -> str:
        return subprocess.run(
            [terraform_bin, f"-chdir={data_dir}", *args],
            check=True,
            capture_output=True,
            text=True,
        ).stdout

    with tempfile.TemporaryDirectory(prefix="orgapi-tfplan-") as plan_dir:
        plan_file = str(Path(plan_dir) / "tfplan")
        state = f"-state={Path(plan_dir) / 'tfstate'}"

        terraform("init", "-backend=false", "-input=false")
        terraform("plan", "-input=false", state, f"-out={plan_file}")
        terraform("apply", "-input=false", "-auto-approve", state, plan_file)
        plan_json = terraform("show", "-json", plan_file)

    org_data = _parse_org_data(json.loads(plan_json))

    cycle = find_cycle(org_data.teams)
    if cycle:
        raise ValueError(
            "load_org_data: teams.parent_team hierarchy contains a cycle: " + " -> ".join(cycle)
        )

    return org_data


def _parse_org_data(plan_json: dict[str, Any]) -> OrgData:
    outputs = plan_json.get("planned_values", {}).get("outputs")
    if not outputs:
        raise ValueError(
            "load_org_data: no planned_values.outputs found in the plan JSON -- did "
            "org-model/outputs.tf or org-model/validated/outputs.tf get removed or renamed?"
        )

    values = {}
    for key in ORG_DATA_OUTPUT_KEYS:
        output = outputs.get(key)
        if not output or not isinstance(output.get("value"), dict):
            raise ValueError(
                f"load_org_data: no planned_values.outputs.{key}.value found in the plan JSON "
                "-- did org-model/outputs.tf or org-model/validated/outputs.tf get removed or "
                "renamed?"
            )
        values[key] = output["value"]

    return OrgData(**values)
