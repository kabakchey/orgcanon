#!/usr/bin/env python3
"""Posts, or updates in place, one PR/MR comment carrying the `make diff-summary` output.

GitHub: `gh pr comment --edit-last --create-if-none` already edits the bot's own last comment
instead of adding one per push. Needs GH_TOKEN in the environment, plus --repo/--pr-number --
GitHub Actions only exposes those through `${{ }}` expression context, not as plain env vars.

GitLab: no CLI ships that behavior, so it is reimplemented against the MR Notes REST API
(https://docs.gitlab.com/ee/api/notes.html). The note to update must start with MARKER *and* be
authored by the token's own user, so another MR participant can't hijack it by starting their
own comment with the marker. Reads CI_API_V4_URL/CI_PROJECT_ID/CI_MERGE_REQUEST_IID (provided
by GitLab CI in merge request pipelines) and GITLAB_MR_TOKEN (a project access token, `api`
scope) -- GitLab's built-in CI_JOB_TOKEN has known Notes-API permission gaps. CI_API_V4_URL
must be `https://`: Python's urllib forwards the PRIVATE-TOKEN header across redirects
(including cross-host ones), so an `http://` URL would put the token on the wire in cleartext.

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


def find_existing_note_id(notes: list[dict], author_id: int) -> int | None:
    for note in notes:
        if note.get("body", "").startswith(MARKER) and note.get("author", {}).get("id") == author_id:
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
    existing_id = find_existing_note_id(notes, author_id=current_user["id"])
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
