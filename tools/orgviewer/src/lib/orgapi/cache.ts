import { fetchEntities, fetchEntityById, type EntityFilters } from "./client";
import type { OrgData } from "./types";

const cache = new Map<string, Promise<unknown>>();
const byIdCache = new Map<string, Promise<unknown>>();

function cacheKey<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  filters?: EntityFilters
): string {
  return JSON.stringify([entityKey, baseUrl, filters ?? {}]);
}

export function getCachedEntities<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  filters?: EntityFilters
): Promise<OrgData[K]> {
  const key = cacheKey(entityKey, baseUrl, filters);
  let entry = cache.get(key);
  if (!entry) {
    entry = fetchEntities(entityKey, baseUrl, filters);
    cache.set(key, entry);
  }
  return entry as Promise<OrgData[K]>;
}

export function getCachedEntityById<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  id: string
): Promise<OrgData[K][string] | undefined> {
  const key = JSON.stringify([entityKey, baseUrl, id]);
  let entry = byIdCache.get(key);
  if (!entry) {
    entry = fetchEntityById(entityKey, baseUrl, id);
    byIdCache.set(key, entry);
  }
  return entry as Promise<OrgData[K][string] | undefined>;
}

// orgapi's data is immutable for a running instance's lifetime (see orgapi's own README), so
// entries never expire on their own -- this only needs calling when the user points the app at a
// *different* orgapi instance (base-url change), whose data the cache has no way to know is
// unrelated to what's already cached.
export function clearEntityCache(): void {
  cache.clear();
  byIdCache.clear();
}
