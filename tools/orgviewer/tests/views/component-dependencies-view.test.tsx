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

import { ComponentDependenciesView } from "../../src/views/component-dependencies-view";

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
  graphCanvasCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ComponentDependenciesView", () => {
  it("defaults to the first component in the picker, preselected", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/component-dependencies"]}>
        <ComponentDependenciesView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    expect(screen.getByRole("combobox")).toHaveValue("billing-api");
    await waitFor(() =>
      expect(
        graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.some((n) => n.id === "component:billing-api")
      ).toBe(true)
    );
  });

  it("shows just the selected component and its direct neighbors (deps + dependees), by default", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/component-dependencies"]}>
        <ComponentDependenciesView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "billing-ui");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0)
    );

    const { nodes, edges } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["component:billing-ui", "component:billing-api", "component:billing-worker"].sort()
    );
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("carries owning-team and dependency-count data on each component card", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/component-dependencies"]}>
        <ComponentDependenciesView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "billing-ui");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0)
    );

    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    const billingUi = nodes.find((n) => n.id === "component:billing-ui");
    expect(billingUi?.data).toMatchObject({
      ownerTeamId: "platform-squad",
      ownerTeamName: "Platform Squad",
      directDependencies: 1,
    });
  });

  it("passes the selected component as GraphCanvas's selectedNodeId so its card highlights", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/component-dependencies"]}>
        <ComponentDependenciesView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "billing-ui");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.selectedNodeId).toBe("component:billing-ui")
    );
  });

  it("wires a click-to-select handler onto every component card", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/component-dependencies"]}>
        <ComponentDependenciesView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "billing-ui");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0)
    );

    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    const apiNode = nodes.find((n) => n.id === "component:billing-api")!;
    expect(typeof apiNode.data.onSelect).toBe("function");
  });

  it("expands to the transitive closure once the checkbox is checked", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/component-dependencies"]}>
        <ComponentDependenciesView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "billing-worker");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0)
    );
    expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.map((n) => n.id).sort()).toEqual(
      ["component:billing-worker", "component:billing-ui"].sort()
    );

    await userEvent.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(2)
    );
    expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.map((n) => n.id).sort()).toEqual(
      ["component:billing-worker", "component:billing-ui", "component:billing-api"].sort()
    );
  });
});
