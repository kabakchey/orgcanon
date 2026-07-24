import subprocess
from pathlib import Path

import pytest

from orgapi.org_data import load_org_data

FIXTURE_DIR = Path(__file__).parent / "fixtures" / "orgdata"
CYCLIC_FIXTURE_DIR = Path(__file__).parent / "fixtures" / "orgdata_cyclic"
DEPARTED_REFERENCE_FIXTURE_DIR = Path(__file__).parent / "fixtures" / "orgdata_departed_reference"
TERRAFORM_BIN = "terraform"


def test_load_org_data_raises_on_a_cyclic_team_hierarchy():
    with pytest.raises(ValueError, match="cycle"):
        load_org_data(str(CYCLIC_FIXTURE_DIR), str(TERRAFORM_BIN))


def test_load_org_data_raises_on_a_departed_person_still_referenced():
    # Proves the `apply` step (not just malformed fixture data) enforces this, since `plan` alone wouldn't catch it.
    # CalledProcessError's str() omits stdout/stderr, so check those directly instead of pytest.raises(match=...).
    with pytest.raises(subprocess.CalledProcessError) as exc_info:
        load_org_data(str(DEPARTED_REFERENCE_FIXTURE_DIR), str(TERRAFORM_BIN))
    assert "has not departed" in (exc_info.value.stdout or "") + (exc_info.value.stderr or "")


def test_load_org_data_returns_the_fixture_orgs_entities():
    org_data = load_org_data(str(FIXTURE_DIR), str(TERRAFORM_BIN))

    assert org_data.people["bob-santos"]["email"] == "bob.santos@example.com"
    assert org_data.teams["platform"]["parent_team"] == "acme-hq"
    assert org_data.components["web"]["dependency_components"] == ["api"]


def test_load_org_data_raises_on_a_bad_data_dir():
    with pytest.raises(Exception):
        load_org_data(str(FIXTURE_DIR / "does-not-exist"), str(TERRAFORM_BIN))
