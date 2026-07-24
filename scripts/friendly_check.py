#!/usr/bin/env python3
"""Runs `terraform plan` for org-model/ and, on failure, re-prints just the validation
error_message text (e.g. "people[*].email must be unique across all people.") instead of the
full Terraform error block (module trace, file/line context, "This was checked by the
validation rule at ..."). Written for the non-technical editing workflow described in
docs/onboarding-people-ops.md -- someone editing org-model/common/ or
org-model/teams/<team>/ shouldn't need to parse a Terraform stack trace to find out what they
broke.

Does NOT replace `make check` -- this is a friendlier *view* of the same failure, not a
different check, and is not wired into CI (CI keeps the full Terraform output, which platform
engineers debugging a schema change still need). Exit code mirrors the underlying
`terraform plan` (0 on success, nonzero on failure).

Usage:
    python3 scripts/friendly_check.py
"""

import os
import re
import subprocess
import sys

ERROR_RE = re.compile(
    r"Error: Invalid value for variable\n\n.*?\n\n(?P<message>.+?)\n\n"
    r"This was checked by the validation rule at (?P<location>\S+)",
    re.DOTALL,
)


def extract_messages(plan_output: str) -> list[str]:
    return [m.group("message").strip() for m in ERROR_RE.finditer(plan_output)]


def _default_terraform_bin() -> str:
    return os.environ.get("TERRAFORM_BIN", "terraform")


def main() -> int:
    result = subprocess.run(
        [_default_terraform_bin(), "-chdir=org-model", "plan", "-input=false", "-no-color"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("ok: no data problems found")
        return 0

    # Empirically this Terraform version puts the error block on stderr and the plan diff on
    # stdout -- check both rather than assume one stream.
    messages = extract_messages(result.stdout) or extract_messages(result.stderr)
    if not messages:
        # Not a validation-block failure (e.g. a syntax error).
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        return result.returncode

    print(f"{len(messages)} problem(s) found in the org data:")
    for message in messages:
        print(f"  - {message}")
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
