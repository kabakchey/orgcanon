import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { Position, type Edge, type Node } from "@xyflow/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { GraphCanvas } from "../../src/components/graph-canvas";
import { EDGE_STYLE } from "../../src/components/edge-styles";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("GraphCanvas", () => {
  it("renders without crashing given nodes and edges", async () => {
    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "Team A" } },
      { id: "person:b", type: "person", position: { x: 0, y: 0 }, data: { label: "Person B" } },
    ];
    const edges: Edge[] = [{ id: "e1", source: "team:a", target: "person:b" }];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} />);

    expect(await screen.findByText("Team A")).toBeInTheDocument();
    expect(await screen.findByText("Person B")).toBeInTheDocument();
  });
});

describe("GraphCanvas legend", () => {
  it("shows a legend in the bottom-right corner for the edges on screen", async () => {
    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "Team A" } },
      { id: "person:b", type: "person", position: { x: 0, y: 0 }, data: { label: "Person B" } },
    ];
    const edges: Edge[] = [{ id: "e1", source: "team:a", target: "person:b", style: EDGE_STYLE.membership }];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} />);

    const legend = await screen.findByRole("region", { name: "Legend" });
    expect(legend.closest(".react-flow__panel")).toHaveClass("bottom", "right");
    expect(within(legend).getByText("Team membership")).toBeInTheDocument();
  });
});

describe("GraphCanvas layout failure handling", () => {
  it("shows a visible fallback message instead of silently rendering when layoutElements rejects", async () => {
    vi.resetModules();
    vi.doMock("../../src/components/layout", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../src/components/layout")>();
      return {
        ...actual,
        layoutElements: () => Promise.reject(new Error("boom")),
      };
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GraphCanvas: GraphCanvasWithMockedLayout } = await import(
      "../../src/components/graph-canvas"
    );

    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "Team A" } },
    ];
    const edges: Edge[] = [];

    renderWithRouter(<GraphCanvasWithMockedLayout nodes={nodes} edges={edges} />);

    expect(await screen.findByText(/failed to lay out graph/i)).toBeInTheDocument();

    errorSpy.mockRestore();
    vi.doUnmock("../../src/components/layout");
    vi.resetModules();
  });
});

describe("GraphCanvas empty state", () => {
  it("shows a placeholder instead of the graph when there are no nodes", () => {
    renderWithRouter(<GraphCanvas nodes={[]} edges={[]} />);

    expect(screen.getByText(/select/i)).toBeInTheDocument();
    expect(document.querySelector(".react-flow")).toBeNull();
  });
});

describe("GraphCanvas selection highlight", () => {
  it("marks only the node matching selectedNodeId as selected", async () => {
    const nodes: Node[] = [
      { id: "person:a", type: "person", position: { x: 0, y: 0 }, data: { label: "A" } },
      { id: "person:b", type: "person", position: { x: 0, y: 0 }, data: { label: "B" } },
    ];
    const edges: Edge[] = [];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} selectedNodeId="person:a" />);

    const nodeA = await screen.findByText("A");
    const nodeB = await screen.findByText("B");
    expect(nodeA.closest(".node-card")).toHaveClass("node-selected");
    expect(nodeB.closest(".node-card")).not.toHaveClass("node-selected");
  });
});

describe("GraphCanvas re-centering", () => {
  it("fits to the screen for the first layout only, never when the node set later changes", async () => {
    vi.resetModules();
    const fitViewMock = vi.fn();
    vi.doMock("@xyflow/react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@xyflow/react")>();
      return {
        ...actual,
        useReactFlow: () => ({ fitView: fitViewMock, setViewport: vi.fn(), getViewport: () => ({ x: 0, y: 0, zoom: 1 }) }),
      };
    });

    const { GraphCanvas: GraphCanvasWithMockedFitView } = await import(
      "../../src/components/graph-canvas"
    );

    const nodesA: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "Team A" } },
    ];
    const { rerender } = renderWithRouter(<GraphCanvasWithMockedFitView nodes={nodesA} edges={[]} />);
    // One fit on mount, one once ELK's first layout lands.
    await waitFor(() => expect(fitViewMock.mock.calls.length).toBe(2));
    expect(fitViewMock.mock.calls).toEqual([[], []]);

    const nodesB: Node[] = [
      ...nodesA,
      { id: "team:b", type: "team", position: { x: 0, y: 0 }, data: { label: "Team B" } },
    ];
    rerender(
      <MemoryRouter>
        <GraphCanvasWithMockedFitView nodes={nodesB} edges={[]} />
      </MemoryRouter>
    );

    await screen.findByText("Team B");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fitViewMock).toHaveBeenCalledTimes(2);

    vi.doUnmock("@xyflow/react");
    vi.resetModules();
  });
});

