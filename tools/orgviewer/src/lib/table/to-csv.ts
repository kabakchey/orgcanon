import { cellText, type Column, type TableRow } from "./derive-table";

// Without it Excel reads a UTF-8 CSV as a legacy codepage and mangles non-ASCII names.
const BOM = "﻿";
const FORMULA_LEAD = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;

function escapeField(text: string): string {
  const safe = FORMULA_LEAD.test(text) ? `'${text}` : text;
  return NEEDS_QUOTING.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(columns: Column[], rows: TableRow[]): string {
  const lines = [
    columns.map((column) => column.key),
    ...rows.map((row) => columns.map((column) => cellText(row.values[column.key]))),
  ];
  return BOM + lines.map((fields) => `${fields.map(escapeField).join(",")}\r\n`).join("");
}
