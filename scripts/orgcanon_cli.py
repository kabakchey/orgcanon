#!/usr/bin/env python3
"""Guided scaffolding for common org-model/ edits: `orgcanon_cli.py add-person` and
`orgcanon_cli.py add-team-member`. Emits plain HCL into the target .tf file (no format change,
no reopening of the "editing stays raw HCL" decision -- see docs/architecture.md) via text
insertion, then runs `terraform fmt` on the modified file so the inserted text doesn't need to
be perfectly indented, only syntactically valid.

Usage:
    python3 scripts/orgcanon_cli.py add-person --file org-model/common/org.tf \\
        --id jane-doe --name "Jane Doe" --email jane@example.com \\
        --primary-specialization "Product Design" --expiration-date 2027-08-25 --owner jane-doe

    python3 scripts/orgcanon_cli.py add-team-member --file org-model/teams/platform/data.tf \\
        --team-id platform --person jane-doe --role designer --title "Designer" --primary
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

_IDENT_BOUNDARY_START = r"(?<![\w-])"
_IDENT_BOUNDARY_END = r"(?![\w-])"


def _find_matching_close(text: str, open_index: int) -> int:
    """`open_index` points at a '{' or '['. Returns the index of its matching close,
    skipping over double-quoted string contents (with backslash-escape support) so a brace
    or bracket character inside a string value is never mis-counted."""
    open_char = text[open_index]
    close_char = {"{": "}", "[": "]"}[open_char]
    depth = 0
    i = open_index
    in_string = False
    while i < len(text):
        ch = text[i]
        if in_string:
            if ch == "\\":
                i += 1
            elif ch == '"':
                in_string = False
        elif ch == '"':
            in_string = True
        elif ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError(f"no matching {close_char!r} found for {open_char!r} at index {open_index}")


def find_block_open(text: str, key: str, open_char: str, start: int = 0) -> int:
    """Finds `key = <open_char>` (e.g. `people = {`) and returns the index of `open_char`.
    The identifier boundary excludes `-` (kebab-case Entity IDs contain it), so `platform`
    never matches inside `platform-squad`."""
    pattern = re.compile(
        _IDENT_BOUNDARY_START
        + re.escape(key)
        + _IDENT_BOUNDARY_END
        + r"\s*=\s*"
        + re.escape(open_char)
    )
    match = pattern.search(text, start)
    if not match:
        raise ValueError(f"could not find `{key} = {open_char}` in the given text")
    return match.end() - 1


def insert_before_close(text: str, open_index: int, insertion: str) -> str:
    close_index = _find_matching_close(text, open_index)
    return text[:close_index] + insertion + text[close_index:]


def _render_person_entry(person_id: str, fields: dict[str, str]) -> str:
    return f'''  {person_id} = {{
    name                      = "{fields["name"]}"
    email                     = "{fields["email"]}"
    primary_specialization    = "{fields["primary_specialization"]}"
    secondary_specializations = []
    external_references       = {{}}
    documentation_url         = ""
    positions                 = []
    extensions                = {{}}
    reviewable = {{
      expiration_date = "{fields["expiration_date"]}"
      notes           = ""
      owner           = "{fields["owner"]}"
    }}
  }}
'''


def add_person(file_text: str, person_id: str, fields: dict[str, str]) -> str:
    open_index = find_block_open(file_text, "people", "{")
    return insert_before_close(file_text, open_index, _render_person_entry(person_id, fields))


def _render_member_entry(member: dict) -> str:
    deputy = f'"{member["deputy"]}"' if member.get("deputy") else "null"
    is_primary = "true" if member["is_primary_team"] else "false"
    is_deputy_interim = "false" if member.get("deputy") else "null"
    return f'''    {{
      person            = "{member["person"]}"
      role              = "{member["role"]}"
      title             = "{member["title"]}"
      is_primary_team   = {is_primary}
      deputy            = {deputy}
      is_interim        = false
      is_deputy_interim = {is_deputy_interim}
    }},
'''


def add_team_member(file_text: str, team_id: str, member: dict) -> str:
    teams_open = find_block_open(file_text, "teams", "{")
    teams_close = _find_matching_close(file_text, teams_open)
    team_open = find_block_open(file_text, team_id, "{", start=teams_open)
    if team_open > teams_close:
        raise ValueError(f"team {team_id!r} not found inside the teams block")
    team_close = _find_matching_close(file_text, team_open)
    members_open = find_block_open(file_text, "members", "[", start=team_open)
    if members_open > team_close:
        raise ValueError(f"'members' not found inside team {team_id!r}")
    return insert_before_close(file_text, members_open, _render_member_entry(member))


def _default_terraform_bin() -> str:
    return os.environ.get("TERRAFORM_BIN", "terraform")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="orgcanon_cli")
    sub = parser.add_subparsers(dest="command", required=True)

    p_person = sub.add_parser("add-person", help="Add a new person to a people = {...} map.")
    p_person.add_argument("--file", required=True, help="Path to the .tf file to edit.")
    p_person.add_argument("--id", required=True, help="Entity ID, lowercase kebab-case.")
    p_person.add_argument("--name", required=True)
    p_person.add_argument("--email", required=True)
    p_person.add_argument("--primary-specialization", required=True)
    p_person.add_argument("--expiration-date", required=True, help="YYYY-MM-DD")
    p_person.add_argument("--owner", required=True, help="Entity ID of the reviewable owner.")

    p_member = sub.add_parser("add-team-member", help="Add a new member row to a team.")
    p_member.add_argument("--file", required=True, help="Path to the .tf file to edit.")
    p_member.add_argument("--team-id", required=True)
    p_member.add_argument("--person", required=True)
    p_member.add_argument("--role", required=True)
    p_member.add_argument("--title", required=True)
    p_member.add_argument("--primary", action="store_true")
    p_member.add_argument("--deputy", default=None)

    args = parser.parse_args(argv)
    path = Path(args.file)
    text = path.read_text()

    if args.command == "add-person":
        new_text = add_person(
            text,
            args.id,
            {
                "name": args.name,
                "email": args.email,
                "primary_specialization": args.primary_specialization,
                "expiration_date": args.expiration_date,
                "owner": args.owner,
            },
        )
    else:
        new_text = add_team_member(
            text,
            args.team_id,
            {
                "person": args.person,
                "role": args.role,
                "title": args.title,
                "is_primary_team": args.primary,
                "deputy": args.deputy,
            },
        )

    path.write_text(new_text)
    subprocess.run([_default_terraform_bin(), "fmt", str(path)], check=True)
    print(f"ok: updated {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
