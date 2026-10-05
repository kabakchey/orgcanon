import { describe, expect, it } from "vitest";
import type { Column, TableRow } from "../../../src/lib/table/derive-table";
import { filterRows, sortRows } from "../../../src/lib/table/filter-sort";

const columns: Column[] = [
  { key: "id", kind: "text", defaultVisible: true },
  { key: "name", kind: "text", defaultVisible: true },
  { key: "is_temporary", kind: "boolean", defaultVisible: true },
  { key: "head_deputy", kind: "text", defaultVisible: true },
  { key: "teams", kind: "list", defaultVisible: true },
];

const rows: TableRow[] = [
  {
    id: "alpha",
    values: { id: "alpha", name: "Alpha Squad", is_temporary: false, head_deputy: null, teams: ["core", "web"] },
  },
  {
    id: "beta",
    values: { id: "beta", name: "beta crew", is_temporary: true, head_deputy: "ann-example", teams: [] },
  },
  {
    id: "gamma",
    values: { id: "gamma", name: "Gamma", is_temporary: false, head_deputy: "bo-example", teams: ["web"] },
  },
];

const ids = (result: TableRow[]) => result.map((row) => row.id);

describe("filterRows", () => {
  it("returns every row when no filter is set", () => {
    expect(ids(filterRows(rows, columns, {}))).toEqual(["alpha", "beta", "gamma"]);
  });

  it("matches a case-insensitive substring of the cell text", () => {
    expect(ids(filterRows(rows, columns, { name: "BETA" }))).toEqual(["beta"]);
  });

  it("matches a list column on any of its joined items", () => {
    expect(ids(filterRows(rows, columns, { teams: "web" }))).toEqual(["alpha", "gamma"]);
  });

  it("ANDs filters on different columns", () => {
    expect(ids(filterRows(rows, columns, { teams: "web", name: "gam" }))).toEqual(["gamma"]);
  });

  it("matches a boolean column exactly", () => {
    expect(ids(filterRows(rows, columns, { is_temporary: "true" }))).toEqual(["beta"]);
    expect(ids(filterRows(rows, columns, { is_temporary: "false" }))).toEqual(["alpha", "gamma"]);
  });

  it("treats a lone dash as 'only empty cells'", () => {
    expect(ids(filterRows(rows, columns, { head_deputy: "-" }))).toEqual(["alpha"]);
    expect(ids(filterRows(rows, columns, { teams: "-" }))).toEqual(["beta"]);
  });

  it("ignores whitespace around the filter text", () => {
    expect(ids(filterRows(rows, columns, { name: "  gamma " }))).toEqual(["gamma"]);
    expect(ids(filterRows(rows, columns, { name: "   " }))).toEqual(["alpha", "beta", "gamma"]);
  });

  it("ignores a filter on a column that is not visible", () => {
    const withoutName = columns.filter((candidate) => candidate.key !== "name");
    expect(ids(filterRows(rows, withoutName, { name: "beta" }))).toEqual(["alpha", "beta", "gamma"]);
  });
});

describe("sortRows", () => {
  it("keeps the given order without a sort", () => {
    expect(sortRows(rows, undefined)).toBe(rows);
  });

  it("sorts by cell text, case-insensitively, in either direction, without mutating the input", () => {
    expect(ids(sortRows(rows, { key: "name", descending: true }))).toEqual(["gamma", "beta", "alpha"]);
    expect(ids(sortRows(rows, { key: "name", descending: false }))).toEqual(["alpha", "beta", "gamma"]);
    expect(ids(rows)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("orders embedded numbers numerically", () => {
    const numbered: TableRow[] = ["team-10", "team-2", "team-1"].map((id) => ({ id, values: { id } }));
    expect(ids(sortRows(numbered, { key: "id", descending: false }))).toEqual(["team-1", "team-2", "team-10"]);
  });
});
