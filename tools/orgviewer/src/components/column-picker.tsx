import { useState } from "react";
import type { Column } from "../lib/table/derive-table";

export function ColumnPicker({
  columns,
  visibleKeys,
  onChange,
  onReset,
}: {
  columns: Column[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hiddenKeys = columns.map((column) => column.key).filter((key) => !visibleKeys.includes(key));

  const move = (index: number, offset: -1 | 1) => {
    const next = [...visibleKeys];
    const [moved] = next.splice(index, 1);
    next.splice(index + offset, 0, moved!);
    onChange(next);
  };

  return (
    <div className="column-picker">
      <button type="button" className="entity-table-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Columns
      </button>
      {open && (
        <div className="column-picker-panel">
          <ul className="column-picker-list">
            {visibleKeys.map((key, index) => (
              <li key={key} className="column-picker-item">
                <label>
                  <input
                    type="checkbox"
                    aria-label={key}
                    checked
                    disabled={visibleKeys.length === 1}
                    onChange={() => onChange(visibleKeys.filter((visibleKey) => visibleKey !== key))}
                  />
                  {key}
                </label>
                <button
                  type="button"
                  aria-label={`Move ${key} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${key} down`}
                  disabled={index === visibleKeys.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </li>
            ))}
            {hiddenKeys.map((key) => (
              <li key={key} className="column-picker-item">
                <label>
                  <input
                    type="checkbox"
                    aria-label={key}
                    checked={false}
                    onChange={() => onChange([...visibleKeys, key])}
                  />
                  {key}
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="entity-table-button" onClick={onReset}>
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}
