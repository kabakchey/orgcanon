import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { graphToMermaid } from "../../../src/lib/export/graph-to-mermaid";

const CSS_VARS: Record<string, string> = {
  "--node-team-bg": "#e0e7ff",
  "--node-person-bg": "#d1fae5",
  "--node-component-bg": "#fef3c7",
  "--node-border": "#64748b",
  "--text-primary": "#0f172a",
  "--node-selected-bg": "#fed7aa",
  "--node-selected-border": "#ea580c",
  "--edge-parent-child": "#334155",
  "--edge-line-management": "#2563eb",
};

function getCssVar(name: string): string {
  return CSS_VARS[name] ?? "";
}

describe("graphToMermaid", () => {
  it("emits flowchart TD for DOWN and LR for RIGHT", () => {
    expect(graphToMermaid([], [], { direction: "DOWN", getCssVar })).toMatch(/^flowchart TD\n/);
    expect(graphToMermaid([], [], { direction: "RIGHT", getCssVar })).toMatch(/^flowchart LR\n/);
  });

  it("emits classDef blocks using the resolved theme colors", () => {
    const output = graphToMermaid([], [], { direction: "DOWN", getCssVar });
    expect(output).toContain("classDef teamNode fill:#e0e7ff,stroke:#64748b,color:#0f172a;");
    expect(output).toContain("classDef selectedNode fill:#fed7aa,stroke:#ea580c,stroke-width:2px,color:#0f172a;");
  });

  it("renders a team node's type/description lines and assigns teamNode class", () => {
    const nodes: Node[] = [
      {
        id: "team:eng",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "Engineering", type: "Department", description: "Builds the product" },
      },
    ];

    const output = graphToMermaid(nodes, [], { direction: "DOWN", getCssVar });

    expect(output).toContain('team_eng["Engineering<br/>Department<br/>Builds the product"]');
    expect(output).toContain("class team_eng teamNode");
  });

  it("renders a person node's Unit/Role/secondary/Position lines", () => {
    const nodes: Node[] = [
      {
        id: "person:carol-lee",
        type: "person",
        position: { x: 0, y: 0 },
        data: {
          label: "Carol Lee",
          teamName: "Engineering",
          primaryTitle: "CTO",
          secondaryTitles: ["Acting CISO"],
          positionTitle: "Chief Technology Officer",
        },
      },
    ];

    const output = graphToMermaid(nodes, [], { direction: "DOWN", getCssVar });

    expect(output).toContain(
      'person_carol_lee["Carol Lee<br/>Unit: Engineering<br/>Role: CTO<br/>Acting CISO<br/>Position: Chief Technology Officer"]'
    );
    expect(output).toContain("class person_carol_lee personNode");
  });

  it("renders a component node's type/owner/counts/badge", () => {
    const nodes: Node[] = [
      {
        id: "component:auth-service",
        type: "component",
        position: { x: 0, y: 0 },
        data: {
          label: "Auth Service",
          type: "Service",
          ownerTeamName: "Platform",
          directDependencies: 2,
          transitiveDependencies: 5,
          isEndUserFacing: true,
        },
      },
    ];

    const output = graphToMermaid(nodes, [], { direction: "DOWN", getCssVar });

    expect(output).toContain(
      'component_auth_service["Auth Service<br/>Service<br/>Platform<br/>→ 2 direct dependencies, ⇒ 5 all dependencies<br/>end-user-facing"]'
    );
    expect(output).toContain("class component_auth_service componentNode");
  });

  it("uses the selectedNode class instead of the type class for the selected node", () => {
    const nodes: Node[] = [
      { id: "person:a", type: "person", position: { x: 0, y: 0 }, data: { label: "A", selected: true } },
    ];

    const output = graphToMermaid(nodes, [], { direction: "DOWN", getCssVar });

    expect(output).toContain("class person_a selectedNode");
    expect(output).not.toContain("class person_a personNode");
  });

  it("appends a hidden-count line for a folded node", () => {
    const nodes: Node[] = [
      {
        id: "team:a",
        type: "team",
        position: { x: 0, y: 0 },
        data: { label: "A", folded: true, directHiddenCount: 2, hiddenCount: 5 },
      },
    ];

    const output = graphToMermaid(nodes, [], { direction: "DOWN", getCssVar });

    expect(output).toContain('team_a["A<br/>2 direct / 5 total hidden"]');
  });

  it("renders edges with and without labels, dropping edges with a missing endpoint", () => {
    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "A" } },
      { id: "person:b", type: "person", position: { x: 0, y: 0 }, data: { label: "B" } },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "team:a", target: "person:b", label: "CTO" },
      { id: "e2", source: "team:a", target: "person:missing" },
    ];

    const output = graphToMermaid(nodes, edges, { direction: "DOWN", getCssVar });

    expect(output).toContain('team_a -->|"CTO"| person_b');
    expect(output).not.toContain("person_missing");
  });

  it("renders a plain arrow when an edge has no label", () => {
    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "A" } },
      { id: "team:b", type: "team", position: { x: 0, y: 0 }, data: { label: "B" } },
    ];
    const edges: Edge[] = [{ id: "e1", source: "team:a", target: "team:b" }];

    const output = graphToMermaid(nodes, edges, { direction: "DOWN", getCssVar });

    expect(output).toContain("team_a --> team_b");
  });

  it("emits a linkStyle per edge using its style's resolved color, width, and dasharray", () => {
    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: "A" } },
      { id: "person:b", type: "person", position: { x: 0, y: 0 }, data: { label: "B" } },
    ];
    const edges: Edge[] = [
      {
        id: "e1",
        source: "team:a",
        target: "person:b",
        style: { stroke: "var(--edge-line-management)", strokeWidth: 2, strokeDasharray: "6 3" },
      },
    ];

    const output = graphToMermaid(nodes, edges, { direction: "DOWN", getCssVar });

    expect(output).toContain("linkStyle 0 stroke:#2563eb,stroke-width:2px,stroke-dasharray: 6 3;");
  });

  it("escapes quotes and # characters in labels", () => {
    const nodes: Node[] = [
      { id: "team:a", type: "team", position: { x: 0, y: 0 }, data: { label: 'Team "Alpha" #1' } },
    ];

    const output = graphToMermaid(nodes, [], { direction: "DOWN", getCssVar });

    expect(output).toContain('team_a["Team #quot;Alpha#quot; #35;1"]');
  });
});
