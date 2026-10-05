import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { EntityTable } from "../../src/components/entity-table";
import type { Column, TableRow } from "../../src/lib/table/derive-table";
import type { Filters, Sort } from "../../src/lib/table/filter-sort";

const columns: Column[] = [
  { key: "id", kind: "text", target: "authority_lines", defaultVisible: true },
  { key: "person", kind: "text", target: "people", defaultVisible: true },
  { key: "teams", kind: "list", target: "teams", defaultVisible: true },
  { key: "is_interim", kind: "boolean", defaultVisible: true },
  { key: "start_date", kind: "text", defaultVisible: true },
];

const rows: TableRow[] = [
  {
    id: "lead-one",
    values: {
      id: "lead-one",
      person: "ann-example",
      teams: ["alpha", "beta"],
      is_interim: false,
      start_date: "2026-01-01",
    },
  },
];

function renderTable(overrides: { rows?: TableRow[]; filters?: Filters; sort?: Sort } = {}) {
  const onFilterChange = vi.fn();
  const onSortToggle = vi.fn();
  render(
    <MemoryRouter>
      <EntityTable
        columns={columns}
        rows={overrides.rows ?? rows}
        filters={overrides.filters ?? {}}
        sort={overrides.sort}
        onFilterChange={onFilterChange}
        onSortToggle={onSortToggle}
      />
    </MemoryRouter>
  );
  return { onFilterChange, onSortToggle };
}

describe("EntityTable", () => {
  it("renders a header per column, in order, and the cell text", () => {
    renderTable();
    expect(screen.getAllByRole("columnheader").slice(0, columns.length).map((header) => header.textContent)).toEqual([
      "id",
      "person",
      "teams",
      "is_interim",
      "start_date",
    ]);
    expect(screen.getByRole("cell", { name: "2026-01-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "false" })).toBeInTheDocument();
  });

  it("links reference cells to the referenced entity, one link per list item", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "lead-one" })).toHaveAttribute(
      "href",
      "/entities/authority_lines?id=lead-one"
    );
    expect(screen.getByRole("link", { name: "ann-example" })).toHaveAttribute(
      "href",
      "/entities/people?id=ann-example"
    );
    const teamsCell = screen.getByTitle("alpha; beta");
    expect(within(teamsCell).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/entities/teams?id=alpha",
      "/entities/teams?id=beta",
    ]);
  });

  it("reports text typed into a column's filter", async () => {
    const { onFilterChange } = renderTable();
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter person" }), "a");
    expect(onFilterChange).toHaveBeenCalledWith("person", "a");
  });

  it("shows the current filter values", () => {
    renderTable({ filters: { person: "ann", is_interim: "false" } });
    expect(screen.getByRole("searchbox", { name: "Filter person" })).toHaveValue("ann");
    expect(screen.getByRole("combobox", { name: "Filter is_interim" })).toHaveValue("false");
  });

  it("filters a boolean column with an any/true/false select", async () => {
    const { onFilterChange } = renderTable();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Filter is_interim" }), "true");
    expect(onFilterChange).toHaveBeenCalledWith("is_interim", "true");
  });

  it("toggles sort from a header and exposes the current direction", async () => {
    const { onSortToggle } = renderTable({ sort: { key: "person", descending: true } });
    await userEvent.click(screen.getByRole("button", { name: "start_date" }));
    expect(onSortToggle).toHaveBeenCalledWith("start_date");
    expect(screen.getByRole("columnheader", { name: "person" })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: "start_date" })).not.toHaveAttribute("aria-sort");
  });

  it("keeps the header and filters when no row matches", () => {
    renderTable({ rows: [], filters: { person: "zzz" } });
    expect(screen.getByText("No matching rows.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Filter person" })).toHaveValue("zzz");
  });
});
