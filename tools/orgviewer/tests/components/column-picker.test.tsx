import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColumnPicker } from "../../src/components/column-picker";
import type { Column } from "../../src/lib/table/derive-table";

const columns: Column[] = ["id", "name", "description", "head"].map((key) => ({
  key,
  kind: "text",
  defaultVisible: key !== "description",
}));

async function openPicker(visibleKeys: string[] = ["id", "name", "head"]) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  render(<ColumnPicker columns={columns} visibleKeys={visibleKeys} onChange={onChange} onReset={onReset} />);
  await userEvent.click(screen.getByRole("button", { name: "Columns" }));
  return { onChange, onReset };
}

describe("ColumnPicker", () => {
  it("stays closed until its button is pressed", () => {
    render(<ColumnPicker columns={columns} visibleKeys={["id"]} onChange={vi.fn()} onReset={vi.fn()} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Columns" })).toHaveAttribute("aria-expanded", "false");
  });

  it("lists visible columns first in their order, then hidden ones", async () => {
    await openPicker(["head", "id"]);
    expect(screen.getAllByRole("checkbox").map((box) => box.getAttribute("aria-label"))).toEqual([
      "head",
      "id",
      "name",
      "description",
    ]);
    expect(screen.getByRole("checkbox", { name: "head" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "name" })).not.toBeChecked();
  });

  it("hides a column when unchecked", async () => {
    const { onChange } = await openPicker();
    await userEvent.click(screen.getByRole("checkbox", { name: "name" }));
    expect(onChange).toHaveBeenCalledWith(["id", "head"]);
  });

  it("appends a column when checked", async () => {
    const { onChange } = await openPicker();
    await userEvent.click(screen.getByRole("checkbox", { name: "description" }));
    expect(onChange).toHaveBeenCalledWith(["id", "name", "head", "description"]);
  });

  it("moves a column up or down", async () => {
    const { onChange } = await openPicker();
    await userEvent.click(screen.getByRole("button", { name: "Move head up" }));
    expect(onChange).toHaveBeenLastCalledWith(["id", "head", "name"]);
    await userEvent.click(screen.getByRole("button", { name: "Move id down" }));
    expect(onChange).toHaveBeenLastCalledWith(["name", "id", "head"]);
  });

  it("cannot move past either end or hide the only visible column", async () => {
    await openPicker(["id"]);
    expect(screen.getByRole("button", { name: "Move id up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move id down" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "id" })).toBeDisabled();
  });

  it("resets to the default layout", async () => {
    const { onReset } = await openPicker();
    await userEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(onReset).toHaveBeenCalled();
  });
});
