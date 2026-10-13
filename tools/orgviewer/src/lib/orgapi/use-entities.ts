import { useEffect, useState } from "react";
import type { EntityFilters } from "./client";
import { getCachedEntities, getCachedEntityById } from "./cache";
import { getOrgapiBaseUrl } from "./config";
import type { OrgData } from "./types";

interface Loaded<T> {
  data: T | undefined;
  error: unknown;
  settled: boolean;
}

const LOADING = { data: undefined, error: undefined, settled: false };

// Re-runs `load` whenever `key` changes; callers build a fresh `load` on every render.
function useLoaded<T>(key: string, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>(LOADING);

  useEffect(() => {
    setState(LOADING);
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: undefined, settled: true });
      },
      (error: unknown) => {
        if (!cancelled) setState({ data: undefined, error, settled: true });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export function useEntities<K extends keyof OrgData>(
  entityKey: K,
  filters?: EntityFilters
): { data: OrgData[K] | undefined; error: unknown } {
  return useLoaded(JSON.stringify([entityKey, filters ?? {}]), () =>
    getCachedEntities(entityKey, getOrgapiBaseUrl(), filters)
  );
}

// Several whole collections as one unit: `data` stays undefined until every one has loaded.
export function useOrgData<K extends keyof OrgData>(
  keys: readonly K[]
): { data: Pick<OrgData, K> | undefined; error: unknown } {
  return useLoaded(keys.join(","), async () => {
    const collections = await Promise.all(keys.map((key) => getCachedEntities(key, getOrgapiBaseUrl())));
    return Object.fromEntries(keys.map((key, index) => [key, collections[index]])) as unknown as Pick<OrgData, K>;
  });
}

export function useEntityById<K extends keyof OrgData>(
  entityKey: K,
  id: string
): { data: OrgData[K][string] | undefined; notFound: boolean; error: unknown } {
  const { data, error, settled } = useLoaded(JSON.stringify([entityKey, id]), () =>
    getCachedEntityById(entityKey, getOrgapiBaseUrl(), id)
  );
  return { data, error, notFound: settled && !error && data === undefined };
}
