#!/usr/bin/env python3
"""Real cycle detection for teams[*].parent_team.

HCL's `for` expressions can't do unbounded recursion, so org-model/validated/ can't check this
itself. This script runs a real DFS over the hierarchy instead.

Duplicated in tools/orgapi/src/orgapi/team_hierarchy.py (same algorithm, same signature): no
import path is shared between this unpackaged, stdlib-only directory and orgapi's uv-managed
package.

Reads `terraform show -json` output from stdin -- never parses .tf files directly, and never
reimplements org-model/main.tf's merge() logic; it only trusts what Terraform itself already
computed, via the `teams` output re-exported by org-model/outputs.tf.

Usage:
    terraform -chdir=org-model plan -input=false -out=tfplan
    terraform -chdir=org-model show -json tfplan | python3 scripts/check_team_hierarchy.py
"""

import sys

from plan_json import read_stdin_plan

WHITE, GRAY, BLACK = 0, 1, 2


def find_cycle(teams: dict) -> list[str] | None:
    color = {team_id: WHITE for team_id in teams}

    def visit(team_id: str, path: list[str]) -> list[str] | None:
        color[team_id] = GRAY
        path.append(team_id)

        parent = teams[team_id].get("parent_team")
        if parent is not None and parent in teams:
            if color[parent] == GRAY:
                return path[path.index(parent):] + [parent]
            if color[parent] == WHITE:
                cycle = visit(parent, path)
                if cycle:
                    return cycle

        path.pop()
        color[team_id] = BLACK
        return None

    for team_id in teams:
        if color[team_id] == WHITE:
            cycle = visit(team_id, [])
            if cycle:
                return cycle
    return None


def main() -> int:
    outputs = read_stdin_plan()["planned_values"]["outputs"]
    if "teams" not in outputs:
        print(
            "error: no planned_values.outputs.teams found in the plan JSON -- did "
            "org-model/outputs.tf and org-model/validated/outputs.tf get removed or renamed?",
            file=sys.stderr,
        )
        return 1
    teams = outputs["teams"]["value"]

    cycle = find_cycle(teams)
    if cycle:
        print(
            "error: teams.parent_team hierarchy contains a cycle: " + " -> ".join(cycle),
            file=sys.stderr,
        )
        return 1

    print(f"ok: {len(teams)} teams, parent_team hierarchy is acyclic")
    return 0


if __name__ == "__main__":
    sys.exit(main())
