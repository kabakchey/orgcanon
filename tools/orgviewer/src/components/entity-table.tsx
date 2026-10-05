import { Fragment, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { OrgData } from "../lib/orgapi/types";
import { cellText, type CellValue, type Column, type TableRow } from "../lib/table/derive-table";
import type { Filters, Sort } from "../lib/table/filter-sort";

function entityLink(target: keyof OrgData, id: string): ReactNode {
  return <Link to={`/entities/${target}?id=${encodeURIComponent(id)}`}>{id}</Link>;
}

function cellContent(column: Column, value: CellValue | undefined): ReactNode {
  const target = column.target;
  if (target && typeof value === "string" && value) return entityLink(target, value);
  if (target && Array.isArray(value)) {
    return value.map((id, index) => (
      <Fragment key={id}>
        {index > 0 && "; "}
        {entityLink(target, id)}
      </Fragment>
    ));
  }
  return cellText(value);
}

function ColumnFilter({
  column,
  value,
  onChange,
}: {
  column: Column;
  value: string;
  onChange: (value: string) => void;
}) {
  // The router applies URL updates as transitions, so an input controlled by the URL value
  // would be reset to its stale value between keystrokes and drop characters.
  const [draft, setDraft] = useState(value);
  const change = (next: string) => {
    setDraft(next);
    onChange(next);
  };
  const label = `Filter ${column.key}`;
  if (column.kind === "boolean") {
    return (
      <select aria-label={label} value={draft} onChange={(event) => change(event.target.value)}>
        <option value="">any</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  return (
    <input
      type="search"
      aria-label={label}
      placeholder="filter"
      value={draft}
      onChange={(event) => change(event.target.value)}
    />
  );
}

export function EntityTable({
  columns,
  rows,
  filters,
  sort,
  onFilterChange,
  onSortToggle,
}: {
  columns: Column[];
  rows: TableRow[];
  filters: Filters;
  sort: Sort | undefined;
  onFilterChange: (key: string, value: string) => void;
  onSortToggle: (key: string) => void;
}) {
  return (
    <div className="entity-table-scroll">
      <table className="entity-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sort?.key === column.key ? sort : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sorted ? (sorted.descending ? "descending" : "ascending") : undefined}
                >
                  <button type="button" className="entity-table-sort" onClick={() => onSortToggle(column.key)}>
                    {column.key}
                    {sorted && <span aria-hidden="true">{sorted.descending ? " ▼" : " ▲"}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
          <tr className="entity-table-filters">
            {columns.map((column) => (
              <td key={column.key}>
                <ColumnFilter
                  column={column}
                  value={filters[column.key] ?? ""}
                  onChange={(value) => onFilterChange(column.key, value)}
                />
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="muted">
                No matching rows.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => {
                  const value = row.values[column.key];
                  return (
                    <td key={column.key} title={cellText(value)}>
                      {cellContent(column, value)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
