import { useCallback, useEffect, useState } from "react";
import {
  clearLayoutOverride,
  readLayoutOverride,
  writeLayoutOverride,
  type StoredLayout,
} from "./layout-override";

interface UseLayoutOverrideResult {
  // null means "no manual arrangement yet -- use the auto (ELK) layout for this graph".
  override: StoredLayout | null;
  save: (layout: StoredLayout) => void;
  reset: () => void;
}

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
