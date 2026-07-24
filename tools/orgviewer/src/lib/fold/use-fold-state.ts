import { useCallback, useEffect, useState } from "react";

function storageKeyFor(key: string): string {
  return `orgviewer-fold:${key}`;
}

// null means "nothing stored yet" (as opposed to a stored, possibly-empty set), so callers can
// tell a fresh visit apart from a user who explicitly expanded everything.
function readFoldedIds(key: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(key));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === "string"))
      : null;
  } catch {
    return null;
  }
}

function writeFoldedIds(key: string, ids: Set<string>): void {
  localStorage.setItem(storageKeyFor(key), JSON.stringify([...ids]));
}

export interface UseFoldStateResult {
  foldedIds: Set<string>;
  isFolded: (nodeId: string) => boolean;
  toggleFold: (nodeId: string) => void;
}

// A stored set only counts as a real preference for the CURRENT graph if it's empty (0 folds is
// valid for any graph) or shares at least one id with it. A storageKey can outlive the graph it
// was recorded against -- org-tree-view.tsx's key is a constant "org-tree" regardless of dataset,
// and chain-of-command-view.tsx's key is reused if a person's downward org gets restructured --
// so a stored set can end up entirely foreign ids that applyFold's own validFolded filter then
// drops to nothing, silently "unfolding" a graph that never got a chance to apply its default.
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

// `defaultFoldedIds`, when given, seeds the folded set the first time a storageKey is ever seen
// (no stored value yet) -- e.g. chain-of-command-view.tsx uses this so a person's downward
// subordinate tree starts collapsed instead of dumping the whole org onto the screen. Once the
// user has toggled anything under that key, their stored state always wins over the default --
// unless `relevantIds` (the current graph's own node ids, see graph-canvas.tsx) shows the stored
// set is stale leftover from a different graph under the same key, in which case it's treated the
// same as "nothing stored yet" so the default can re-apply. See isRelevantTo above.
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

  const isFolded = useCallback((nodeId: string) => foldedIds.has(nodeId), [foldedIds]);

  return { foldedIds, isFolded, toggleFold };
}
