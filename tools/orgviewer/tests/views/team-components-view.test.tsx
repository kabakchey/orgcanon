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

import { TeamComponentsView } from "../../src/views/team-components-view";

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
  graphCanvasCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TeamComponentsView", () => {
  it("defaults to the first team in the picker, preselected", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/team-components"]}>
        <TeamComponentsView />
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

  it("shows just the selected team, its own members, and its own components -- no other org-tree branches", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/team-components"]}>
        <TeamComponentsView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "platform-squad");
    await waitFor(() =>
      expect(
        graphCanvasCalls[graphCanvasCalls.length - 1]!.edges.some((e) => e.id.startsWith("ownership:"))
      ).toBe(true)
    );

    const { nodes, edges } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.some((n) => n.id === "team:r-and-d")).toBe(false);
    expect(nodes.some((n) => n.id === "team:potuto")).toBe(false);
    expect(nodes.some((n) => n.id === "team:platform-squad")).toBe(true);
    expect(nodes.some((n) => n.id === "person:alice-nguyen")).toBe(false);

    const componentNode = nodes.find((n) => n.type === "component");
    expect(componentNode?.data).toMatchObject({ type: "service", isEndUserFacing: false });

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("does not include a descendant team's components in direct mode", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/team-components"]}>
        <TeamComponentsView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "r-and-d");
    await waitFor(() => expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0));

    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.some((n) => n.type === "component")).toBe(false);
    expect(nodes.some((n) => n.id === "team:platform-squad")).toBe(false);
  });

  it("includes descendant teams and their components once indirect mode is checked", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/team-components"]}>
        <TeamComponentsView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "r-and-d");
    await waitFor(() => expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.some((n) => n.type === "component")).toBe(true)
    );

    const { nodes, edges } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.some((n) => n.id === "team:platform-squad")).toBe(true);
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "team:r-and-d", target: "team:platform-squad" })
    );
  });

  it("passes the selected team as GraphCanvas's selectedNodeId so its card highlights", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/team-components"]}>
        <TeamComponentsView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "platform-squad");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.selectedNodeId).toBe("team:platform-squad")
    );
  });

  it("wires a click-to-select handler onto team cards", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/team-components"]}>
        <TeamComponentsView />
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
