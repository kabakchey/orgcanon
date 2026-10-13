import { useSearchParams } from "react-router-dom";
import { useDefaultParam } from "./use-default-param";
import { useSelectParam } from "./use-select-param";

// The id a view works on: the URL's, when it names something that exists, else fallbackId --
// which is also written into the URL whenever the param is absent from it.
export function usePickedParam(
  paramName: string,
  exists: (id: string) => boolean,
  fallbackId: string | undefined
): [string | undefined, (id: string) => void] {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get(paramName);
  useDefaultParam(paramName, fallbackId);
  return [requested !== null && exists(requested) ? requested : fallbackId, useSelectParam(paramName)];
}
