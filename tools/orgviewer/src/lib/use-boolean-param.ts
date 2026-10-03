import { useSearchParams } from "react-router-dom";
import { useDefaultParam } from "./use-default-param";

export function useBooleanParam(paramName: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(paramName);
  const value = raw === null ? defaultValue : raw === "true";
  useDefaultParam(paramName, String(defaultValue));

  const setValue = (next: boolean) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set(paramName, String(next));
      return params;
    });
  };

  return [value, setValue];
}
