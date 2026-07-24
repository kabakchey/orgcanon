import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { clearEntityCache } from "../../src/lib/orgapi/cache";
import { installMockOrgapiFetch } from "../fixtures/mock-orgapi-fetch";

const { graphCanvasCalls } = vi.hoisted(() => ({
  graphCanvasCalls: [] as Array<{
    nodes: Node[];
    edges: Edge[];
    selectedNodeId?: string;
    defaultFoldedNodeIds?: Set<string>;
  }>,
}));
vi.mock("../../src/components/graph-canvas", () => ({
  GraphCanvas: (props: {
    nodes: Node[];
    edges: Edge[];
    selectedNodeId?: string;
    defaultFoldedNodeIds?: Set<string>;
  }) => {
    graphCanvasCalls.push(props);
    return null;
  },
}));

import { ChainOfCommandView } from "../../src/views/chain-of-command-view";

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
  graphCanvasCalls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ChainOfCommandView", () => {
  it("defaults to the first person in the picker, preselected", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/chain-of-command"]}>
        <ChainOfCommandView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    expect(screen.getByRole("combobox")).toHaveValue("alice-nguyen");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.some((n) => n.id === "person:alice-nguyen")).toBe(
        true
      )
    );
  });

  it("shows only the selected person's chain of command, people-only, edges referencing existing nodes", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/chain-of-command"]}>
        <ChainOfCommandView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "carol-lee");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.edges.some((e) => e.id.startsWith("chain:"))).toBe(
        true
      )
    );

    const { nodes, edges } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:carol-lee", "person:alice-nguyen", "person:vp-eng", "person:cto"].sort()
    );
    expect(nodes.every((n) => n.type === "person")).toBe(true);

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("passes the selected person as GraphCanvas's selectedNodeId so their card highlights", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/chain-of-command"]}>
        <ChainOfCommandView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "carol-lee");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.selectedNodeId).toBe("person:carol-lee")
    );
  });

  it("starts a manager's subordinates folded by default", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/chain-of-command"]}>
        <ChainOfCommandView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "alice-nguyen");
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.defaultFoldedNodeIds).toEqual(
        new Set(["person:alice-nguyen"])
      )
    );
  });

  it("wires a click-to-select handler onto each person card, selecting that person", async () => {
    installMockOrgapiFetch();

    render(
      <MemoryRouter initialEntries={["/views/chain-of-command"]}>
        <ChainOfCommandView />
      </MemoryRouter>
    );
    await waitFor(() => expect(graphCanvasCalls.length).toBeGreaterThan(0));

    await userEvent.selectOptions(screen.getByRole("combobox"), "carol-lee");
    await waitFor(() => expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.nodes.length).toBeGreaterThan(0));

    const { nodes } = graphCanvasCalls[graphCanvasCalls.length - 1]!;
    const vpEngNode = nodes.find((n) => n.id === "person:vp-eng")!;
    expect(typeof vpEngNode.data.onSelect).toBe("function");

    (vpEngNode.data.onSelect as () => void)();
    await waitFor(() =>
      expect(graphCanvasCalls[graphCanvasCalls.length - 1]!.selectedNodeId).toBe("person:vp-eng")
    );
  });
});
