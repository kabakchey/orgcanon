"""FastAPI app exposing every org-as-code entity: GET /{entity} (fetch-all, filterable by
scalar attrs) and GET /{entity}/{id} (fetch-by-id), plus GET /all (see `_register_all_route`)
and one hand-written join route, GET /teams/{team_id}/people (see `_register_team_people_route`).
Data is loaded once at startup (see `lifespan` below) -- the org data lives in the same
deployment as this service, so it can't change without a redeploy, which is already the
mechanism that exposes new data.
"""

import os
import types
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel, ConfigDict, create_model

from .models import ENTITY_MODELS, Person, TeamPerson
from .org_data import ORG_DATA_OUTPUT_KEYS, OrgData, load_org_data
from .team_people import resolve_team_people

_SCALAR_TYPES = (str, bool)


def _is_filterable(annotation: Any) -> bool:
    if annotation in _SCALAR_TYPES:
        return True
    if isinstance(annotation, types.UnionType):
        non_none = [a for a in annotation.__args__ if a is not type(None)]
        return len(non_none) == 1 and non_none[0] in _SCALAR_TYPES
    return False


def _build_filters_model(entity_key: str, record_model: type[BaseModel]) -> type[BaseModel]:
    fields: dict[str, Any] = {
        name: (field.annotation | None, None)
        for name, field in record_model.model_fields.items()
        if _is_filterable(field.annotation)
    }
    return create_model(f"{entity_key}_filters", __config__=ConfigDict(extra="forbid"), **fields)


def _default_data_dir() -> str:
    return os.environ.get("DATA_DIR", "../../org-model")


def _default_terraform_bin() -> str:
    return os.environ.get("TERRAFORM_BIN", "terraform")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.org_data = load_org_data(_default_data_dir(), _default_terraform_bin())
    yield


def get_org_data(request: Request) -> OrgData:
    return request.app.state.org_data


def _register_entity_routes(app: FastAPI, entity_key: str) -> None:
    record_model, response_model = ENTITY_MODELS[entity_key]
    filters_model = _build_filters_model(entity_key, record_model)

    async def list_entities(
        filters: Annotated[filters_model, Query()],
        org_data: Annotated[OrgData, Depends(get_org_data)],
    ) -> list[response_model]:  # type: ignore[valid-type]
        raw = getattr(org_data, entity_key)
        filter_items = filters.model_dump(exclude_none=True).items()
        return [
            response_model(id=entity_id, **entity)
            for entity_id, entity in raw.items()
            if all(entity.get(field) == value for field, value in filter_items)
        ]

    async def get_entity_by_id(
        entity_id: str,
        org_data: Annotated[OrgData, Depends(get_org_data)],
    ) -> response_model:  # type: ignore[valid-type]
        raw = getattr(org_data, entity_key)
        entity = raw.get(entity_id)
        if entity is None:
            raise HTTPException(status_code=404, detail=f"No {entity_key} entity with id {entity_id!r}")
        return response_model(id=entity_id, **entity)

    app.add_api_route(
        f"/{entity_key}",
        list_entities,
        methods=["GET"],
        response_model=list[response_model],
        operation_id=f"list_{entity_key}",
        summary=f"List all {entity_key}, optionally filtered",
        description=(
            f"Returns every {entity_key} entity, or a filtered subset when query "
            f"parameters matching {entity_key}'s plain fields are given "
            f"(e.g. `?type=squad` on teams, `?team=platform` on components). "
            f"Use this to answer questions like 'which {entity_key} does X own' or "
            f"'list all {entity_key} of type Y'."
        ),
    )
    app.add_api_route(
        f"/{entity_key}/{{entity_id}}",
        get_entity_by_id,
        methods=["GET"],
        response_model=response_model,
        operation_id=f"get_{entity_key}_by_id",
        summary=f"Get one {entity_key[:-1] if entity_key.endswith('s') else entity_key} by its ID",
        description=f"Returns a single {entity_key} entity by its exact Entity ID.",
    )


