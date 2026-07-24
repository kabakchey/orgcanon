import { useEffect, useState } from "react";
import type { EntityFilters } from "./client";
import { getCachedEntities, getCachedEntityById } from "./cache";
import { getOrgapiBaseUrl } from "./config";
import type { OrgData } from "./types";

export interface UseEntitiesResult<K extends keyof OrgData> {
  data: OrgData[K] | undefined;
  error: unknown;
}

export interface UseEntitiesOptions {
  // Skip fetching entirely, e.g. team-components-view has nothing to fetch until a team is
  // picked -- there's no "all components for no team" query to make.
  enabled?: boolean;
}

export function useEntities<K extends keyof OrgData>(
  entityKey: K,
  filters?: EntityFilters,
  options?: UseEntitiesOptions
): UseEntitiesResult<K> {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<OrgData[K] | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const filtersKey = JSON.stringify(filters ?? {});

  useEffect(() => {
    setData(undefined);
    setError(undefined);
    if (!enabled) return;

    let cancelled = false;
    getCachedEntities(entityKey, getOrgapiBaseUrl(), filters).then(
      (result) => {
        if (!cancelled) setData(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(err);
      }
    );
    return () => {
      cancelled = true;
    };
    // filters is intentionally tracked via filtersKey (a stable string), not the object
    // reference, since views construct a fresh filters object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey, filtersKey, enabled]);

  return { data, error };
}

export interface UseEntityByIdResult<K extends keyof OrgData> {
  data: OrgData[K][string] | undefined;
  notFound: boolean;
  error: unknown;
}

export function useEntityById<K extends keyof OrgData>(
  entityKey: K,
  id: string | undefined
): UseEntityByIdResult<K> {
  const [data, setData] = useState<OrgData[K][string] | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  useEffect(() => {
    setData(undefined);
    setNotFound(false);
    setError(undefined);
    if (!id) return;

    let cancelled = false;
    getCachedEntityById(entityKey, getOrgapiBaseUrl(), id).then(
      (result) => {
        if (cancelled) return;
        if (result === undefined) {
          setNotFound(true);
        } else {
          setData(result);
        }
      },
      (err: unknown) => {
        if (!cancelled) setError(err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [entityKey, id]);

  return { data, notFound, error };
}