describe("GraphCanvas camera in the URL", () => {
  function Search() {
    return <output aria-label="search">{useLocation().search}</output>;
  }

  async function importWithMockedFlow() {
    vi.resetModules();
    const flow = {
      fitView: vi.fn(async () => true),
      setViewport: vi.fn(async () => true),
      getViewport: () => ({ x: 5, y: 6, zoom: 0.75 }),
    };
    vi.doMock("@xyflow/react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@xyflow/react")>();
      return { ...actual, useReactFlow: () => flow };
    });
    const { GraphCanvas: MockedCanvas } = await import("../../src/components/graph-canvas");
    return { flow, MockedCanvas };
  }

  const nodes: Node[] = [{ id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "Team A" } }];

  it("restores the camera from the URL instead of fitting", async () => {
    const { flow, MockedCanvas } = await importWithMockedFlow();
    render(
      <MemoryRouter initialEntries={["/?zoom=0.5&x=10&y=20"]}>
        <MockedCanvas nodes={nodes} edges={[]} />
      </MemoryRouter>
    );

    await waitFor(() => expect(flow.setViewport).toHaveBeenCalledWith({ x: 10, y: 20, zoom: 0.5 }));
    expect(flow.fitView).not.toHaveBeenCalled();

    vi.doUnmock("@xyflow/react");
    vi.resetModules();
  });

  it("fits when the URL has no camera, then writes the fitted camera into it", async () => {
    const { flow, MockedCanvas } = await importWithMockedFlow();
    render(
      <MemoryRouter initialEntries={["/?teamId=a"]}>
        <MockedCanvas nodes={nodes} edges={[]} />
        <Search />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText("search")).toHaveTextContent("zoom=0.75&x=5&y=6"));
    expect(screen.getByLabelText("search")).toHaveTextContent("teamId=a");
    expect(flow.fitView).toHaveBeenCalled();

    vi.doUnmock("@xyflow/react");
    vi.resetModules();
  });
});

describe("GraphCanvas default folding", () => {
  it("starts a node folded when its id is in defaultFoldedNodeIds and nothing is stored yet", async () => {
    localStorage.clear();
    const nodes: Node[] = [
      {
        id: "team:potuto",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "Potuto" },
        measured: { width: 200, height: 88 },
      },
      {
        id: "team:r-and-d",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "R&D" },
        measured: { width: 200, height: 88 },
      },
    ];
    const edges: Edge[] = [
      { id: "hierarchy:potuto->r-and-d", source: "team:potuto", target: "team:r-and-d" },
    ];

    renderWithRouter(
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        foldStorageKey="test-default-fold"
        defaultFoldedNodeIds={new Set(["team:potuto"])}
      />
    );

    expect(await screen.findByText("Potuto")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("R&D")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Expand (1 direct, 1 total hidden)" })).toBeInTheDocument();
  });
});

