import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))

from post_review_comment import (  # noqa: E402
    MARKER,
    find_existing_note_id,
    main,
    post_github,
    post_gitlab,
)


class TestFindExistingNoteId(unittest.TestCase):
    def test_returns_id_of_note_starting_with_marker_from_the_given_author(self):
        notes = [
            {"id": 1, "body": "unrelated note", "author": {"id": 42}},
            {"id": 2, "body": f"{MARKER}\nold summary", "author": {"id": 99}},
        ]
        self.assertEqual(find_existing_note_id(notes, MARKER, author_id=99), 2)

    def test_ignores_a_marker_match_from_a_different_author(self):
        notes = [{"id": 1, "body": f"{MARKER}\nspoofed", "author": {"id": 42}}]
        self.assertIsNone(find_existing_note_id(notes, MARKER, author_id=99))

    def test_returns_none_when_no_note_matches(self):
        notes = [{"id": 1, "body": "unrelated note", "author": {"id": 99}}]
        self.assertIsNone(find_existing_note_id(notes, MARKER, author_id=99))

    def test_returns_none_for_empty_list(self):
        self.assertIsNone(find_existing_note_id([], MARKER, author_id=99))


class TestPostGithub(unittest.TestCase):
    @patch("post_review_comment.subprocess.run")
    def test_calls_gh_pr_comment_with_edit_last_create_if_none(self, mock_run):
        post_github("my-org/my-repo", "42", "**Org data changes in this PR:**\n\n- x")

        mock_run.assert_called_once_with(
            [
                "gh",
                "pr",
                "comment",
                "42",
                "--repo",
                "my-org/my-repo",
                "--edit-last",
                "--create-if-none",
                "--body",
                f"{MARKER}\n**Org data changes in this PR:**\n\n- x",
            ],
            check=True,
        )


class TestPostGitlab(unittest.TestCase):
    @patch("post_review_comment._gitlab_request")
    def test_creates_new_note_when_none_exists(self, mock_request):
        mock_request.side_effect = [{"id": 99}, [], {}]

        post_gitlab("https://gitlab.example.com/api/v4", "7", "9", "tok", "summary body")

        user_call, list_call, post_call = mock_request.call_args_list
        self.assertEqual(user_call.args[0], "https://gitlab.example.com/api/v4/user")
        self.assertEqual(
            list_call.args[0],
            "https://gitlab.example.com/api/v4/projects/7/merge_requests/9/notes?per_page=100&order_by=created_at&sort=desc",
        )
        self.assertEqual(post_call.args[0], "https://gitlab.example.com/api/v4/projects/7/merge_requests/9/notes")
        self.assertEqual(post_call.kwargs["method"], "POST")
        self.assertEqual(post_call.kwargs["data"], {"body": f"{MARKER}\nsummary body"})

    @patch("post_review_comment._gitlab_request")
    def test_updates_existing_note_from_the_same_author_when_marker_found(self, mock_request):
        mock_request.side_effect = [
            {"id": 99},
            [{"id": 55, "body": f"{MARKER}\nold summary", "author": {"id": 99}}],
            {},
        ]

        post_gitlab("https://gitlab.example.com/api/v4", "7", "9", "tok", "new summary body")

        user_call, list_call, put_call = mock_request.call_args_list
        self.assertEqual(
            put_call.args[0],
            "https://gitlab.example.com/api/v4/projects/7/merge_requests/9/notes/55",
        )
        self.assertEqual(put_call.kwargs["method"], "PUT")
        self.assertEqual(put_call.kwargs["data"], {"body": f"{MARKER}\nnew summary body"})

    @patch("post_review_comment._gitlab_request")
    def test_ignores_a_marker_match_from_a_different_author_and_creates_a_new_note(self, mock_request):
        mock_request.side_effect = [
            {"id": 99},
            [{"id": 55, "body": f"{MARKER}\nold summary", "author": {"id": 1}}],
            {},
        ]

        post_gitlab("https://gitlab.example.com/api/v4", "7", "9", "tok", "new summary body")

        user_call, list_call, post_call = mock_request.call_args_list
        self.assertEqual(post_call.args[0], "https://gitlab.example.com/api/v4/projects/7/merge_requests/9/notes")
        self.assertEqual(post_call.kwargs["method"], "POST")

    def test_rejects_a_non_https_api_url_without_making_any_request(self):
        with patch("post_review_comment._gitlab_request") as mock_request:
            with self.assertRaises(ValueError):
                post_gitlab("http://gitlab.example.com/api/v4", "7", "9", "tok", "summary body")
            mock_request.assert_not_called()


class TestMainGitlabErrorHandling(unittest.TestCase):
    def _run_main_with_summary_file(self, args, body="summary body"):
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write(body)
            path = f.name
        try:
            with patch("post_review_comment.sys.argv", ["post_review_comment.py", *args, path]):
                return main()
        finally:
            Path(path).unlink()

    @patch.dict(
        "post_review_comment.os.environ",
        {
            "CI_API_V4_URL": "https://gitlab.example.com/api/v4",
            "CI_PROJECT_ID": "7",
            "CI_MERGE_REQUEST_IID": "9",
            "GITLAB_MR_TOKEN": "tok",
        },
        clear=True,
    )
    @patch("post_review_comment.post_gitlab")
    def test_prints_a_friendly_message_and_returns_nonzero_on_http_error(self, mock_post_gitlab):
        mock_post_gitlab.side_effect = urllib.error.HTTPError(
            "https://gitlab.example.com/api/v4/user", 401, "Unauthorized", {}, None
        )

        with patch("post_review_comment.sys.stderr") as mock_stderr:
            exit_code = self._run_main_with_summary_file(["--platform", "gitlab"])

        self.assertNotEqual(exit_code, 0)
        printed = "".join(call.args[0] for call in mock_stderr.write.call_args_list)
        self.assertIn("GITLAB_MR_TOKEN", printed)
        self.assertIn("401", printed)


if __name__ == "__main__":
    unittest.main()
