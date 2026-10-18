export type PositionKind = "head" | "role" | "authority_line";

/** `id` is a Role id or an AuthorityLine type id; empty for the head, which a team has one of. */
export type PositionRef = { kind: PositionKind; id: string };

export type Holding = {
  person: { id: string; name: string; external_references?: Record<string, string> };
  kind: PositionKind;
  deputy_for: string | null;
  is_interim: boolean;
  title: string | null;
  role: string | null;
  role_name: string | null;
  authority_line: string | null;
  authority_line_type: string | null;
  authority_line_type_title: string | null;
};

export type Team = { id: string; name: string };

export const ENTITY_TYPES = [
  "people",
  "teams",
  "roles",
  "components",
  "authority_lines",
  "authority_line_types",
  "team_types",
  "component_types",
  "formal_position_types",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export type EntityRecord = { id: string } & Record<string, unknown>;

/** Null when the person's `external_references` has no usable `atlassian_account_id`. */
export function atlassianAccountId(person: object): string | null {
  const references = ((person as EntityRecord).external_references ?? {}) as Record<string, unknown>;
  const accountId = references.atlassian_account_id;
  return typeof accountId === "string" && accountId.trim() ? accountId.trim() : null;
}

export type Fetch = (
  url: string,
  init: { headers: Record<string, string> }
) => Promise<{ status: number; ok: boolean; json(): Promise<unknown> }>;

/** `headers` is ORGAPI_HEADERS as set: a JSON object of request headers, sent on every request. */
export type OrgApiSettings = { baseUrl?: string; headers?: string };

export class OrgApiError extends Error {}

export type OrgApi = {
  listTeams(): Promise<Team[]>;
  /** Null when the team does not exist. Without `position`, everything held on the team. */
  teamPeople(team: string, position?: PositionRef): Promise<Holding[] | null>;
  /** Null when the Role or AuthorityLine type does not exist. */
  positionName(position: PositionRef): Promise<string | null>;
  listEntities(type: EntityType): Promise<EntityRecord[]>;
  /** Null when no entity of that type has that id. */
  getEntity(type: EntityType, id: string): Promise<EntityRecord | null>;
};

function positionFilters(position: PositionRef): Record<string, string> {
  if (position.kind === "role") return { kind: position.kind, role: position.id };
  if (position.kind === "authority_line") return { kind: position.kind, authority_line_type: position.id };
  return { kind: position.kind };
}

// The parse error is dropped: its message can quote the value, which holds credentials.
function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  let headers: unknown;
  try {
    headers = JSON.parse(raw);
  } catch {
    headers = null;
  }
  const isStringMap =
    typeof headers === "object" &&
    headers !== null &&
    !Array.isArray(headers) &&
    Object.values(headers).every((value) => typeof value === "string");
  if (!isStringMap) throw new OrgApiError("ORGAPI_HEADERS is not a JSON object of strings");
  return headers as Record<string, string>;
}

export function createOrgApi(settings: OrgApiSettings, fetch: Fetch): OrgApi {
  async function get(path: string): Promise<unknown | null> {
    if (!settings.baseUrl) throw new OrgApiError("ORGAPI_URL is not set");
    const headers = parseHeaders(settings.headers);
    const url = `${settings.baseUrl.replace(/\/+$/, "")}${path}`;
    let response;
    try {
      response = await fetch(url, { headers });
    } catch (cause) {
      throw new OrgApiError(`orgapi request failed: ${String(cause)}`);
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new OrgApiError(`orgapi responded ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new OrgApiError("orgapi responded with something other than JSON, such as a proxy's login page");
    }
  }

  return {
    async listTeams() {
      const teams = ((await get("/teams")) ?? []) as Team[];
      return teams.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    },

    async teamPeople(team, position) {
      const query = position ? `?${new URLSearchParams(positionFilters(position))}` : "";
      return (await get(`/teams/${encodeURIComponent(team)}/people${query}`)) as Holding[] | null;
    },

    async positionName(position) {
      const id = encodeURIComponent(position.id);
      if (position.kind === "role") {
        return ((await get(`/roles/${id}`)) as { name: string } | null)?.name ?? null;
      }
      return ((await get(`/authority_line_types/${id}`)) as { title: string } | null)?.title ?? null;
    },

    async listEntities(type) {
      return ((await get(`/${type}`)) ?? []) as EntityRecord[];
    },

    async getEntity(type, id) {
      return (await get(`/${type}/${encodeURIComponent(id)}`)) as EntityRecord | null;
    },
  };
}
