"""Resolves everyone holding something on one team, as one flat list of holdings.

Covers its head, the Roles in its `members` rows, and the AuthorityLines scoped to it -- each
with their deputy (see `models.TeamPerson`). Nothing cascades: only the team's own head, and
only AuthorityLines whose `teams` names this exact team (see CONTEXT.md's "AuthorityLine").
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from .org_data import OrgData


def _holder_and_deputy(
    holder: str, deputy: str | None, holder_fields: dict[str, Any], deputy_fields: dict[str, Any]
) -> Iterator[dict[str, Any]]:
    yield {"person": holder, "deputy_for": None, **holder_fields}
    if deputy is not None:
        yield {"person": deputy, "deputy_for": holder, **deputy_fields}


def _head_holdings(team: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield from _holder_and_deputy(
        team["head"],
        team["head_deputy"],
        {"kind": "head", "title": team["head_title"], "is_interim": team["is_head_interim"]},
        {
            "kind": "head",
            "title": team["head_deputy_title"],
            "is_interim": team["is_head_deputy_interim"],
        },
    )


def _role_holdings(team: dict[str, Any], roles: dict[str, Any]) -> Iterator[dict[str, Any]]:
    for member in team["members"]:
        shared = {
            "kind": "role",
            "role": member["role"],
            "role_name": roles[member["role"]]["name"],
        }
        yield from _holder_and_deputy(
            member["person"],
            member["deputy"],
            {**shared, "title": member["title"], "is_interim": member["is_interim"]},
            {**shared, "is_interim": member["is_deputy_interim"]},
        )


def _is_active(authority_line: dict[str, Any], today: str) -> bool:
    end_date = authority_line["end_date"]
    return authority_line["start_date"] <= today and (end_date is None or end_date >= today)


def _authority_line_holdings(org_data: OrgData, team_id: str, today: str) -> Iterator[dict[str, Any]]:
    for line_id, line in sorted(org_data.authority_lines.items()):
        if team_id not in line["teams"] or not _is_active(line, today):
            continue
        shared = {
            "kind": "authority_line",
            "authority_line": line_id,
            "authority_line_type": line["type"],
            "authority_line_type_title": org_data.authority_line_types[line["type"]]["title"],
        }
        yield from _holder_and_deputy(
            line["person"],
            line["deputy"],
            {**shared, "is_interim": line["is_interim"]},
            {**shared, "is_interim": line["is_deputy_interim"]},
        )


def resolve_team_people(org_data: OrgData, team_id: str, today: str) -> list[dict[str, Any]]:
    """`today` is an ISO-8601 date; `team_id` must exist in `org_data.teams`."""
    team = org_data.teams[team_id]
    return [
        *_head_holdings(team),
        *_role_holdings(team, org_data.roles),
        *_authority_line_holdings(org_data, team_id, today),
    ]
