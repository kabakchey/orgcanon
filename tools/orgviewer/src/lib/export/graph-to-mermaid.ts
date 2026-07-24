import type { Edge, Node } from "@xyflow/react";
import type { LayoutDirection } from "../../components/layout";

export interface GraphToMermaidOptions {
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

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function nodeLines(node: Node): string[] {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const lines: string[] = [asString(data.label) ?? node.id];

  if (node.type === "team") {
    const type = asString(data.type);
    if (type) lines.push(type);
    const description = asString(data.description);
    if (description) lines.push(description);
  } else if (node.type === "person") {
    const teamName = asString(data.teamName);
    if (teamName) lines.push(`Unit: ${teamName}`);
    const primaryTitle = asString(data.primaryTitle);
    if (primaryTitle) lines.push(`Role: ${primaryTitle}`);
    const secondaryTitles = Array.isArray(data.secondaryTitles) ? (data.secondaryTitles as unknown[]) : [];
    for (const title of secondaryTitles) {
      const text = asString(title);
      if (text) lines.push(text);
    }
    const positionTitle = asString(data.positionTitle);
    if (positionTitle) lines.push(`Position: ${positionTitle}`);
  } else if (node.type === "component") {
    const type = asString(data.type);
    if (type) lines.push(type);
    const ownerTeamName = asString(data.ownerTeamName) ?? asString(data.ownerTeamId);
    if (ownerTeamName) lines.push(ownerTeamName);

    // → direct dependencies, ⇒ all dependencies (direct + transitive), ← direct dependees,
    // ⇐ all dependees (direct + transitive) -- mirrors node-types.tsx's ComponentNode.
    const countSpecs: Array<[string, string, unknown]> = [
      ["→", "direct dependencies", data.directDependencies],
      ["⇒", "all dependencies", data.transitiveDependencies],
      ["←", "direct dependees", data.directDependees],
      ["⇐", "all dependees", data.transitiveDependees],
    ];
    const counts = countSpecs
      .filter((spec): spec is [string, string, number] => typeof spec[2] === "number")
      .map(([icon, label, count]) => `${icon} ${count} ${label}`);
    if (counts.length > 0) lines.push(counts.join(", "));

    if (data.isEndUserFacing) lines.push("end-user-facing");
  }

  if (data.folded) {
    const direct = typeof data.directHiddenCount === "number" ? data.directHiddenCount : 0;
    const total = typeof data.hiddenCount === "number" ? data.hiddenCount : 0;
    lines.push(`${direct} direct / ${total} total hidden`);
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
    const label = nodeLines(node).map(escapeMermaidText).join("<br/>");
    lines.push(`${id}["${label}"]`);
    const selected = Boolean((node.data as Record<string, unknown> | undefined)?.selected);
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
