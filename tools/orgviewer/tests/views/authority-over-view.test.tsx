import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { clearEntityCache } from "../../src/lib/orgapi/cache";
import { installMockOrgapiFetch } from "../fixtures/mock-orgapi-fetch";

const { graphCanvasCalls } = vi.hoisted(() => ({
  graphCanvasCalls: [] as Array<{ nodes: Node[]; edges: Edge[]; selectedNodeId?: string }>,
}));
vi.mock("../../src/components/graph-canvas", () => ({
  GraphCanvas: (props: { nodes: Node[]; edges: Edge[]; selectedNodeId?: string }) => {
    graphCanvasCalls.push(props);
    return null;
  },
}));

import { AuthorityOverView } from "../../src/views/authority-over-view";

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
  graphCanvasCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthorityOverView", () => {
  it("defaults to the first team in the picker, preselected", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/authority-over"]}>
        <AuthorityOverView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    expect(screen.getByRole("combobox")).toHaveValue("platform-squad");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.some((n) => n.id === "team:platform-squad")).toBe(
        true
      )
    );
  });

  it("shows the selected team, its authority-holders, and its line-management chain, edges referencing existing nodes", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/authority-over"]}>
        <AuthorityOverView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "platform-squad");
    await waitFor(() =>
      expect(
        graphCanvasCalls[graphCanvasCalls.length - 1]!.edges.some((e) => e.id.startsWith("authority:"))
      ).toBe(true)
    );

    const { nodes, edges } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["team:platform-squad", "person:carol-lee", "person:alice-nguyen", "person:vp-eng", "person:cto"].sort()
    );

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("passes the selected team as GraphCanvas's selectedNodeId so its card highlights", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/authority-over"]}>
        <AuthorityOverView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "platform-squad");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.selectedNodeId).toBe("team:platform-squad")
    );
  });

  it("wires a click-to-select handler onto the team card", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/authority-over"]}>
        <AuthorityOverView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "platform-squad");
    await waitFor(() => expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0));

    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    const teamNode = nodes.find((n) => n.id === "team:platform-squad")!;
    expect(typeof teamNode.data.onSelect).toBe("function");
  });
});
