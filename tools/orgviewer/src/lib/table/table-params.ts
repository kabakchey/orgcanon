import type { Column } from "./derive-table";
import type { Filters, Sort } from "./filter-sort";

export const ENTITY_PARAM = "entity";
const COLS_PARAM = "cols";
const SORT_PARAM = "sort";
const FILTER_PREFIX = "f.";
const DESCENDING_PREFIX = "-";

interface TableParams {
  cols: string[] | undefined;
  sort: Sort | undefined;
  filters: Filters;
}

// Freeform map keys become column keys and may themselves contain the separator.
function encodeCols(keys: string[]): string {
  return keys.map(encodeURIComponent).join(",");
}

function decodeCol(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function parseSort(raw: string | null): Sort | undefined {
  if (!raw) return undefined;
  return raw.startsWith(DESCENDING_PREFIX)
    ? { key: raw.slice(DESCENDING_PREFIX.length), descending: true }
    : { key: raw, descending: false };
}

export function readTableParams(params: URLSearchParams): TableParams {
  const filters: Filters = {};
  for (const [name, value] of params.entries()) {
    if (name.startsWith(FILTER_PREFIX)) filters[name.slice(FILTER_PREFIX.length)] = value;
  }
  const cols = params.get(COLS_PARAM);
  return {
    cols: cols ? cols.split(",").map(decodeCol) : undefined,
    sort: parseSort(params.get(SORT_PARAM)),
    filters,
  };
}

export function defaultColumnKeys(columns: Column[]): string[] {
  return columns.filter((column) => column.defaultVisible).map((column) => column.key);
}

export function isDefaultLayout(keys: string[], defaults: string[]): boolean {
  return keys.length === defaults.length && keys.every((key, index) => key === defaults[index]);
}

export function resolveVisibleColumns(columns: Column[], requested: string[] | undefined): Column[] {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const picked = [...new Set(requested ?? [])].flatMap((key) => byKey.get(key) ?? []);
  return picked.length > 0 ? picked : columns.filter((column) => column.defaultVisible);
}

export function entitySearch(entityKey: string, cols: string[] | undefined): string {
  const params = new URLSearchParams({ [ENTITY_PARAM]: entityKey });
  if (cols) params.set(COLS_PARAM, encodeCols(cols));
  return `?${params.toString()}`;
}

export function withFilter(params: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(params);
  if (value) next.set(FILTER_PREFIX + key, value);
  else next.delete(FILTER_PREFIX + key);
  return next;
}

export function withSortToggled(params: URLSearchParams, key: string): URLSearchParams {
  const next = new URLSearchParams(params);
  const current = parseSort(next.get(SORT_PARAM));
  if (current?.key !== key) next.set(SORT_PARAM, key);
  else if (!current.descending) next.set(SORT_PARAM, DESCENDING_PREFIX + key);
  else next.delete(SORT_PARAM);
  return next;
}

export function withColumns(params: URLSearchParams, keys: string[], defaults: string[]): URLSearchParams {
  const next = new URLSearchParams(params);
  if (isDefaultLayout(keys, defaults)) next.delete(COLS_PARAM);
  else next.set(COLS_PARAM, encodeCols(keys));

  for (const name of [...next.keys()]) {
    if (name.startsWith(FILTER_PREFIX) && !keys.includes(name.slice(FILTER_PREFIX.length))) next.delete(name);
  }
  const sort = parseSort(next.get(SORT_PARAM));
  if (sort && !keys.includes(sort.key)) next.delete(SORT_PARAM);
  return next;
}
