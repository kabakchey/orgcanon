import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Edge } from "@xyflow/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { EDGE_STYLE } from "../../src/lib/relationships/edge-styles";
import { GraphLegend, legendEntries } from "../../src/components/graph-legend";

function edge(id: string, style: Edge["style"]): Edge {
  return { id, source: "a", target: "b", style };
}

describe("legendEntries", () => {
  it("lists each edge style present once, in the legend's fixed order, by line look", () => {
    const entries = legendEntries([
      edge("1", EDGE_STYLE.dependency),
      edge("2", { ...EDGE_STYLE.lineManagementNonHierarchical }),
      edge("3", EDGE_STYLE.parentChild),
      edge("4", EDGE_STYLE.dependency),
    ]);

    expect(entries.map((entry) => entry.label)).toEqual([
      "Parent team",
      "Line management (non-hierarchical)",
      "Dependency",
    ]);
  });

  it("skips edges with no style or a style the legend doesn't know", () => {
    expect(legendEntries([edge("1", undefined), edge("2", { stroke: "red" })])).toEqual([]);
  });
});

describe("GraphLegend", () => {
  function Search() {
    return <output aria-label="search">{useLocation().search}</output>;
  }

  function renderAt(url: string, edges: Edge[]) {
    render(
      <MemoryRouter initialEntries={[url]}>
        <GraphLegend edges={edges} />
        <Search />
      </MemoryRouter>
    );
  }

  it("starts open, showing a row per edge style in the graph", () => {
    renderAt("/", [edge("1", EDGE_STYLE.authority), edge("2", EDGE_STYLE.membership)]);

    const legend = screen.getByRole("region", { name: "Legend" });
    expect(within(legend).getByRole("button", { name: "Legend" })).toHaveAttribute("aria-expanded", "true");
    expect(within(legend).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Team membership",
      "Authority",
    ]);
  });

  it("collapses on click and keeps that in the query string", async () => {
    renderAt("/?teamId=x", [edge("1", EDGE_STYLE.authority)]);

    await userEvent.click(screen.getByRole("button", { name: "Legend" }));

    expect(screen.getByRole("button", { name: "Legend" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByLabelText("search")).toHaveTextContent("legend=false");
  });

  it("opens collapsed when the query string says so", () => {
    renderAt("/?legend=false", [edge("1", EDGE_STYLE.authority)]);
    expect(screen.getByRole("button", { name: "Legend" })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders nothing for a graph without styled edges", () => {
    renderAt("/", []);
    expect(screen.queryByRole("region", { name: "Legend" })).not.toBeInTheDocument();
  });
});
