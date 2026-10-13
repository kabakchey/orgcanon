import { fetchEntities, fetchEntityById, type EntityFilters } from "./client";
import type { OrgData } from "./types";

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: unknown[], load: () => Promise<T>): Promise<T> {
  const cacheKey = JSON.stringify(key);
  let entry = cache.get(cacheKey);
  if (!entry) {
    entry = load();
    cache.set(cacheKey, entry);
  }
  return entry as Promise<T>;
}

export function getCachedEntities<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  filters?: EntityFilters
): Promise<OrgData[K]> {
  return cached(["all", entityKey, baseUrl, filters ?? {}], () => fetchEntities(entityKey, baseUrl, filters));
}

export function getCachedEntityById<K extends keyof OrgData>(
  entityKey: K,
  baseUrl: string,
  id: string
): Promise<OrgData[K][string] | undefined> {
  return cached(["one", entityKey, baseUrl, id], () => fetchEntityById(entityKey, baseUrl, id));
}

// orgapi's data is immutable for a running instance's lifetime (see orgapi's own README), so
// entries never expire on their own -- this only needs calling when the user points the app at a
// *different* orgapi instance (base-url change), whose data the cache has no way to know is
// unrelated to what's already cached.
export function clearEntityCache(): void {
  cache.clear();
}
