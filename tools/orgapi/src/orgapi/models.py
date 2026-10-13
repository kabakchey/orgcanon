"""One Pydantic model per entity in org-model/validated/variables.tf, field-for-field.

Each entity has two forms:
- A bare "Record" model (`extra="forbid"`) shaped exactly like Terraform's own evaluated
  output for that entity -- no `id` field, since Terraform's map key is never part of the
  entity's own value. This is what the schema-drift test (`tests/test_schema_drift.py`)
  validates real Terraform JSON against.
- A response model, which extends the Record with the `id` field spliced back in (the map key,
  known from context). This is what the API actually returns.

Keeping these separate matters: if `id` lived on the Record model, the drift test would flag
every entity's real Terraform output as invalid (Terraform never emits an `id` key).

Every field carries a `Field(description=...)` and every class a docstring, both paraphrased
from org-model/validated/variables.tf -- these flow straight into the OpenAPI schema FastAPI
serves at /spec, so keep them in sync with variables.tf's own comments when a field changes
there.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, create_model


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


_ENTITY_ID_DESCRIPTION = (
    "Entity ID -- the Terraform map key this entity is stored under, spliced in from context "
    "(Terraform's own data never carries `id` on the entity itself)."
)


def _with_id(record: type[_Strict]) -> type[_Strict]:
    name = record.__name__.removesuffix("Record")
    article = "An" if name[0] in "AEIOU" else "A"
    return create_model(
        name,
        __base__=record,
        __module__=__name__,
        __doc__=f"{article} {name} with its Entity ID spliced in.",
        id=(str, Field(description=_ENTITY_ID_DESCRIPTION)),
    )


class Reviewable(_Strict):
    """Review metadata attached to an entity, or to a nested item within one.

    Tracks who is accountable for keeping the data current and when it needs re-confirming.
    """

    expiration_date: str = Field(
        description="ISO-8601 date (YYYY-MM-DD) after which this data should be re-confirmed by its owner."
    )
    notes: str = Field(description="Free-text notes from the owner.")
    owner: str = Field(
        description="Entity ID into `people` -- who is accountable for keeping this data current."
    )


class Position(_Strict):
    """A formal job position held by a Person over time (nested in `people[*].positions`)."""

    type: str = Field(description="Entity ID into `formal_position_types`.")
    title: str = Field(
        description=(
            "Concrete title for this position, following the naming convention "
            '"<formal position title> (<primary specialization>) * <team title with primary '
            'role> @ <primary team> | <parent team> | <grandparent team>" -- a good-enough '
            "default, not enforced."
        )
    )
    start_date: str = Field(description="ISO-8601 date (YYYY-MM-DD) this position began.")
    end_date: str | None = Field(
        description="ISO-8601 date (YYYY-MM-DD) this position ended, or null if it's still current."
    )
    reviewable: Reviewable = Field(description="Review metadata for this position.")


class TeamMember(_Strict):
    """One row in a Team's `members` list: a person's membership and Role on that team.

    Distinct from `head`/`head_deputy`, which are the team's sole formal line-management
    channel.
    """

    person: str = Field(description="Entity ID into `people`.")
    role: str = Field(
        description=(
            "Entity ID into `roles` -- the area of responsibility this membership grants. "
            "Never leadership."
        )
    )
    title: str = Field(description="Display title for this person's membership on this team.")
    is_primary_team: bool = Field(
        description=(
            "Whether this is the person's single primary team. Every currently-active person "
            "must have exactly one primary team, globally, counted across this flag, "
            "Team.is_head_primary_team, and Team.is_head_deputy_primary_team."
        )
    )
    deputy: str | None = Field(
        description="Entity ID into `people` acting as backup for this specific row, or null if none."
    )
    is_interim: bool = Field(
        description="Whether this person's holding of this role is a temporary stand-in rather than a permanent appointment."
    )
    is_deputy_interim: bool | None = Field(
        description="Whether the deputy's holding of this role is a temporary stand-in. Must be set if and only if `deputy` is set."
    )


class FormalPositionTypeRecord(_Strict):
    """Job title/level definition -- what a Person's `positions[*].type` points to."""

    title: str = Field(
        description='Job title, e.g. "Software Engineer", "Engineering Manager". Illustrative, not a closed list.'
    )
    level: str = Field(
        description='Seniority level, e.g. "junior", "mid", "senior", "staff", "principal". Illustrative, not a closed list.'
    )
    description: str = Field(description="Human-readable description of this position type.")
    documentation_url: str = Field(
        description="Link to the personal profile or similar documenting this position type."
    )
    reviewable: Reviewable = Field(description="Review metadata for this position type.")


