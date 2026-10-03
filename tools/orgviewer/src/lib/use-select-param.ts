import { useSearchParams } from "react-router-dom";

export function useSelectParam(paramName: string): (id: string) => void {
  const [, setSearchParams] = useSearchParams();
  return (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(paramName, id);
      return next;
    });
  };
}
