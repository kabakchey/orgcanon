import { useCallback, useEffect, useState } from "react";
import { readStoredJson, writeStoredJson } from "../storage";

function storageKeyFor(key: string): string {
  return `orgviewer-fold:${key}`;
}

// null means "nothing stored yet" (as opposed to a stored, possibly-empty set), so callers can
// tell a fresh visit apart from a user who explicitly expanded everything.
function readFoldedIds(key: string): Set<string> | null {
  const stored = readStoredJson(storageKeyFor(key));
  return Array.isArray(stored) ? new Set(stored.filter((id): id is string => typeof id === "string")) : null;
}

function writeFoldedIds(key: string, ids: Set<string>): void {
  writeStoredJson(storageKeyFor(key), [...ids]);
}

interface UseFoldStateResult {
  foldedIds: Set<string>;
  isFolded: (nodeId: string) => boolean;
  toggleFold: (nodeId: string) => void;
  setFolded: (nodeIds: Set<string>) => void;
}

// A stored set only counts as a real preference for the CURRENT graph if it's empty (0 folds is
// valid for any graph) or shares at least one id with it. A storageKey can outlive the graph it
// was recorded against -- Org Tree's key is the same for every dataset, and a per-person key is
// reused after that person's org is restructured -- so a stored set can hold only foreign ids,
// which applyFold drops, silently "unfolding" a graph that never got to apply its default.
function isRelevantTo(storedIds: Set<string>, relevantIds: Set<string> | undefined): boolean {
  if (!relevantIds || storedIds.size === 0) return true;
  for (const id of storedIds) {
    if (relevantIds.has(id)) return true;
  }
  return false;
}

function resolveFoldedIds(
  storageKey: string,
  defaultFoldedIds: Set<string> | undefined,
  relevantIds: Set<string> | undefined
): Set<string> {
  const stored = readFoldedIds(storageKey);
  if (stored && isRelevantTo(stored, relevantIds)) return stored;
  return defaultFoldedIds ?? new Set();
}

// `defaultFoldedIds` seeds the folded set the first time a storageKey is seen. After that the
// stored state wins, unless `relevantIds` (the current graph's node ids) shows it is a leftover
// from a different graph under the same key.
export function useFoldState(
  storageKey: string,
  defaultFoldedIds?: Set<string>,
  relevantIds?: Set<string>
): UseFoldStateResult {
  const [foldedIds, setFoldedIds] = useState<Set<string>>(() =>
    resolveFoldedIds(storageKey, defaultFoldedIds, relevantIds)
  );

  useEffect(() => {
    setFoldedIds(resolveFoldedIds(storageKey, defaultFoldedIds, relevantIds));
    // Only storageKey should re-trigger this -- defaultFoldedIds/relevantIds are recomputed fresh
    // from the current graph on every render and would otherwise re-seed the default on every
    // change, clobbering the user's own toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggleFold = useCallback(
    (nodeId: string) => {
      setFoldedIds((current) => {
        const next = new Set(current);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        writeFoldedIds(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const setFolded = useCallback(
    (nodeIds: Set<string>) => {
      const next = new Set(nodeIds);
      writeFoldedIds(storageKey, next);
      setFoldedIds(next);
    },
    [storageKey]
  );

  const isFolded = useCallback((nodeId: string) => foldedIds.has(nodeId), [foldedIds]);

  return { foldedIds, isFolded, toggleFold, setFolded };
}
