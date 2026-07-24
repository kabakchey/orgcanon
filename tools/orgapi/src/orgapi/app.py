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
from typing import Annotated, Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel, ConfigDict, create_model

from .models import ENTITY_MODELS
from .org_data import ORG_DATA_OUTPUT_KEYS, OrgData, load_org_data

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
    """GET /teams/{team_id}/people?role=... or ?position=head|head_deputy -- resolves the
    person(s) holding a given responsibility within one team. `role` looks up TeamMember.role
    entries in team.members (0-many, e.g. two people can share a Role); `position` looks up
    the team's own head/head_deputy scalar fields (see CONTEXT.md's "Line management"). Always
    returns a list, even for position lookups, so callers don't need to branch on which query
    param they used."""
    _, person_response_model = ENTITY_MODELS["people"]

    async def get_team_people(
        team_id: str,
        org_data: Annotated[OrgData, Depends(get_org_data)],
        role: str | None = None,
        position: Literal["head", "head_deputy"] | None = None,
    ) -> list[person_response_model]:  # type: ignore[valid-type]
        if (role is None) == (position is None):
            raise HTTPException(
                status_code=400,
                detail="Exactly one of `role` or `position` query params is required.",
            )

        team = org_data.teams.get(team_id)
        if team is None:
            raise HTTPException(status_code=404, detail=f"No teams entity with id {team_id!r}")

        if position is not None:
            person_ids = [team[position]] if team[position] is not None else []
        else:
            person_ids = [member["person"] for member in team["members"] if member["role"] == role]

        return [
            person_response_model(id=person_id, **org_data.people[person_id])
            for person_id in person_ids
        ]

    app.add_api_route(
        "/teams/{team_id}/people",
        get_team_people,
        methods=["GET"],
        response_model=list[person_response_model],
        operation_id="get_team_people_by_position",
        summary="Find who holds a role, or who leads, a specific team",
        description=(
            "Given a team_id, returns the person/people matching either `?role=<role-id>` "
            "(who holds that Role on this team) or `?position=head|head_deputy` (who formally "
            "leads this team). Use this to answer questions like 'who leads Team X' or "
            "'who is the platform-owner on the platform squad'."
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
