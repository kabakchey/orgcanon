import type { Edge, Node } from "@xyflow/react";
import type { LayoutDirection } from "../layout/elk-layout";
import { DEPENDENCY_COUNTS, type FlowNode } from "../relationships/flow-elements";

interface GraphToMermaidOptions {
  direction: LayoutDirection;
  // Resolves a CSS custom property (e.g. "--node-team-bg") to its currently active literal
  // value -- mermaid needs real colors, not var() references, and reading it live (rather than
  // hardcoding a second copy of index.css's palette here) means light/dark and any future palette
  // edit stay automatically in sync with what the export produces.
  getCssVar: (name: string) => string;
}

const NODE_TYPE_CLASS: Record<string, string> = {
  team: "teamNode",
  person: "personNode",
  component: "componentNode",
};

// Mermaid treats a lone "#" as the start of an HTML/numeric entity (e.g. "#quot;"), so any
// literal "#" in source text has to be escaped first -- otherwise escaping '"' below into
// "#quot;" could itself get mis-re-escaped, and any "#" already in a label would corrupt parsing.
function escapeMermaidText(text: string): string {
  return text.replace(/#/g, "#35;").replace(/"/g, "#quot;");
}

// Mermaid node/edge ids must avoid punctuation like ":" -- ids in this app (e.g.
// "person:carol-lee") are already unique, and this substitution never merges two distinct ids.
function sanitizeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

function nodeLines(node: FlowNode): string[] {
  const lines: string[] = [node.data.label || node.id];
  const push = (line: string | null | undefined | false) => {
    if (line) lines.push(line);
  };

  if (node.type === "team") {
    push(node.data.type);
    push(node.data.description);
  } else if (node.type === "person") {
    const { teamName, primaryTitle, secondaryTitles, positionTitle } = node.data;
    push(teamName && `Unit: ${teamName}`);
    push(primaryTitle && `Role: ${primaryTitle}`);
    (secondaryTitles ?? []).forEach(push);
    push(positionTitle && `Position: ${positionTitle}`);
  } else if (node.type === "component") {
    const data = node.data;
    push(data.type);
    push(data.ownerTeamName ?? data.ownerTeamId);
    push(
      DEPENDENCY_COUNTS.filter(({ field }) => data[field] !== undefined)
        .map(({ icon, label, field }) => `${icon} ${data[field]} ${label}`)
        .join(", ")
    );
    push(data.isEndUserFacing && "end-user-facing");
  }

  if (node.data.folded) {
    lines.push(`${node.data.directHiddenCount ?? 0} direct / ${node.data.hiddenCount ?? 0} total hidden`);
  }

  return lines;
}

function varNameFromCssValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.match(/var\((--[\w-]+)\)/);
  return match?.[1];
}

export function graphToMermaid(nodes: Node[], edges: Edge[], options: GraphToMermaidOptions): string {
  const { direction, getCssVar } = options;
  const lines: string[] = [direction === "RIGHT" ? "flowchart LR" : "flowchart TD"];

  const nodeBorder = getCssVar("--node-border");
  const nodeText = getCssVar("--text-primary");
  lines.push(
    `classDef teamNode fill:${getCssVar("--node-team-bg")},stroke:${nodeBorder},color:${nodeText};`,
    `classDef personNode fill:${getCssVar("--node-person-bg")},stroke:${nodeBorder},color:${nodeText};`,
    `classDef componentNode fill:${getCssVar("--node-component-bg")},stroke:${nodeBorder},color:${nodeText};`,
    `classDef selectedNode fill:${getCssVar("--node-selected-bg")},stroke:${getCssVar("--node-selected-border")},stroke-width:2px,color:${nodeText};`
  );

  for (const node of nodes) {
    const id = sanitizeId(node.id);
    const label = nodeLines(node as FlowNode).map(escapeMermaidText).join("<br/>");
    lines.push(`${id}["${label}"]`);
    const selected = Boolean(node.data.selected);
    const typeClass = node.type ? NODE_TYPE_CLASS[node.type] : undefined;
    const className = selected ? "selectedNode" : typeClass;
    if (className) lines.push(`class ${id} ${className}`);
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  visibleEdges.forEach((edge) => {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    const label = typeof edge.label === "string" ? edge.label : undefined;
    lines.push(label ? `${source} -->|"${escapeMermaidText(label)}"| ${target}` : `${source} --> ${target}`);
  });

  visibleEdges.forEach((edge, index) => {
    const style = edge.style as { stroke?: unknown; strokeWidth?: unknown; strokeDasharray?: unknown } | undefined;
    const varName = varNameFromCssValue(style?.stroke);
    const color = varName ? getCssVar(varName) : undefined;
    if (!color) return;
    const width = typeof style?.strokeWidth === "number" ? style.strokeWidth : 1;
    const dasharray = typeof style?.strokeDasharray === "string" ? `,stroke-dasharray: ${style.strokeDasharray}` : "";
    lines.push(`linkStyle ${index} stroke:${color},stroke-width:${width}px${dasharray};`);
  });

  return lines.join("\n") + "\n";
}
