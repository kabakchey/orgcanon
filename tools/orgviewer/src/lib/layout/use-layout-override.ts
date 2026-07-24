import { useCallback, useEffect, useState } from "react";
import {
  clearLayoutOverride,
  readLayoutOverride,
  writeLayoutOverride,
  type StoredLayout,
} from "./layout-override";

export interface UseLayoutOverrideResult {
  // null means "no manual arrangement yet -- use the auto (ELK) layout for this graph".
  override: StoredLayout | null;
  save: (layout: StoredLayout) => void;
  reset: () => void;
}

// Mirrors use-fold-state.ts's storage-key scoping (one entry per graph instance -- the same
// storageKey a view already passes for fold state), but for manually-dragged node positions and
// edge routes instead of collapsed subtrees.
export function useLayoutOverride(storageKey: string): UseLayoutOverrideResult {
  const [override, setOverride] = useState<StoredLayout | null>(() => readLayoutOverride(storageKey));

  useEffect(() => {
    setOverride(readLayoutOverride(storageKey));
  }, [storageKey]);

  const save = useCallback(
    (layout: StoredLayout) => {
      writeLayoutOverride(storageKey, layout);
      // Read back rather than trusting `layout` verbatim, so the in-memory value always matches
      // what storage actually holds (e.g. a route trimmed back down to 2 points on the way in).
      setOverride(readLayoutOverride(storageKey));
    },
    [storageKey]
  );

  const reset = useCallback(() => {
    clearLayoutOverride(storageKey);
    setOverride(null);
  }, [storageKey]);

  return { override, save, reset };
}
