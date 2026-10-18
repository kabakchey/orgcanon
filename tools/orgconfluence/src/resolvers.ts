import { fetch } from "@forge/api";
import Resolver from "@forge/resolver";
import { parseEntityConfig } from "./entity/config";
import { entityOptions } from "./entity/options";
import { resolveEntity } from "./entity/resolve";
import type { EntityOption, EntityView } from "./entity/types";
import { createOrgApi, ENTITY_TYPES, type OrgApi, type Team } from "./orgapi/client";
import { parseConfig } from "./position/config";
import { positionsOf } from "./position/positions";
import { resolvePosition } from "./position/resolve";
import type { Position, PositionView } from "./position/types";

function orgApi(): OrgApi {
  return createOrgApi({ baseUrl: process.env.ORGAPI_URL, headers: process.env.ORGAPI_HEADERS }, fetch);
}

// UTC, matching the "today" orgapi applies to authority lines.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const resolver = new Resolver();

resolver.define<Team[]>("listTeams", () => orgApi().listTeams());

resolver.define<{ team: string }, Position[]>("listPositions", async ({ payload }) =>
  positionsOf((await orgApi().teamPeople(payload.team)) ?? [])
);

resolver.define<unknown, PositionView | null>("resolvePosition", async ({ payload }) => {
  const config = parseConfig(payload);
  return config && resolvePosition(orgApi(), process.env.ORGVIEWER_URL, config);
});

resolver.define<{ type: string }, EntityOption[]>("listEntityOptions", async ({ payload }) => {
  const type = ENTITY_TYPES.find((candidate) => candidate === payload.type);
  return type ? entityOptions(orgApi(), type, today()) : [];
});

resolver.define<unknown, EntityView | null>("resolveEntity", async ({ payload }) => {
  const config = parseEntityConfig(payload);
  return config && resolveEntity(orgApi(), process.env.ORGVIEWER_URL, config, today());
});

export const handler = resolver.getDefinitions();
