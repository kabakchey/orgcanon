import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from orgcanon_cli import (  # noqa: E402
    _find_matching_close,
    add_person,
    add_team_member,
    find_block_open,
    insert_before_close,
)


class TestFindMatchingClose(unittest.TestCase):
    def test_matches_simple_braces(self):
        text = "locals { a = 1 }"
        open_index = text.index("{")
        self.assertEqual(_find_matching_close(text, open_index), text.index("}"))

    def test_skips_an_unbalanced_brace_inside_a_string_literal(self):
        text = 'locals { name = "a } b" }'
        open_index = text.index("{")
        close_index = _find_matching_close(text, open_index)
        self.assertEqual(close_index, text.rindex("}"))
        self.assertNotEqual(close_index, text.index("}"))

    def test_matches_nested_braces(self):
        text = "{ a = { b = {} } }"
        self.assertEqual(_find_matching_close(text, 0), len(text) - 1)


class TestFindBlockOpen(unittest.TestCase):
    def test_finds_a_top_level_map_key(self):
        text = 'locals {\n  people = {\n    alice = {}\n  }\n}'
        open_index = find_block_open(text, "people", "{")
        self.assertEqual(text[open_index], "{")

    def test_does_not_match_a_key_that_is_a_substring_of_another(self):
        text = 'locals {\n  platform = {}\n  platform-squad = { x = 1 }\n}'
        open_index = find_block_open(text, "platform", "{")
        self.assertLess(open_index, text.index("platform-squad"))


class TestInsertBeforeClose(unittest.TestCase):
    def test_inserts_text_immediately_before_the_matching_close(self):
        text = "{ a = 1 }"
        result = insert_before_close(text, 0, " b = 2")
        # double space is expected: insertion is spliced in verbatim, not reformatted --
        # that's what the CLI's `terraform fmt` pass afterward is for
        self.assertEqual(result, "{ a = 1  b = 2}")


JANE = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "primary_specialization": "Design",
    "expiration_date": "2027-08-25",
    "owner": "jane-doe",
}
JANE_AS_DESIGNER = {
    "person": "jane-doe",
    "role": "designer",
    "title": "Designer",
    "is_primary_team": True,
}


class TestAddPerson(unittest.TestCase):
    def test_adds_a_new_person_entry_to_the_people_map(self):
        text = "locals {\n  people = {\n    alice = {}\n  }\n}\n"
        result = add_person(text, "jane-doe", **JANE)
        self.assertIn('jane-doe = {', result)
        self.assertIn('name                      = "Jane Doe"', result)
        self.assertIn('email                     = "jane@example.com"', result)
        self.assertIn("alice = {}", result)

    def test_generated_entry_carries_a_documentation_url_field(self):
        text = "locals {\n  people = {\n    alice = {}\n  }\n}\n"
        result = add_person(text, "jane-doe", **JANE)
        self.assertIn('documentation_url         = ""', result)


class TestAddTeamMember(unittest.TestCase):
    def test_adds_a_new_member_to_the_named_team(self):
        text = (
            "locals {\n"
            "  teams = {\n"
            "    platform = {\n"
            "      members = [\n"
            "        { person = \"bob\" },\n"
            "      ]\n"
            "    }\n"
            "    growth = {\n"
            "      members = []\n"
            "    }\n"
            "  }\n"
            "}\n"
        )
        result = add_team_member(text, "platform", **JANE_AS_DESIGNER)
        self.assertIn('person            = "jane-doe"', result)
        self.assertIn("is_interim        = false", result)
        self.assertIn("is_deputy_interim = null", result)
        platform_span = result[result.index("platform"):result.index("growth")]
        self.assertIn("jane-doe", platform_span)
        self.assertIn('{ person = "bob" }', result)

    def test_deputy_set_marks_is_deputy_interim_as_a_bool_not_null(self):
        text = (
            "locals {\n"
            "  teams = {\n"
            "    platform = {\n"
            "      members = [\n"
            "      ]\n"
            "    }\n"
            "  }\n"
            "}\n"
        )
        result = add_team_member(text, "platform", **JANE_AS_DESIGNER, deputy="bob")
        self.assertIn("is_deputy_interim = false", result)


if __name__ == "__main__":
    unittest.main()
