#!/usr/bin/env python3
"""Posts (or updates) a single informational comment/note on a PR/MR containing the org-data
diff summary produced by `make diff-summary` (scripts/summarize_org_diff.py). Called
identically from .github/workflows/pr-diff-summary.yml (--platform github) and
.gitlab-ci.yml's mr-diff-summary job (--platform gitlab).

GitHub: shells out to `gh pr comment --edit-last --create-if-none`, which already
deduplicates by editing the bot's own last comment instead of spamming a new one per push. The
posted body is prefixed with MARKER too (harmless -- it's an HTML comment, invisible when
rendered), purely for consistency with the GitLab path; `--edit-last` itself doesn't need it.
Needs GH_TOKEN in the environment (GitHub Actions' automatic `github.token` works) plus
--repo/--pr-number -- GitHub Actions only exposes those through `${{ }}` expression context,
not as plain env vars, so the calling workflow passes them as CLI args.

GitLab: no CLI ships this comment-editing behavior, so it's reimplemented directly against the
MR Notes REST API (https://docs.gitlab.com/ee/api/notes.html): fetch the token's own user id
(GET /user), list existing notes, find one whose body starts with MARKER *and* was authored by
that same user id (so another MR participant can't hijack the bot's note by starting their own
comment with the marker), PUT to update it if found, POST a new one otherwise. Reads
CI_API_V4_URL/CI_PROJECT_ID/CI_MERGE_REQUEST_IID -- all auto-provided by GitLab CI in merge
request pipelines -- and requires a GITLAB_MR_TOKEN CI/CD variable (a project access token,
`api` scope) the adopter creates once; GitLab's built-in CI_JOB_TOKEN has known Notes-API
permission gaps, so this repo deliberately requires the explicit token instead. See README's
"Contributing" section. CI_API_V4_URL must be `https://` -- Python's urllib forwards the
PRIVATE-TOKEN header across redirects (including cross-host ones), so an `http://` URL would
put the token on the wire in cleartext.

Usage:
    python3 scripts/post_review_comment.py --platform github --repo OWNER/REPO --pr-number N summary.md
    python3 scripts/post_review_comment.py --platform gitlab summary.md
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

MARKER = "<!-- orgcanon-org-diff-summary -->"


def find_existing_note_id(notes: list[dict], marker: str, author_id: int) -> int | None:
    for note in notes:
        if note.get("body", "").startswith(marker) and note.get("author", {}).get("id") == author_id:
            return note["id"]
    return None


def post_github(repo: str, pr_number: str, body: str) -> None:
    subprocess.run(
        [
            "gh",
            "pr",
            "comment",
            pr_number,
            "--repo",
            repo,
            "--edit-last",
            "--create-if-none",
            "--body",
            f"{MARKER}\n{body}",
        ],
        check=True,
    )


def _gitlab_request(url: str, token: str, method: str = "GET", data: dict | None = None) -> object:
    payload = json.dumps(data).encode() if data is not None else None
    request = urllib.request.Request(url, data=payload, method=method)
    request.add_header("PRIVATE-TOKEN", token)
    if payload is not None:
        request.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def post_gitlab(api_url: str, project_id: str, mr_iid: str, token: str, body: str) -> None:
    if not api_url.startswith("https://"):
        raise ValueError(f"CI_API_V4_URL must use https://, got: {api_url!r}")

    base = f"{api_url}/projects/{project_id}/merge_requests/{mr_iid}/notes"
    marked_body = f"{MARKER}\n{body}"
    current_user = _gitlab_request(f"{api_url}/user", token)
    notes = _gitlab_request(f"{base}?per_page=100&order_by=created_at&sort=desc", token)
    existing_id = find_existing_note_id(notes, MARKER, author_id=current_user["id"])
    if existing_id is not None:
        _gitlab_request(f"{base}/{existing_id}", token, method="PUT", data={"body": marked_body})
    else:
        _gitlab_request(base, token, method="POST", data={"body": marked_body})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", required=True, choices=["github", "gitlab"])
    parser.add_argument("--repo", help="OWNER/REPO -- required for --platform github")
    parser.add_argument("--pr-number", help="Pull request number -- required for --platform github")
    parser.add_argument("summary_file", help="Path to the Markdown summary to post")
    args = parser.parse_args()

    with open(args.summary_file) as f:
        body = f.read()

    if args.platform == "github":
        if not args.repo or not args.pr_number:
            parser.error("--repo and --pr-number are required for --platform github")
        post_github(args.repo, args.pr_number, body)
    else:
        try:
            api_url = os.environ["CI_API_V4_URL"]
            project_id = os.environ["CI_PROJECT_ID"]
            mr_iid = os.environ["CI_MERGE_REQUEST_IID"]
            token = os.environ["GITLAB_MR_TOKEN"]
        except KeyError as missing:
            print(f"error: required environment variable {missing} is not set", file=sys.stderr)
            return 2
        try:
            post_gitlab(api_url, project_id, mr_iid, token, body)
        except urllib.error.HTTPError as error:
            print(
                f"error: GitLab API request failed ({error.code} {error.reason}) -- check that "
                "GITLAB_MR_TOKEN is a valid project access token with the `api` scope",
                file=sys.stderr,
            )
            return 3
        except ValueError as error:
            print(f"error: {error}", file=sys.stderr)
            return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
