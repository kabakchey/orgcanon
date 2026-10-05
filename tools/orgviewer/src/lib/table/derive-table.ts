import { relationalTargetFor } from "../orgapi/relational-fields";
import type { OrgData } from "../orgapi/types";

export type CellValue = string | boolean | string[] | null;
export type ColumnKind = "text" | "boolean" | "list" | "objects";

export interface Column {
  key: string;
  kind: ColumnKind;
  target?: keyof OrgData;
  defaultVisible: boolean;
}

export interface TableRow {
  id: string;
  values: Record<string, CellValue>;
}

export interface DerivedTable {
  columns: Column[];
  rows: TableRow[];
}

export const ID_COLUMN = "id";

const LIST_SEPARATOR = "; ";
const DEFAULT_HIDDEN_FIELDS = new Set(["description"]);

export function cellText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(LIST_SEPARATOR);
  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function summaryPairs(item: Record<string, unknown>, prefix: string): string[] {
  return Object.entries(item).flatMap(([field, value]) => {
    const key = prefix ? `${prefix}.${field}` : field;
    if (isEmpty(value)) return [];
    if (isPlainObject(value)) return summaryPairs(value, key);
    if (Array.isArray(value)) return value.length > 0 ? [`${key}=${value.map(summarize).join("|")}`] : [];
    return [`${key}=${String(value)}`];
  });
}

function summarize(item: unknown): string {
  return isPlainObject(item) ? summaryPairs(item, "").join(", ") : String(item);
}

interface ColumnFacts {
  field: string;
  sawBoolean: boolean;
  sawOtherScalar: boolean;
  sawList: boolean;
  sawObjects: boolean;
}

function flattenInto(
  values: Record<string, CellValue>,
  facts: Map<string, ColumnFacts>,
  source: Record<string, unknown>,
  prefix: string,
  topField: string | undefined
): void {
  for (const [name, value] of Object.entries(source)) {
    const key = prefix ? `${prefix}.${name}` : name;
    const field = topField ?? name;
    if (isPlainObject(value)) {
      flattenInto(values, facts, value, key, field);
      continue;
    }

    let columnFacts = facts.get(key);
    if (!columnFacts) {
      columnFacts = { field, sawBoolean: false, sawOtherScalar: false, sawList: false, sawObjects: false };
      facts.set(key, columnFacts);
    }

    if (Array.isArray(value)) {
      columnFacts.sawList = true;
      if (value.some(isPlainObject)) columnFacts.sawObjects = true;
      values[key] = value.map(summarize);
    } else if (typeof value === "boolean") {
      columnFacts.sawBoolean = true;
      values[key] = value;
    } else if (value === null || value === undefined) {
      values[key] = null;
    } else {
      columnFacts.sawOtherScalar = true;
      values[key] = String(value);
    }
  }
}

function kindOf(facts: ColumnFacts): ColumnKind {
  if (facts.sawObjects) return "objects";
  if (facts.sawList) return "list";
  if (facts.sawBoolean && !facts.sawOtherScalar) return "boolean";
  return "text";
}

function targetOf(entityKey: keyof OrgData, key: string, kind: ColumnKind): keyof OrgData | undefined {
  if (kind !== "text" && kind !== "list") return undefined;
  if (key === "reviewable.owner") return "people";
  return relationalTargetFor(entityKey, key);
}

export function deriveTable(
  entityKey: keyof OrgData,
  collection: Record<string, Record<string, unknown>>
): DerivedTable {
  const facts = new Map<string, ColumnFacts>();
  const rows = Object.entries(collection).map(([id, entity]) => {
    const values: Record<string, CellValue> = { [ID_COLUMN]: id };
    flattenInto(values, facts, entity, "", undefined);
    return { id, values };
  });
  if (rows.length === 0) return { columns: [], rows };

  const fieldOrder = [...new Set([...facts.values()].map((columnFacts) => columnFacts.field))];
  const columns: Column[] = [{ key: ID_COLUMN, kind: "text", target: entityKey, defaultVisible: true }];
  for (const field of fieldOrder) {
    for (const [key, columnFacts] of facts) {
      if (columnFacts.field !== field) continue;
      const kind = kindOf(columnFacts);
      const target = targetOf(entityKey, key, kind);
      columns.push({
        key,
        kind,
        ...(target ? { target } : {}),
        defaultVisible: key === field && kind !== "objects" && !DEFAULT_HIDDEN_FIELDS.has(key),
      });
    }
  }
  return { columns, rows };
}
