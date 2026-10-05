import { cellText, type CellValue, type Column, type TableRow } from "./derive-table";

export type Filters = Record<string, string>;

export interface Sort {
  key: string;
  descending: boolean;
}

const EMPTY_CELL_FILTER = "-";

function matches(column: Column, value: CellValue | undefined, filter: string): boolean {
  const text = cellText(value);
  if (column.kind === "boolean") return text === filter;
  if (filter === EMPTY_CELL_FILTER) return text === "";
  return text.toLowerCase().includes(filter.toLowerCase());
}

export function filterRows(rows: TableRow[], visibleColumns: Column[], filters: Filters): TableRow[] {
  const active = visibleColumns.flatMap((column) => {
    const filter = filters[column.key]?.trim();
    return filter ? [{ column, filter }] : [];
  });
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(({ column, filter }) => matches(column, row.values[column.key], filter))
  );
}

export function sortRows(rows: TableRow[], sort: Sort | undefined): TableRow[] {
  if (!sort) return rows;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const sign = sort.descending ? -1 : 1;
  return [...rows].sort(
    (left, right) => sign * collator.compare(cellText(left.values[sort.key]), cellText(right.values[sort.key]))
  );
}
