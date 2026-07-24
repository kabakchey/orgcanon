"""Loads the org-as-code data model from Terraform, once, by trusting Terraform's own
evaluated output (`terraform plan` + `apply` + `show -json`) rather than parsing .tf files --
same "don't build a second parser for Terraform's own format" principle as the main repo's own
validation and once-at-startup loading, applied independently here in Python for orgapi's own
use.

`apply` runs (against a state file inside the same ephemeral tempdir as the plan, never a real
backend -- there's no backend/provider block anywhere in this schema) because `plan` alone does
not evaluate a `validation` condition that depends on `timestamp()`; Terraform defers those to
`apply`. The departed-person checks are the only such conditions today. See the
main repo's Makefile for the same fix applied to `make check`."""

from __future__ import annotations

import json
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .team_hierarchy import find_cycle

ORG_DATA_OUTPUT_KEYS = (
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


def load_org_data(data_dir: str, terraform_bin: str) -> OrgData:
    with tempfile.TemporaryDirectory(prefix="orgapi-tfplan-") as plan_dir:
        plan_file = str(Path(plan_dir) / "tfplan")
        state_file = str(Path(plan_dir) / "tfstate")

        subprocess.run(
            [terraform_bin, f"-chdir={data_dir}", "init", "-backend=false", "-input=false"],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            [
                terraform_bin,
                f"-chdir={data_dir}",
                "plan",
                "-input=false",
                f"-state={state_file}",
                f"-out={plan_file}",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        subprocess.run(
            [
                terraform_bin,
                f"-chdir={data_dir}",
                "apply",
                "-input=false",
                "-auto-approve",
                f"-state={state_file}",
                plan_file,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        show_result = subprocess.run(
            [terraform_bin, f"-chdir={data_dir}", "show", "-json", plan_file],
            check=True,
            capture_output=True,
            text=True,
        )

    org_data = _parse_org_data(json.loads(show_result.stdout))

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
