"""FastAPI app exposing every org-as-code entity.

Routes: GET /{entity} (fetch-all, filterable by scalar attrs) and GET /{entity}/{id}
(fetch-by-id), plus GET /all and one join route, GET /teams/{team_id}/people. Data is loaded
once at startup (see `lifespan`) -- the org data lives in the same deployment as this service,
so it can't change without a redeploy, which is already the mechanism that exposes new data.
Optionally also serves orgviewer's built bundle under /ui (see `_mount_viewer`).
"""

import os
import re
import types
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi_mcp import FastApiMCP
from pydantic import BaseModel, ConfigDict, create_model

from .models import ENTITY_MODELS, TeamPerson
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.org_data = load_org_data(
        os.environ.get("DATA_DIR", "../../org-model"), os.environ.get("TERRAFORM_BIN", "terraform")
    )
    yield


def get_org_data(request: Request) -> OrgData:
    return request.app.state.org_data


def _entity(org_data: OrgData, entity_key: str, entity_id: str) -> BaseModel:
    _, response_model = ENTITY_MODELS[entity_key]
    return response_model(id=entity_id, **getattr(org_data, entity_key)[entity_id])


def _entities(org_data: OrgData, entity_key: str) -> list[BaseModel]:
    return [_entity(org_data, entity_key, entity_id) for entity_id in getattr(org_data, entity_key)]


def _singular(entity_key: str) -> str:
    _, response_model = ENTITY_MODELS[entity_key]
    return re.sub(r"(?<!^)(?=[A-Z])", "_", response_model.__name__).lower()


def _register_entity_routes(app: FastAPI, entity_key: str) -> None:
    record_model, response_model = ENTITY_MODELS[entity_key]
    filters_model = _build_filters_model(entity_key, record_model)

    async def list_entities(
        filters: Annotated[filters_model, Query()],
        org_data: Annotated[OrgData, Depends(get_org_data)],
    ):
        filter_items = filters.model_dump(exclude_none=True).items()
        return [
            entity
            for entity in _entities(org_data, entity_key)
            if all(getattr(entity, field) == value for field, value in filter_items)
        ]

    async def get_entity_by_id(
        entity_id: str,
        org_data: Annotated[OrgData, Depends(get_org_data)],
    ):
        if entity_id not in getattr(org_data, entity_key):
            raise HTTPException(status_code=404, detail=f"No {entity_key} entity with id {entity_id!r}")
        return _entity(org_data, entity_key, entity_id)

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
        summary=f"Get one {_singular(entity_key)} by its ID",
        description=f"Returns a single {entity_key} entity by its exact Entity ID.",
    )


router = APIRouter()

AllEntitiesResponse = create_model(
    "AllEntitiesResponse",
    __config__=ConfigDict(extra="forbid"),
    **{key: (list[ENTITY_MODELS[key][1]], ...) for key in ORG_DATA_OUTPUT_KEYS},
)


@router.get(
    "/all",
    response_model=AllEntitiesResponse,
    operation_id="get_all",
    summary="Get every entity of every type, unfiltered",
    description=(
        "Returns the entire org data model in one response: every entity of every type, "
        "id included, with no filtering. Use this for a full snapshot instead of calling "
        "each /{entity} route separately."
    ),
)
async def get_all(org_data: Annotated[OrgData, Depends(get_org_data)]):
    return AllEntitiesResponse(**{key: _entities(org_data, key) for key in ORG_DATA_OUTPUT_KEYS})


@router.get(
    "/teams/{team_id}/people",
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
        TeamPerson(**holding | {"person": _entity(org_data, "people", holding["person"])})
        for holding in resolve_team_people(org_data, team_id, today)
        if all(value is None or holding.get(field) == value for field, value in filters.items())
        and (is_deputy is None or (holding["deputy_for"] is not None) == is_deputy)
    ]


def _mount_viewer(app: FastAPI, viewer_dir: str) -> None:
    if not (Path(viewer_dir) / "index.html").is_file():
        raise RuntimeError(
            f"VIEWER_DIR={viewer_dir!r} has no index.html -- point it at orgviewer's build "
            "output, or unset it to run API-only"
        )
    app.mount("/ui", StaticFiles(directory=viewer_dir, html=True), name="viewer")


def create_app(viewer_dir: str | None = None) -> FastAPI:
    app = FastAPI(
        title="orgapi",
        description=(
            "Read-only HTTP API over the org-as-code data model, also exposed as an MCP "
            "server at /mcp for natural-language questions (e.g. 'who leads Team X', "
            "'which components does Team Y own'). No auth."
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
    app.include_router(router)
    if viewer_dir is not None:
        _mount_viewer(app, viewer_dir)
    return app


def create_mcp_server(app: FastAPI) -> FastApiMCP:
    """Mount one MCP tool per REST route, generated from `app`'s own OpenAPI schema.

    Call it after all routes are registered: tool generation reads the route table at
    construction time.
    """
    server = FastApiMCP(app)
    server.mount_http()
    return server


app = create_app(os.environ.get("VIEWER_DIR") or None)
fastapi_mcp = create_mcp_server(app)