describe("GraphCanvas auto-fold default", () => {
  function buildFanGraph(): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [{ id: "team:root", type: "team", position: { x: 0, y: 0 }, data: { label: "Root" } }];
    const edges: Edge[] = [];
    for (let m = 0; m < 4; m++) {
      const midId = `team:mid-${m}`;
      nodes.push({ id: midId, type: "team", position: { x: 0, y: 0 }, data: { label: `Mid ${m}` } });
      edges.push({ id: `hierarchy:root->mid-${m}`, source: "team:root", target: midId });
      for (let l = 0; l < 4; l++) {
        const leafId = `person:leaf-${m}-${l}`;
        nodes.push({ id: leafId, type: "person", position: { x: 0, y: 0 }, data: { label: `Leaf ${m}-${l}` } });
        edges.push({ id: `membership:mid-${m}->leaf-${l}:Member`, source: midId, target: leafId });
      }
    }
    return { nodes, edges };
  }

  it("automatically folds down to at most 15 visible nodes on a graph's first-ever visit", async () => {
    localStorage.clear();
    const { nodes, edges } = buildFanGraph();
    expect(nodes).toHaveLength(21);

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} foldStorageKey="test-auto-fold" />);

    await screen.findByText("Root");
    await waitFor(() => {
      expect(document.querySelectorAll(".node-card").length).toBeLessThanOrEqual(15);
    });
  });

  it("leaves the graph alone once a fold key already has stored state, even if that state is empty", async () => {
    localStorage.clear();
    localStorage.setItem("orgviewer-fold:test-auto-fold-stored", JSON.stringify([]));
    const { nodes, edges } = buildFanGraph();

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} foldStorageKey="test-auto-fold-stored" />);

    await screen.findByText("Root");
    await waitFor(() => {
      expect(document.querySelectorAll(".node-card").length).toBe(21);
    });
  });
});

describe("GraphCanvas dependency cycle routing", () => {
  it("draws the closing edge of a cycle along ELK's routed path instead of a naive bezier", async () => {
    // Mirrors examples/complex-org's Audit Log -> Notification Service -> Event Bus -> Audit Log
    // cycle (dependency cycles are legitimate, not an error) -- see layout.ts's `routeFor` and
    // edge-types.tsx's `LabeledEdge` for why a naive bezier swings off-canvas here instead of
    // connecting the two nodes.
    const rightHandles = [
      { type: "target" as const, position: Position.Left, x: 0, y: 44 },
      { type: "source" as const, position: Position.Right, x: 200, y: 44 },
    ];
    const nodes: Node[] = [
      {
        id: "component:a",
        type: "component",
        position: { x: 0, y: 0 },
        data: { label: "A", direction: "RIGHT" },
        measured: { width: 200, height: 88 },
        handles: rightHandles,
      },
      {
        id: "component:b",
        type: "component",
        position: { x: 0, y: 0 },
        data: { label: "B", direction: "RIGHT" },
        measured: { width: 200, height: 88 },
        handles: rightHandles,
      },
      {
        id: "component:c",
        type: "component",
        position: { x: 0, y: 0 },
        data: { label: "C", direction: "RIGHT" },
        measured: { width: 200, height: 88 },
        handles: rightHandles,
      },
    ];
    const edges: Edge[] = [
      { id: "dependency:a->b", source: "component:a", target: "component:b" },
      { id: "dependency:b->c", source: "component:b", target: "component:c" },
      { id: "dependency:c->a", source: "component:c", target: "component:a" },
    ];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} direction="RIGHT" />);
    await screen.findByText("A");

    // GraphCanvas renders synchronously with un-laid-out (0,0) positions first, then re-renders
    // once elk.layout() resolves -- wait for the routed path rather than racing that re-render.
    const d = await waitFor(() => {
      const el = document.querySelector('[data-testid="rf__edge-dependency:c->a"] path.react-flow__edge-path');
      const path = el?.getAttribute("d");
      const segments = path?.match(/C/g)?.length ?? 0;
      if (segments < 2) throw new Error("routed path not rendered yet");
      return path!;
    });

    // A plain bezier path is a single "M...C..." command; a routed path chains multiple "C"
    // segments through ELK's bend points.
    expect(d.match(/C/g)?.length ?? 0).toBeGreaterThanOrEqual(2);

    const xs = [...d.matchAll(/(-?\d+(?:\.\d+)?),-?\d+(?:\.\d+)?/g)].map((m) => Number(m[1]));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1);
  });
});

