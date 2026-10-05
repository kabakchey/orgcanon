import { useMemo, useState } from "react";
import { Link, useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { ColumnPicker } from "../components/column-picker";
import { EntityTable } from "../components/entity-table";
import { downloadTextFile } from "../lib/export/download-text-file";
import { isEntityKey, ORG_DATA_OUTPUT_KEYS, type OrgData } from "../lib/orgapi/types";
import { useEntities } from "../lib/orgapi/use-entities";
import { clearColumnLayout, loadColumnLayout, saveColumnLayout } from "../lib/table/column-memory";
import { deriveTable } from "../lib/table/derive-table";
import { filterRows, sortRows } from "../lib/table/filter-sort";
import {
  defaultColumnKeys,
  ENTITY_PARAM,
  entitySearch,
  isDefaultLayout,
  readTableParams,
  resolveVisibleColumns,
  withColumns,
  withFilter,
  withSortToggled,
} from "../lib/table/table-params";
import { toCsv } from "../lib/table/to-csv";
import { useDefaultParam } from "../lib/use-default-param";

const DEFAULT_ENTITY: keyof OrgData = "people";

function EntityTableSection({ entityKey }: { entityKey: keyof OrgData }) {
  const { data, error } = useEntities(entityKey);
  const [searchParams, setSearchParams] = useSearchParams();
  const table = useMemo(
    () => (data ? deriveTable(entityKey, data as unknown as Record<string, Record<string, unknown>>) : undefined),
    [entityKey, data]
  );

  if (error) return <p>Failed to load {entityKey}.</p>;
  if (!table) return <p>Loading…</p>;
  if (table.rows.length === 0) return <p>No {entityKey} entities.</p>;

  const { cols, sort, filters } = readTableParams(searchParams);
  const visibleColumns = resolveVisibleColumns(table.columns, cols);
  const visibleKeys = visibleColumns.map((column) => column.key);
  const defaultKeys = defaultColumnKeys(table.columns);
  const activeSort = sort && visibleKeys.includes(sort.key) ? sort : undefined;
  const shownRows = sortRows(filterRows(table.rows, visibleColumns, filters), activeSort);

  const update = (change: (params: URLSearchParams) => URLSearchParams) =>
    setSearchParams((previous) => change(previous), { replace: true });

  const setColumns = (keys: string[]) => {
    if (isDefaultLayout(keys, defaultKeys)) clearColumnLayout(entityKey);
    else saveColumnLayout(entityKey, keys);
    update((params) => withColumns(params, keys, defaultKeys));
  };

  return (
    <>
      <div className="entity-table-toolbar">
        <ColumnPicker
          columns={table.columns}
          visibleKeys={visibleKeys}
          onChange={setColumns}
          onReset={() => setColumns(defaultKeys)}
        />
        <button
          type="button"
          className="entity-table-button"
          disabled={shownRows.length === 0}
          onClick={() =>
            downloadTextFile(`${entityKey}.csv`, toCsv(visibleColumns, shownRows), "text/csv;charset=utf-8")
          }
        >
          Export CSV
        </button>
        <span className="muted">
          {shownRows.length} of {table.rows.length} {entityKey}
        </span>
      </div>
      <EntityTable
        columns={visibleColumns}
        rows={shownRows}
        filters={filters}
        sort={activeSort}
        onFilterChange={(key, value) => update((params) => withFilter(params, key, value))}
        onSortToggle={(key) => update((params) => withSortToggled(params, key))}
      />
    </>
  );
}

export function EntitiesView() {
  const [searchParams] = useSearchParams();
  useDefaultParam(ENTITY_PARAM, DEFAULT_ENTITY);
  const requested = searchParams.get(ENTITY_PARAM) ?? DEFAULT_ENTITY;
  const entityKey = isEntityKey(requested) ? requested : undefined;

  // The table's own edits replace the history entry; any other navigation (a tab link, Back) can
  // change filters behind the filter inputs' local text, so the table is remounted for those.
  const location = useLocation();
  const navigationType = useNavigationType();
  const [arrivalKey, setArrivalKey] = useState(location.key);
  if (navigationType !== "REPLACE" && arrivalKey !== location.key) setArrivalKey(location.key);

  return (
    <div className="entities-view">
      <nav className="entity-tabs" aria-label="Entity type">
        {ORG_DATA_OUTPUT_KEYS.map((key) => (
          <Link
            key={key}
            to={{ search: entitySearch(key, loadColumnLayout(key)) }}
            className="entity-tab"
            aria-current={key === entityKey ? "page" : undefined}
          >
            {key}
          </Link>
        ))}
      </nav>
      {entityKey ? <EntityTableSection key={`${entityKey}:${arrivalKey}`} entityKey={entityKey} /> : <p>Unknown entity type.</p>}
    </div>
  );
}
