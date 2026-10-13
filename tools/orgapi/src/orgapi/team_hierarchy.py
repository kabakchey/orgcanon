"""Cycle detection on teams[*].parent_team, by depth-first search.

This can't be a Terraform `validation` block because HCL's `for` expressions can't do unbounded
recursion. Mirrors scripts/check_team_hierarchy.py's algorithm exactly, duplicated rather than
imported -- no shared import path exists between this uv-managed package and that unpackaged,
stdlib-only directory.
"""

from __future__ import annotations

from typing import Any

WHITE, GRAY, BLACK = 0, 1, 2


def find_cycle(teams: dict[str, Any]) -> list[str] | None:
    color = {team_id: WHITE for team_id in teams}

    def visit(team_id: str, path: list[str]) -> list[str] | None:
        color[team_id] = GRAY
        path.append(team_id)

        parent = teams[team_id].get("parent_team")
        if parent is not None and parent in teams:
            if color[parent] == GRAY:
                return path[path.index(parent) :] + [parent]
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