describe("GraphCanvas folding", () => {
  it("hides a folded node's descendants and shows a hidden-count badge on it", async () => {
    localStorage.clear();
    // measured dimensions are set explicitly here because jsdom's ResizeObserver stub never
    // fires, so react-flow would otherwise leave these nodes at `visibility: hidden`, which
    // hides them from role-based queries (though not from `getByText`).
    const nodes: Node[] = [
      {
        id: "team:potuto",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "Potuto" },
        measured: { width: 200, height: 88 },
      },
      {
        id: "team:r-and-d",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "R&D" },
        measured: { width: 200, height: 88 },
      },
    ];
    const edges: Edge[] = [
      { id: "hierarchy:potuto->r-and-d", source: "team:potuto", target: "team:r-and-d" },
    ];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} foldStorageKey="test-org-tree" />);

    const toggle = await screen.findByRole("button", { name: "Collapse" });
    await userEvent.click(toggle);

    expect(await screen.findByText("Potuto")).toBeInTheDocument();
    // "Potuto" was already on screen before the click, so `findByText` resolves synchronously
    // and doesn't wait for GraphCanvas's async re-layout -- wait for R&D to disappear instead.
    await waitFor(() => {
      expect(screen.queryByText("R&D")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Expand (1 direct, 1 total hidden)" })).toBeInTheDocument();
  });
});

describe("GraphCanvas fold all / unfold all", () => {
  function teamNode(id: string, label: string): Node {
    return { id: `team:${id}`, type: "team", position: { x: 0, y: 0 }, data: { label }, measured: { width: 200, height: 88 } };
  }
  const nodes: Node[] = [teamNode("a", "Alpha"), teamNode("b", "Bravo"), teamNode("c", "Charlie")];
  const edges: Edge[] = [
    { id: "hierarchy:a->b", source: "team:a", target: "team:b" },
    { id: "hierarchy:b->c", source: "team:b", target: "team:c" },
  ];

  it("Fold all folds every foldable node, nested ones included, so expanding the top reveals one level", async () => {
    localStorage.clear();
    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} foldStorageKey="test-fold-all" />);

    await userEvent.click(await screen.findByRole("button", { name: "Fold all" }));
    await waitFor(() => expect(screen.queryByText("Bravo")).toBeNull());

    await userEvent.click(await screen.findByRole("button", { name: "Expand (1 direct, 2 total hidden)" }));
    expect(await screen.findByText("Bravo")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).toBeNull();
  });

  it("Unfold all expands every folded node and persists it", async () => {
    localStorage.clear();
    localStorage.setItem("orgviewer-fold:test-unfold-all", JSON.stringify(["team:a", "team:b"]));
    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} foldStorageKey="test-unfold-all" />);

    await userEvent.click(await screen.findByRole("button", { name: "Unfold all" }));

    expect(await screen.findByText("Charlie")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("orgviewer-fold:test-unfold-all")!)).toEqual([]);
  });

  it("shows neither button when the graph has nothing foldable", async () => {
    renderWithRouter(<GraphCanvas nodes={nodes} edges={[]} foldStorageKey="test-nothing-foldable" />);

    expect(await screen.findByRole("button", { name: "Export as Mermaid" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fold all" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Unfold all" })).toBeNull();
  });

  it("shows neither button when the view has folding disabled", async () => {
    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} />);

    expect(await screen.findByRole("button", { name: "Export as Mermaid" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fold all" })).toBeNull();
  });
});