def _register_all_route(app: FastAPI) -> None:
    """GET /all -- every entity of every type, id included, with no filtering: one JSON object
    keyed by entity type (matching ORG_DATA_OUTPUT_KEYS), each value the same unfiltered array
    `GET /{entity}` returns. Convenience for callers who want one full snapshot instead of
    calling every /{entity} route separately."""
    response_models = {key: ENTITY_MODELS[key][1] for key in ORG_DATA_OUTPUT_KEYS}
    all_response_model = create_model(
        "AllEntitiesResponse",
        __config__=ConfigDict(extra="forbid"),
        **{key: (list[model], ...) for key, model in response_models.items()},
    )

    async def get_all(
        org_data: Annotated[OrgData, Depends(get_org_data)],
    ) -> all_response_model:  # type: ignore[valid-type]
        return all_response_model(
            **{
                key: [
                    response_models[key](id=entity_id, **entity)
                    for entity_id, entity in getattr(org_data, key).items()
                ]
                for key in ORG_DATA_OUTPUT_KEYS
            }
        )

    app.add_api_route(
        "/all",
        get_all,
        methods=["GET"],
        response_model=all_response_model,
        operation_id="get_all",
        summary="Get every entity of every type, unfiltered",
        description=(
            "Returns the entire org data model in one response: every entity of every type, "
            "id included, with no filtering. Use this for a full snapshot instead of calling "
            "each /{entity} route separately."
        ),
    )


def _register_team_people_route(app: FastAPI) -> None:
    """GET /teams/{team_id}/people -- every holding on one team (see `team_people`), narrowed
    by optional query params that combine with AND, like the entity list routes' filters."""

    async def get_team_people(
        team_id: str,
        org_data: Annotated[OrgData, Depends(get_org_data)],
        kind: Literal["head", "role", "authority_line"] | None = None,
        role: str | None = None,
        authority_line_type: str | None = None,
        is_deputy: bool | None = None,
    ) -> list[TeamPerson]:
        if team_id not in org_data.teams:
            raise HTTPException(status_code=404, detail=f"No teams entity with id {team_id!r}")

        # UTC, matching the `timestamp()`-based "today" org-model's own date validations use.
        today = datetime.now(timezone.utc).date().isoformat()
        filters = {"kind": kind, "role": role, "authority_line_type": authority_line_type}
        return [
            TeamPerson(
                **holding
                | {"person": Person(id=holding["person"], **org_data.people[holding["person"]])}
            )
            for holding in resolve_team_people(org_data, team_id, today)
            if all(value is None or holding.get(field) == value for field, value in filters.items())
            and (is_deputy is None or (holding["deputy_for"] is not None) == is_deputy)
        ]

    app.add_api_route(
        "/teams/{team_id}/people",
        get_team_people,
        methods=["GET"],
        response_model=list[TeamPerson],
        operation_id="get_team_people",
        summary="Find who holds what on a specific team: head, Roles, AuthorityLines, and deputies",
        description=(
            "Given a team_id, returns one entry per thing a person holds on that team: its "
            "head, every Role in its members, and every currently active AuthorityLine over "
            "it -- each followed by its deputy, if any (`deputy_for` names the holder a deputy "
            "backs up; it is null on the holder's own entry). With no query params, returns "
            "everything. Narrow with `kind=head|role|authority_line`, `role=<role-id>`, "
            "`authority_line_type=<type-id>`, and `is_deputy=true|false`; params combine with "
            "AND, so ask for one thing per call. Use this to answer questions like 'who leads "
            "Team X' (`kind=head&is_deputy=false`), 'who is the platform-owner on the platform "
            "squad and who covers for them' (`role=platform-owner`), or 'who is Team X's tech "
            "lead' (`authority_line_type=tech-lead`). Nothing cascades from parent teams."
        ),
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title="orgapi",
        description=(
            "Read-only HTTP API over the org-as-code data model, also exposed as an MCP "
            "server at /mcp for natural-language questions (e.g. 'who leads Team X', "
            "'which components does Team Y own'). No UI, no auth."
        ),
        lifespan=lifespan,
        openapi_url="/spec",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET"],
    )
    for entity_key in ORG_DATA_OUTPUT_KEYS:
        _register_entity_routes(app, entity_key)
    _register_all_route(app)
    _register_team_people_route(app)
    return app


def create_mcp_server(app: FastAPI) -> FastApiMCP:
    """One MCP tool per REST route, generated from `app`'s own OpenAPI schema -- built after
    all entity routes are registered, since tool generation reads the route table at
    construction time."""
    server = FastApiMCP(app)
    server.mount_http()
    return server


app = create_app()
fastapi_mcp = create_mcp_server(app)
