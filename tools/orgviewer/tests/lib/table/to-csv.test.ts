import { describe, expect, it } from "vitest";
import type { Column, TableRow } from "../../../src/lib/table/derive-table";
import { toCsv } from "../../../src/lib/table/to-csv";

const text = (key: string): Column => ({ key, kind: "text", defaultVisible: true });
const BOM = "﻿";

describe("toCsv", () => {
  it("writes a BOM, a header of column keys, and CRLF-terminated rows in the given column order", () => {
    const rows: TableRow[] = [
      { id: "alpha", values: { id: "alpha", name: "Alpha", is_temporary: false, teams: ["core", "web"] } },
      { id: "beta", values: { id: "beta", name: "Beta", is_temporary: true, teams: [] } },
    ];
    const columns: Column[] = [
      text("name"),
      text("id"),
      { key: "is_temporary", kind: "boolean", defaultVisible: true },
      { key: "teams", kind: "list", defaultVisible: true },
    ];
    expect(toCsv(columns, rows)).toBe(
      `${BOM}name,id,is_temporary,teams\r\nAlpha,alpha,false,core; web\r\nBeta,beta,true,\r\n`
    );
  });

  it("leaves null and absent values as empty fields", () => {
    const rows: TableRow[] = [{ id: "alpha", values: { id: "alpha", head_deputy: null } }];
    expect(toCsv([text("id"), text("head_deputy"), text("missing")], rows)).toBe(
      `${BOM}id,head_deputy,missing\r\nalpha,,\r\n`
    );
  });

  it("quotes fields containing a comma, quote or line break, doubling quotes", () => {
    const rows: TableRow[] = [
      { id: "alpha", values: { a: "one, two", b: 'say "hi"', c: "line one\nline two", d: "plain" } },
    ];
    expect(toCsv([text("a"), text("b"), text("c"), text("d")], rows)).toBe(
      `${BOM}a,b,c,d\r\n"one, two","say ""hi""","line one\nline two",plain\r\n`
    );
  });

  it("prefixes fields a spreadsheet would run as a formula", () => {
    const rows: TableRow[] = [
      { id: "alpha", values: { a: "=SUM(A1)", b: "+1", c: "-1", d: "@cmd", e: "a=b" } },
    ];
    expect(toCsv([text("a"), text("b"), text("c"), text("d"), text("e")], rows)).toBe(
      `${BOM}a,b,c,d,e\r\n'=SUM(A1),'+1,'-1,'@cmd,a=b\r\n`
    );
  });

  it("writes only the header when there are no rows", () => {
    expect(toCsv([text("id")], [])).toBe(`${BOM}id\r\n`);
  });
});
