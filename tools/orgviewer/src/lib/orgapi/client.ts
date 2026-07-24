import type { OrgData } from "./types";

export type EntityFilters = Record<string, string | boolean>;

export async function fetchEntities<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  filters?: EntityFilters
): Promise<OrgData[K]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters ?? {})) {
    params.set(key, String(value));
  }
  const query = params.toString();
  const url = `${baseUrl}/${entityKey}${query ? `?${query}` : ""}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`orgapi request failed: GET ${url} -> ${response.status}`);
  }

  const items = (await response.json()) as Array<{ id: string } & Record<string, unknown>>;
  const result: Record<string, unknown> = {};
  for (const { id, ...rest } of items) {
    result[id] = rest;
  }
  return result as OrgData[K];
}

// Exact lookup via orgapi's GET /{entity}/{id} -- distinct from fetchEntities' collection+filter
// endpoint, since `id` isn't a Record field orgapi's generic filters can match on (see orgapi's
// _build_filters_model). Returns undefined on 404 rather than throwing, since "no entity with
// this id" is an expected outcome here, not a failure.
export async function fetchEntityById<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  id: string
): Promise<OrgData[K][string] | undefined> {
  const url = `${baseUrl}/${entityKey}/${encodeURIComponent(id)}`;

  const response = await fetch(url);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`orgapi request failed: GET ${url} -> ${response.status}`);
  }

  const body = (await response.json()) as { id: string } & Record<string, unknown>;
  const rest: Record<string, unknown> = { ...body };
  delete rest.id;
  return rest as unknown as OrgData[K][string];
}
