import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { TreePicker, resetTreePickerMemory } from "../../src/components/tree-picker";
import { findItem, type TreeItem } from "../../src/lib/picker/tree";
import { usePickedParam } from "../../src/lib/use-picked-param";

function leaf(key: string, label: string): TreeItem {
  return { key, value: key, label, children: [] };
}

const tree: TreeItem[] = [
  {
    key: "root",
    value: "root",
    label: "Root",
    children: [
      { key: "alpha", value: "alpha", label: "Alpha Squad", children: [leaf("alpha-sub", "Alpha Sub")] },
      leaf("zeta", "Zeta Squad"),
    ],
  },
  { key: "group", label: "Group Only", children: [leaf("inner", "Inner Thing")] },
];

function LocationDisplay() {
  const location = useLocation();
  return (
    <>
      <div data-testid="location">{location.search}</div>
      <div data-testid="navigation-type">{useNavigationType()}</div>
    </>
  );
}

function UrlBoundPicker({ fallbackId }: { fallbackId?: string }) {
  const [value, select] = usePickedParam("teamId", (id) => findItem(tree, id) !== undefined, fallbackId);
  return <TreePicker label="Team" tree={tree} value={value} onChange={select} />;
}

function renderPicker(url: string, fallbackId?: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <UrlBoundPicker fallbackId={fallbackId} />
      <LocationDisplay />
    </MemoryRouter>
  );
}

const trigger = () => screen.getByRole("button", { name: /^Team:/ });
const filterBox = () => screen.getByRole("combobox", { name: "Filter teams" });
const rowNames = () => screen.getAllByRole("treeitem").map((row) => row.querySelector(".tree-picker-label")!.textContent);

beforeEach(() => {
  resetTreePickerMemory();
});

describe("TreePicker", () => {
  it("shows the selected item's label, or the fallback when the param is absent", () => {
    renderPicker("/?teamId=zeta", "root");
    expect(trigger()).toHaveAccessibleName("Team: Zeta Squad");
  });

  it("falls back to fallbackId when the param is absent", () => {
    renderPicker("/", "root");
    expect(trigger()).toHaveAccessibleName("Team: Root");
  });

  it("writes the fallback into the URL in place of the current entry when the param is absent", () => {
    renderPicker("/?other=x", "root");

    expect(screen.getByTestId("location")).toHaveTextContent("?other=x&teamId=root");
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("REPLACE");
  });

  it("leaves the URL alone when the param is already set", () => {
    renderPicker("/?teamId=zeta", "root");

    expect(screen.getByTestId("location")).toHaveTextContent("?teamId=zeta");
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("POP");
  });

  it("opens with everything expanded, the selection marked", async () => {
    renderPicker("/?teamId=zeta");
    await userEvent.click(trigger());

    expect(rowNames()).toEqual(["Root", "Alpha Squad", "Alpha Sub", "Zeta Squad", "Group Only", "Inner Thing"]);
    expect(screen.getByRole("treeitem", { name: "Zeta Squad" })).toHaveAttribute("aria-selected", "true");
    expect(filterBox()).toHaveFocus();
  });

  it("selecting an item sets the param and closes the panel", async () => {
    renderPicker("/?other=x");
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("treeitem", { name: "Zeta Squad" }));

    expect(screen.getByTestId("location").textContent).toBe("?other=x&teamId=zeta");
    expect(screen.queryByRole("tree")).toBeNull();
  });

  it("clicking a group-only row toggles it instead of selecting", async () => {
    renderPicker("/");
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("treeitem", { name: "Group Only" }));

    expect(screen.queryByRole("treeitem", { name: "Inner Thing" })).toBeNull();
    await userEvent.click(screen.getByRole("treeitem", { name: "Group Only" }));
    expect(screen.getByRole("treeitem", { name: "Inner Thing" })).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("");
  });

  it("filters to matches plus muted ancestors, highlighting the match, and Enter picks the first match", async () => {
    renderPicker("/");
    await userEvent.click(trigger());
    await userEvent.type(filterBox(), "sub");

    expect(rowNames()).toEqual(["Root", "Alpha Squad", "Alpha Sub"]);
    expect(screen.getByRole("treeitem", { name: "Root" })).toHaveClass("tree-picker-context");
    expect(within(screen.getByRole("treeitem", { name: "Alpha Sub" })).getByText("Sub", { selector: "mark" })).toBeInTheDocument();

    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("location").textContent).toBe("?teamId=alpha-sub");
  });

  it("shows a no-matches message for a filter that matches nothing", async () => {
    renderPicker("/");
    await userEvent.click(trigger());
    await userEvent.type(filterBox(), "nothing-like-this");

    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("says there is nothing to select when the tree itself is empty", async () => {
    render(
      <MemoryRouter>
        <TreePicker label="Component" tree={[]} value={undefined} onChange={() => {}} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: /^Component:/ }));

    expect(screen.getByText("Nothing to select")).toBeInTheDocument();
    expect(screen.queryByText("No matches")).toBeNull();
  });

  it("supports arrow-key navigation, expand/collapse and Escape", async () => {
    renderPicker("/");
    await userEvent.click(trigger());

    await userEvent.keyboard("{ArrowDown}");
    expect(filterBox()).toHaveAttribute("aria-activedescendant", screen.getByRole("treeitem", { name: "Alpha Squad" }).id);

    await userEvent.keyboard("{ArrowLeft}");
    expect(rowNames()).not.toContain("Alpha Sub");
    await userEvent.keyboard("{ArrowRight}");
    expect(rowNames()).toContain("Alpha Sub");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(filterBox()).toHaveAttribute("aria-activedescendant", screen.getByRole("treeitem", { name: "Root" }).id);

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("tree")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("remembers manual expand/collapse between openings", async () => {
    renderPicker("/");
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("treeitem", { name: "Alpha Squad" }).querySelector(".tree-picker-chevron")!);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(trigger());

    expect(rowNames()).not.toContain("Alpha Sub");
  });
});
