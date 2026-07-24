import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Position, type Edge, type Node } from "@xyflow/react";
import { MemoryRouter } from "react-router-dom";
import { GraphCanvas } from "../../src/components/graph-canvas";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("labeled edges", () => {
  it("renders a copyable label chip for an edge with type \"labeled\"", async () => {
    const nodes: Node[] = [
      {
        id: "team:a",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "Team A" },
        measured: { width: 200, height: 88 },
        handles: [
          { type: "target", position: Position.Top, x: 100, y: 0 },
          { type: "source", position: Position.Bottom, x: 100, y: 88 },
        ],
      },
      {
        id: "person:b",
        type: "person",
        position: { x: 0, y: 0 },
        data: { label: "Person B" },
        measured: { width: 200, height: 88 },
        handles: [
          { type: "target", position: Position.Top, x: 100, y: 0 },
          { type: "source", position: Position.Bottom, x: 100, y: 88 },
        ],
      },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "team:a", target: "person:b", type: "labeled", label: "CTO" },
    ];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} />);

    expect(await screen.findByText("CTO")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Copy CTO" })).toBeInTheDocument();
  });

  it("copies the label text when its copy button is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const nodes: Node[] = [
      {
        id: "team:a",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "Team A" },
        measured: { width: 200, height: 88 },
        handles: [
          { type: "target", position: Position.Top, x: 100, y: 0 },
          { type: "source", position: Position.Bottom, x: 100, y: 88 },
        ],
      },
      {
        id: "person:b",
        type: "person",
        position: { x: 0, y: 0 },
        data: { label: "Person B" },
        measured: { width: 200, height: 88 },
        handles: [
          { type: "target", position: Position.Top, x: 100, y: 0 },
          { type: "source", position: Position.Bottom, x: 100, y: 88 },
        ],
      },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "team:a", target: "person:b", type: "labeled", label: "CTO" },
    ];

    renderWithRouter(<GraphCanvas nodes={nodes} edges={edges} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy CTO" }));

    expect(writeText).toHaveBeenCalledWith("CTO");
  });
});