FormalPositionType = _with_id(FormalPositionTypeRecord)


class AuthorityLineTypeRecord(_Strict):
    """Category definition for functional/advisory leadership.

    What an AuthorityLine's `type` points to. Mirrors FormalPositionType.
    """

    title: str = Field(
        description='Category title, e.g. "Mentor", "Tech Lead", "Scrum Master". Illustrative, not a closed list.'
    )
    description: str = Field(description="Human-readable description of this category.")
    documentation_url: str = Field(description="Link to documentation for this category.")
    reviewable: Reviewable = Field(description="Review metadata for this category.")


AuthorityLineType = _with_id(AuthorityLineTypeRecord)


class TeamTypeRecord(_Strict):
    """Category definition for Team -- what a Team's `type` points to.

    Mirrors FormalPositionType/AuthorityLineType.
    """

    title: str = Field(
        description='Category title, e.g. "department", "squad", "guild". Illustrative, not a closed list.'
    )
    description: str = Field(description="Human-readable description of this category.")
    documentation_url: str = Field(description="Link to documentation for this category.")
    reviewable: Reviewable = Field(description="Review metadata for this category.")


TeamType = _with_id(TeamTypeRecord)


class ComponentTypeRecord(_Strict):
    """Category definition for Component -- what a Component's `type` points to.

    Mirrors FormalPositionType/AuthorityLineType/TeamType.
    """

    title: str = Field(
        description=(
            'Category title, e.g. "repository", "user interface", "service", "library", '
            '"database". Illustrative, not a closed list.'
        )
    )
    description: str = Field(description="Human-readable description of this category.")
    documentation_url: str = Field(description="Link to documentation for this category.")
    is_external: bool = Field(
        description=(
            "Whether this category is a 3rd-party dependency / external consumer, not "
            "org-owned."
        )
    )
    reviewable: Reviewable = Field(description="Review metadata for this category.")


ComponentType = _with_id(ComponentTypeRecord)


class PersonRecord(_Strict):
    """A person in the org.

    Has no `line_manager` field -- line management is derived from
    `teams[*].head`/`head_deputy`, not stored on Person.
    """

    name: str = Field(description="Full display name.")
    email: str = Field(description="Email address. Unique across all people.")
    primary_specialization: str = Field(
        description="This person's main area of expertise, e.g. \"Backend Engineering\"."
    )
    secondary_specializations: list[str] = Field(
        description="Other areas of expertise this person works in, if any."
    )
    external_references: dict[str, str] = Field(
        description='Namespaced identifiers in other systems, e.g. {"github_accountname": "someuser"}.'
    )
    documentation_url: str = Field(description="Link to the personal profile or similar.")
    positions: list[Position] = Field(
        description=(
            "Formal job positions this person has held over time. Never empty -- every person "
            "has at least one position, which is what makes \"departed\" well-defined (a "
            "position with a past `end_date` and no later one)."
        )
    )
    extensions: dict[str, dict[str, str]] = Field(
        description=(
            "Namespaced data owned by other systems (HR, Finance, Security, ...), keyed by "
            'domain name, e.g. extensions["hr"] = {"hiring_type": "internal"}. Each domain '
            "defines and documents its own expected shape independently of this schema."
        )
    )
    reviewable: Reviewable = Field(description="Review metadata for this person.")


Person = _with_id(PersonRecord)


