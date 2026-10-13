import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useUpdateSearchParams(replace = false): (changes: Record<string, string>) => void {
  const [, setSearchParams] = useSearchParams();
  return useCallback(
    (changes) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [name, value] of Object.entries(changes)) next.set(name, value);
          return next;
        },
        { replace }
      );
    },
    [setSearchParams, replace]
  );
}
