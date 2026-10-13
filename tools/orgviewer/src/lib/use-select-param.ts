import { useUpdateSearchParams } from "./use-update-search-params";

export function useSelectParam(paramName: string): (id: string) => void {
  const update = useUpdateSearchParams();
  return (id: string) => update({ [paramName]: id });
}
