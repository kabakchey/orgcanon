import { useEffect, useState } from "react";
import { call } from "./call";

/** Asks the backend to resolve a stored macro config; `fallback` covers a backend that cannot be reached. */
export function useResolved<Config extends Record<string, unknown>, View>(
  resolverKey: string,
  config: Config,
  fallback: (config: Config) => View
): View | null {
  const [view, setView] = useState<View | null>(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    let current = true;
    const requested: Config = JSON.parse(configKey);
    call<View | null>(resolverKey, requested)
      .then((resolved) => resolved ?? fallback(requested))
      .catch(() => fallback(requested))
      .then((resolved) => {
        if (current) setView(resolved);
      });
    return () => {
      current = false;
    };
    // `fallback` is a module-level function at every call site, so it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolverKey, configKey]);

  return view;
}
