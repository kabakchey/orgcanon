#!/usr/bin/env python3
"""Guided scaffolding for common org-model/ edits: `add-person` and `add-team-member`.

Emits plain HCL into the target .tf file (no format change, no reopening of the "editing stays
raw HCL" decision -- see docs/architecture.md) via text insertion, then runs `terraform fmt` on
the modified file so the inserted text doesn't need to be perfectly indented, only
syntactically valid.

Usage:
    python3 scripts/orgcanon_cli.py add-person --file org-model/common/org.tf \
        --id jane-doe --name "Jane Doe" --email jane@example.com \
        --primary-specialization "Product Design" --expiration-date 2027-08-25 --owner jane-doe

    python3 scripts/orgcanon_cli.py add-team-member --file org-model/teams/platform/data.tf \
        --team-id platform --person jane-doe --role designer --title "Designer" --primary
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

_IDENT_BOUNDARY_START = r"(?<![\w-])"
_IDENT_BOUNDARY_END = r"(?![\w-])"


def _find_matching_close(text: str, open_index: int) -> int:
    """Return the index of the close matching the '{' or '[' at `open_index`.

    Skips double-quoted string contents (with backslash-escape support) so a brace or bracket
    character inside a string value is never mis-counted.
    """
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


def find_block_open(
    text: str, key: str, open_char: str, start: int = 0, end: int | None = None
) -> int:
    """Find `key = <open_char>` (e.g. `people = {`) and return the index of `open_char`.

    Searches `text[start:end]` only. The identifier boundary excludes `-` (kebab-case Entity
    IDs contain it), so `platform` never matches inside `platform-squad`.
    """
    pattern = re.compile(
        _IDENT_BOUNDARY_START
        + re.escape(key)
        + _IDENT_BOUNDARY_END
        + r"\s*=\s*"
        + re.escape(open_char)
    )
    match = pattern.search(text, start, len(text) if end is None else end)
    if not match:
        raise ValueError(f"could not find `{key} = {open_char}` in the given text")
    return match.end() - 1


def insert_before_close(text: str, open_index: int, insertion: str) -> str:
    close_index = _find_matching_close(text, open_index)
    return text[:close_index] + insertion + text[close_index:]


def add_person(
    file_text: str,
    person_id: str,
    *,
    name: str,
    email: str,
    primary_specialization: str,
    expiration_date: str,
    owner: str,
) -> str:
    entry = f'''  {person_id} = {{
    name                      = "{name}"
    email                     = "{email}"
    primary_specialization    = "{primary_specialization}"
    secondary_specializations = []
    external_references       = {{}}
    documentation_url         = ""
    positions                 = []
    extensions                = {{}}
    reviewable = {{
      expiration_date = "{expiration_date}"
      notes           = ""
      owner           = "{owner}"
    }}
  }}
'''
    return insert_before_close(file_text, find_block_open(file_text, "people", "{"), entry)


def add_team_member(
    file_text: str,
    team_id: str,
    *,
    person: str,
    role: str,
    title: str,
    is_primary_team: bool,
    deputy: str | None = None,
) -> str:
    entry = f'''    {{
      person            = "{person}"
      role              = "{role}"
      title             = "{title}"
      is_primary_team   = {"true" if is_primary_team else "false"}
      deputy            = {f'"{deputy}"' if deputy else "null"}
      is_interim        = false
      is_deputy_interim = {"false" if deputy else "null"}
    }},
'''
    teams_open = find_block_open(file_text, "teams", "{")
    team_open = find_block_open(
        file_text, team_id, "{", teams_open, _find_matching_close(file_text, teams_open)
    )
    members_open = find_block_open(
        file_text, "members", "[", team_open, _find_matching_close(file_text, team_open)
    )
    return insert_before_close(file_text, members_open, entry)


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
            name=args.name,
            email=args.email,
            primary_specialization=args.primary_specialization,
            expiration_date=args.expiration_date,
            owner=args.owner,
        )
    else:
        new_text = add_team_member(
            text,
            args.team_id,
            person=args.person,
            role=args.role,
            title=args.title,
            is_primary_team=args.primary,
            deputy=args.deputy,
        )

    path.write_text(new_text)
    subprocess.run([os.environ.get("TERRAFORM_BIN", "terraform"), "fmt", str(path)], check=True)
    print(f"ok: updated {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