describe("GraphCanvas manual layout persistence", () => {
  it("commits a completed node drag to localStorage under the graph's own key, and shows Reset graph", async () => {
    localStorage.clear();
    vi.resetModules();
    const captured: {
      onNodesChange?: (changes: Array<{ id: string; type: string; position?: { x: number; y: number }; dragging?: boolean }>) => void;
      nodes?: Node[];
    } = {};
    vi.doMock("@xyflow/react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@xyflow/react")>();
      return {
        ...actual,
        ReactFlow: (props: {
          nodes: Node[];
          onNodesChange: typeof captured.onNodesChange;
          children?: React.ReactNode;
        }) => {
          captured.onNodesChange = props.onNodesChange;
          captured.nodes = props.nodes;
          // FitViewOnChange (a child) calls useReactFlow, which needs a real provider context
          // that real <ReactFlow> sets up internally -- this stand-in must provide it too.
          return <actual.ReactFlowProvider>{props.children}</actual.ReactFlowProvider>;
        },
      };
    });

    const { GraphCanvas: GraphCanvasWithMockedFlow } = await import("../../src/components/graph-canvas");

    const nodes: Node[] = [
      { id: "component:a", type: "component", position: { x: 0, y: 0 }, data: { label: "A" } },
      { id: "component:b", type: "component", position: { x: 0, y: 0 }, data: { label: "B" } },
    ];
    const edges: Edge[] = [{ id: "dependency:a->b", source: "component:a", target: "component:b" }];

    renderWithRouter(
      <GraphCanvasWithMockedFlow nodes={nodes} edges={edges} foldStorageKey="component-dependencies:a:direct" />
    );

    await waitFor(() => {
      expect(captured.nodes?.find((n) => n.id === "component:b")?.position.x).not.toBe(0);
    });

    captured.onNodesChange!([{ id: "component:a", type: "position", position: { x: 123, y: 45 }, dragging: false }]);

    await waitFor(() => {
      expect(localStorage.getItem("orgviewer-layout:component-dependencies:a:direct")).not.toBeNull();
    });
    const stored = JSON.parse(localStorage.getItem("orgviewer-layout:component-dependencies:a:direct")!);
    expect(stored.nodePositions["component:a"]).toEqual({ x: 123, y: 45 });
    // The whole layout snapshots on first touch, so the untouched node's position is captured
    // too, not left for ELK to keep guessing.
    expect(stored.nodePositions["component:b"]).toBeDefined();

    expect(await screen.findByRole("button", { name: "Reset graph" })).toBeInTheDocument();

    vi.doUnmock("@xyflow/react");
    vi.resetModules();
  });

  it("Reset graph clears the stored override", async () => {
    localStorage.clear();
    localStorage.setItem(
      "orgviewer-layout:component-dependencies:a:direct",
      JSON.stringify({ nodePositions: { "component:a": { x: 1, y: 1 } }, edgeRoutes: {} })
    );

    const nodes: Node[] = [
      { id: "component:a", type: "component", position: { x: 0, y: 0 }, data: { label: "A" } },
    ];

    renderWithRouter(
      <GraphCanvas nodes={nodes} edges={[]} foldStorageKey="component-dependencies:a:direct" />
    );

    const resetButton = await screen.findByRole("button", { name: "Reset graph" });
    await userEvent.click(resetButton);

    expect(localStorage.getItem("orgviewer-layout:component-dependencies:a:direct")).toBeNull();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Reset graph" })).toBeNull();
    });
  });
});

describe("GraphCanvas mermaid export", () => {
  it("downloads a .mmd file named after the fold storage key when the export button is clicked", async () => {
    vi.resetModules();
    const downloadTextFile = vi.fn();
    vi.doMock("../../src/lib/export/download-text-file", () => ({ downloadTextFile }));

    const { GraphCanvas: GraphCanvasWithMockedDownload } = await import("../../src/components/graph-canvas");

    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "Team A" } },
      { id: "person:b", type: "person", position: { x: 0, y: 0 }, data: { label: "Person B" } },
    ];
    const edges: Edge[] = [{ id: "e1", source: "team:a", target: "person:b", label: "Lead" }];

    renderWithRouter(
      <GraphCanvasWithMockedDownload nodes={nodes} edges={edges} foldStorageKey="chain-of-command:carol-lee" />
    );

    const exportButton = await screen.findByRole("button", { name: "Export as Mermaid" });
    await userEvent.click(exportButton);

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, content] = downloadTextFile.mock.calls[0]!;
    expect(filename).toMatch(/^chain-of-command-carol-lee-\d{4}-\d{2}-\d{2}T\d{4}\.mmd$/);
    expect(content).toContain("flowchart TD");
    expect(content).toContain("Team A");
    expect(content).toContain("Person B");

    vi.doUnmock("../../src/lib/export/download-text-file");
    vi.resetModules();
  });
});
