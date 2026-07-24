"""Schema-drift test: round-trips real Terraform JSON through the bare (non-id) Pydantic
record models. An unmodeled or renamed field in
org-model/validated/variables.tf fails here as an unexpected or missing key -- no separate HCL
parser involved, just Terraform's own evaluated output.

Runs against both the real `org-model/` data and orgapi's own test fixture -- real
`org-model/` data alone isn't enough for full entity-type coverage today, since it currently
holds only the placeholder template (one placeholder person/team, zero roles/authority_lines/
components), so the fixture fills that gap.
"""

from pathlib import Path

import pytest

from orgapi.models import ENTITY_MODELS
from orgapi.org_data import ORG_DATA_OUTPUT_KEYS, load_org_data

REPO_ROOT = Path(__file__).parents[3]
TERRAFORM_BIN = "terraform"
FIXTURE_DIR = Path(__file__).parent / "fixtures" / "orgdata"


@pytest.fixture(scope="session")
def real_org_data():
    return load_org_data(str(REPO_ROOT / "org-model"), str(TERRAFORM_BIN))


@pytest.mark.parametrize("source", ["real_terraform", "orgapi_fixture"])
@pytest.mark.parametrize("entity_key", ORG_DATA_OUTPUT_KEYS)
def test_entities_round_trip_through_the_bare_record_model(
    source, entity_key, real_org_data, fixture_org_data
):
    org_data = real_org_data if source == "real_terraform" else fixture_org_data
    record_model, _response_model = ENTITY_MODELS[entity_key]
    raw_entities = getattr(org_data, entity_key)

    for entity_id, entity in raw_entities.items():
        record_model.model_validate(entity)
