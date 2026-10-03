import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// setSearchParams' updater gets the URL as of the last render, not earlier queued writes, so
// sibling hooks writing defaults in one commit would overwrite each other; accumulate them here.
let pending: URLSearchParams | null = null;

// Writes value when paramName is absent from the URL, replacing the current history entry so Back
// doesn't land on the same view without it.
export function useDefaultParam(paramName: string, value: string | undefined): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const missing = !searchParams.has(paramName);

  useEffect(() => {
    if (!missing || value === undefined) return;
    if (!pending) {
      pending = new URLSearchParams(searchParams);
      queueMicrotask(() => {
        pending = null;
      });
    }
    pending.set(paramName, value);
    setSearchParams(new URLSearchParams(pending), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, paramName, value]);
}