class RoleRecord(_Strict):
    """Component/area-of-responsibility ownership within a team.

    Never leadership -- what a TeamMember's `role` points to.
    """

    name: str = Field(description="Display name for this role.")
    description: str = Field(description="Human-readable description of this role.")
    documentation_url: str = Field(description="Link to documentation for this role.")
    components: list[str] = Field(
        description="Entity IDs into `components` -- what this role is responsible for."
    )
    reviewable: Reviewable = Field(description="Review metadata for this role.")


Role = _with_id(RoleRecord)


class AuthorityLineRecord(_Strict):
    """Functional/advisory leadership held by a Person, e.g. mentorship or tech-lead duties.

    Never formal line-management -- that's `teams[*].head`/`head_deputy` instead.
    """

    person: str = Field(description="Entity ID into `people` -- who holds this authority line.")
    deputy: str | None = Field(
        description="Entity ID into `people` acting as backup, or null if none."
    )
    type: str = Field(description="Entity ID into `authority_line_types`.")
    start_date: str = Field(description="ISO-8601 date (YYYY-MM-DD) this authority line began.")
    end_date: str | None = Field(
        description="ISO-8601 date (YYYY-MM-DD) this authority line ended, or null if it's still current."
    )
    teams: list[str] = Field(
        description="Entity IDs into `teams` this authority line applies to; often length 1."
    )
    documentation_url: str = Field(description="Link to documentation for this authority line.")
    is_interim: bool = Field(
        description="Whether the person's holding of this authority line is a temporary stand-in rather than a permanent appointment."
    )
    is_deputy_interim: bool | None = Field(
        description="Whether the deputy's holding of this authority line is a temporary stand-in. Must be set if and only if `deputy` is set."
    )
    reviewable: Reviewable = Field(description="Review metadata for this authority line.")


AuthorityLine = _with_id(AuthorityLineRecord)


class TeamRecord(_Strict):
    """A team in the org hierarchy.

    `head`/`head_deputy` are its sole formal line-management channel, distinct from
    `members[*].role`.
    """

    name: str = Field(description="Display name.")
    type: str = Field(description="Entity ID into `team_types`.")
    description: str = Field(description="Human-readable description of this team.")
    documentation_url: str = Field(description="Link to documentation for this team.")
    contact_email: str = Field(description='Contact email address for this team, e.g. "platform-squad@example.com".')
    parent_team: str | None = Field(
        description=(
            "Entity ID into `teams` -- this team's parent in the org hierarchy, or null for "
            "the single root team."
        )
    )
    head: str = Field(
        description="Entity ID into `people` -- this team's formal leader (line management)."
    )
    head_title: str = Field(description="Display title for the head's leadership of this team.")
    head_deputy: str | None = Field(
        description="Entity ID into `people` acting as backup for the head, or null if none."
    )
    head_deputy_title: str | None = Field(
        description="Display title for the head_deputy's role, or null if there is no head_deputy."
    )
    is_head_primary_team: bool = Field(
        description=(
            "Whether this headship is the head's own primary-team signal. head does not need "
            "a mirrored `members` row -- this is how a headship declares primary-team-ness "
            "without one. Every currently-active person must have exactly one primary team, "
            "counted across this flag, is_head_deputy_primary_team, and members[*].is_primary_team."
        )
    )
    is_head_deputy_primary_team: bool | None = Field(
        description=(
            "Whether this headship is the head_deputy's own primary-team signal. Must be set "
            "if and only if head_deputy is set."
        )
    )
    is_head_interim: bool = Field(
        description="Whether the head's occupancy of this position is a temporary stand-in rather than a permanent appointment."
    )
    is_head_deputy_interim: bool | None = Field(
        description="Whether the head_deputy's occupancy of this position is a temporary stand-in. Must be set if and only if head_deputy is set."
    )
    external_references: dict[str, str] = Field(
        description='Namespaced identifiers in other systems, e.g. {"github_team_slug": "platform-squad"}.'
    )
    members: list[TeamMember] = Field(
        description=(
            "People on this team and the role(s) they hold. Distinct from `head`/`head_deputy`, "
            "which are the sole formal line-management channel."
        )
    )
    reviewable: Reviewable = Field(description="Review metadata for this team.")
    is_hierarchical: bool = Field(
        description="Whether this team is organized as a hierarchy of sub-teams rather than a flat group."
    )
    is_cross_functional: bool = Field(
        description="Whether this team draws members from multiple disciplines/specializations."
    )
    is_temporary: bool = Field(
        description="Whether this team exists for a limited-time initiative rather than on an ongoing basis."
    )


