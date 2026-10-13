import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEntityCache } from "../../src/lib/orgapi/cache";
import { graphCanvasCalls } from "../fixtures/graph-canvas-mock";
import { installMockOrgapiFetch } from "../fixtures/mock-orgapi-fetch";
import { findPickerTrigger } from "../fixtures/tree-picker";

vi.mock("../../src/components/graph-canvas", () => import("../fixtures/graph-canvas-mock"));


import { OrgTreeView } from "../../src/views/org-tree-view";

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
  graphCanvasCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OrgTreeView", () => {
  it("only produces edges whose source and target reference existing nodes", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));
    const { nodes, edges } = graphCanvasCalls[graphCanvasCalls.length - 1]!;

    expect(edges.length).toBeGreaterThan(0);
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("passes a stable fold storage key to GraphCanvas", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));
    expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.graphKey).toBe("org-tree");
  });

  it("defaults selectedNodeId to the root team when no teamId param is given", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]?.selectedNodeId).toBe("team:potuto")
    );
  });

  it("falls back to the root team when the teamId param does not match a real team", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree?teamId=does-not-exist"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]?.selectedNodeId).toBe("team:potuto")
    );
  });

  it("still renders the whole org tree even once a non-root team is selected", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree?teamId=platform-squad"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]?.selectedNodeId).toBe("team:platform-squad")
    );
    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.map((n) => n.id)).toEqual(expect.arrayContaining(["team:potuto", "team:r-and-d"]));
  });

  it("wires a click-to-select handler onto every team card", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));
    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    const teamNode = nodes.find((n) => n.id === "team:r-and-d")!;
    expect(typeof teamNode.data.onSelect).toBe("function");
  });

  it("shows the root team pre-selected in the picker itself", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));
    expect(await findPickerTrigger("Team")).toHaveAccessibleName("Team: Potuto");
  });

  it("shows people by default and hides all person nodes/edges once unchecked", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));
    expect(screen.getByRole("checkbox", { name: "Show people" })).toBeChecked();
    expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.some((n) => n.id.startsWith("person:"))).toBe(
      true
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Show people" }));

    await waitFor(() =>
      expect(
        graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.every((n) => !n.id.startsWith("person:"))
      ).toBe(true)
    );
    expect(
      graphCanvasCalls[graphCanvasCalls.length - 1]!.edges.every(
        (e) => !e.source.startsWith("person:") && !e.target.startsWith("person:")
      )
    ).toBe(true);
  });

  it("hides authority lines by default and adds a Tech Lead authority edge once checked", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));
    expect(screen.getByRole("checkbox", { name: "Show authority lines" })).not.toBeChecked();
    expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.edges.some((e) => e.label === "Tech Lead")).toBe(false);

    await userEvent.click(screen.getByRole("checkbox", { name: "Show authority lines" }));

    await waitFor(() =>
      expect(
        graphCanvasCalls[graphCanvasCalls.length - 1]!.edges.some(
          (e) => e.source === "person:carol-lee" && e.target === "team:platform-squad" && e.label === "Tech Lead"
        )
      ).toBe(true)
    );
  });
});

describe("OrgTreeView toolbar toggles in the query string", () => {
  it("initializes its toggles from the URL", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/?showPeople=false&showAuthorityLines=true"]}>
        <OrgTreeView />
      </MemoryRouter>
    );

    expect(await screen.findByRole("checkbox", { name: "Show people" })).not.toBeChecked();
    expect(await screen.findByRole("checkbox", { name: "Show authority lines" })).toBeChecked();
  });
});
