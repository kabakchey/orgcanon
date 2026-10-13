import { useSearchParams } from "react-router-dom";
import { useDefaultParam } from "./use-default-param";
import { useUpdateSearchParams } from "./use-update-search-params";

export function useBooleanParam(paramName: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const [searchParams] = useSearchParams();
  const update = useUpdateSearchParams();
  const raw = searchParams.get(paramName);
  const value = raw === null ? defaultValue : raw === "true";
  useDefaultParam(paramName, String(defaultValue));

  return [value, (next: boolean) => update({ [paramName]: String(next) })];
}
