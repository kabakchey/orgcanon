import { useSearchParams } from "react-router-dom";

export interface EntityOption {
  id: string;
  label: string;
}

export interface EntityPickerProps {
  paramName: string;
  options: EntityOption[];
  // Shown as the selected value whenever paramName is absent from the URL, instead of falling
  // back to the empty "Select…" option -- e.g. Org Tree's root team, which should never appear
  // unselected.
  fallbackId?: string;
}

// Shared by EntityPicker's own dropdown and by graph nodes' click-to-select control (see
// node-types.tsx's node-card-select button, wired up per view via withNodeSelect) -- both just
// need to set one query param to an id, keeping the current path and other params.
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

export function EntityPicker({ paramName, options, fallbackId }: EntityPickerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get(paramName) ?? fallbackId ?? "";
  const select = useSelectParam(paramName);

  return (
    <select
      value={selected}
      onChange={(event) => {
        if (event.target.value) {
          select(event.target.value);
          return;
        }
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete(paramName);
          return next;
        });
      }}
    >
      <option value="">Select…</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