Team = _with_id(TeamRecord)


class ComponentRecord(_Strict):
    """A system component (service, repository, library, ...) owned by a team.

    No component may be orphaned -- every component must reference an existing team.
    """

    name: str = Field(description="Display name.")
    description: str = Field(description="Human-readable description of this component.")
    documentation_url: str = Field(description="Link to documentation for this component.")
    team: str = Field(description="Entity ID into `teams` -- who owns this component.")
    dependency_components: list[str] = Field(
        description=(
            "Entity IDs into `components` this component depends on. May contain cycles -- "
            "real systems legitimately have circular service dependencies."
        )
    )
    is_end_user_facing: bool = Field(
        description="Whether this component is directly used by end users, as opposed to internal-only."
    )
    type: str = Field(description="Entity ID into `component_types`.")
    external_references: dict[str, str] = Field(
        description='Namespaced identifiers in other systems, e.g. {"github_repo": "payments-service"}.'
    )
    reviewable: Reviewable = Field(description="Review metadata for this component.")


Component = _with_id(ComponentRecord)


class TeamPerson(_Strict):
    """One thing one person holds on one team.

    That is its headship, a Role, or an AuthorityLine over it -- either as the holder or as
    that holder's deputy. A person holding several things on the same team appears once per
    holding.
    """

    person: Person = Field(description="The person this holding belongs to.")
    kind: Literal["head", "role", "authority_line"] = Field(
        description=(
            "What is held: `head` (formal line management of the team), `role` (a Role from "
            "the team's `members`), or `authority_line` (functional/advisory authority over "
            "the team)."
        )
    )
    deputy_for: str | None = Field(
        description=(
            "Null when this person is the holder. When they are the holder's deputy instead, "
            "the Entity ID into `people` of the holder they back up."
        )
    )
    is_interim: bool = Field(
        description="Whether this holding is a temporary stand-in rather than a permanent appointment."
    )
    title: str | None = Field(
        default=None,
        description=(
            "Display title for this holding: the head's or head deputy's title, or a Role "
            "holder's membership title. Null for Role deputies and for AuthorityLines, which "
            "carry no title of their own."
        ),
    )
    role: str | None = Field(
        default=None, description="Entity ID into `roles`; set only when `kind` is `role`."
    )
    role_name: str | None = Field(
        default=None, description="Display name of `role`; set only when `kind` is `role`."
    )
    authority_line: str | None = Field(
        default=None,
        description="Entity ID into `authority_lines`; set only when `kind` is `authority_line`.",
    )
    authority_line_type: str | None = Field(
        default=None,
        description="Entity ID into `authority_line_types`; set only when `kind` is `authority_line`.",
    )
    authority_line_type_title: str | None = Field(
        default=None,
        description="Display title of `authority_line_type`; set only when `kind` is `authority_line`.",
    )


# Keys must match org-model/outputs.tf and OrgData's own attribute names.
ENTITY_MODELS: dict[str, tuple[type[_Strict], type[_Strict]]] = {
    "formal_position_types": (FormalPositionTypeRecord, FormalPositionType),
    "authority_line_types": (AuthorityLineTypeRecord, AuthorityLineType),
    "team_types": (TeamTypeRecord, TeamType),
    "component_types": (ComponentTypeRecord, ComponentType),
    "people": (PersonRecord, Person),
    "roles": (RoleRecord, Role),
    "teams": (TeamRecord, Team),
    "authority_lines": (AuthorityLineRecord, AuthorityLine),
    "components": (ComponentRecord, Component),
}
