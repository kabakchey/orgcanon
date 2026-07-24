import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Link } from "react-router-dom";
import { DEFAULT_NODE_WIDTH, type LayoutDirection } from "./layout";
import { CopyButton } from "./copy-button";

interface NodeCardLine {
  text: string;
  // Rendered before `text` in a less-prominent style (e.g. "Unit", "Role", "Position") so the
  // value itself reads as the primary content of the line.
  label?: string;
  muted?: boolean;
  href?: string;
}

// A count rendered as icon+number only -- the label (e.g. "direct dependencies") is exposed as a
// hover tooltip (title) and accessible name (aria-label) instead of always-visible text, so four
// of these can sit in one compact row on a component card rather than four full-width lines.
interface NodeCardCount {
  icon: string;
  count: number;
  label: string;
  href?: string;
}

function directionFromData(data: NodeProps["data"]): LayoutDirection {
  return data.direction === "RIGHT" ? "RIGHT" : "DOWN";
}

const ENTITY_KEY_BY_NODE_TYPE: Record<string, string> = {
  team: "teams",
  person: "people",
  component: "components",
};

function detailsHrefForNodeId(nodeId: string): string | undefined {
  const [nodeType, ...rest] = nodeId.split(":");
  const entityKey = nodeType ? ENTITY_KEY_BY_NODE_TYPE[nodeType] : undefined;
  const id = rest.join(":");
  if (!entityKey || !id) return undefined;
  return `/entities/${entityKey}?id=${encodeURIComponent(id)}`;
}

function FoldToggle({
  folded,
  hiddenCount,
  directHiddenCount,
  onToggle,
  direction,
}: {
  folded: boolean;
  hiddenCount: number;
  directHiddenCount: number;
  onToggle: () => void;
  direction: LayoutDirection;
}) {
  const positionClass = direction === "RIGHT" ? "fold-toggle-right" : "fold-toggle-down";
  return (
    <button
      type="button"
      className={`fold-toggle ${positionClass} nodrag nopan ${folded ? "folded" : "expanded"}`}
      aria-label={folded ? `Expand (${directHiddenCount} direct, ${hiddenCount} total hidden)` : "Collapse"}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {folded && (
        <>
          <span className="fold-toggle-direct">+{directHiddenCount}</span>
          <span className="fold-toggle-total">/{hiddenCount}</span>
        </>
      )}
    </button>
  );
}

function foldPropsFromData(data: NodeProps["data"]) {
  return {
    foldable: Boolean(data.foldable),
    folded: Boolean(data.folded),
    hiddenCount: typeof data.hiddenCount === "number" ? data.hiddenCount : 0,
    directHiddenCount: typeof data.directHiddenCount === "number" ? data.directHiddenCount : 0,
    onToggleFold: typeof data.onToggleFold === "function" ? (data.onToggleFold as () => void) : undefined,
  };
}

function selectHandlerFromData(data: NodeProps["data"]): (() => void) | undefined {
  return typeof data.onSelect === "function" ? (data.onSelect as () => void) : undefined;
}

function NodeCard({
  primary,
  primaryHint,
  documentationUrl,
  lines,
  counts,
  badge,
  className,
  direction,
  foldable,
  folded,
  hiddenCount,
  directHiddenCount,
  onToggleFold,
  detailsHref,
  selected,
  onSelect,
  tooltip,
}: {
  primary: string;
  primaryHint?: string;
  documentationUrl?: string;
  lines: NodeCardLine[];
  counts?: NodeCardCount[];
  badge?: string;
  className: string;
  direction: LayoutDirection;
  foldable?: boolean;
  folded?: boolean;
  hiddenCount?: number;
  directHiddenCount?: number;
  onToggleFold?: () => void;
  detailsHref?: string;
  selected?: boolean;
  onSelect?: () => void;
  tooltip?: string;
}) {
  const isRight = direction === "RIGHT";
  const targetPosition = isRight ? Position.Left : Position.Top;
  const sourcePosition = isRight ? Position.Right : Position.Bottom;
  const copyText = [
    primary,
    primaryHint,
    ...lines.map((line) => (line.label ? `${line.label}: ${line.text}` : line.text)),
    ...(counts ?? []).map((c) => `${c.count} ${c.label}`),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className={`node-card ${className}${selected ? " node-selected" : ""}`}
      style={{ width: DEFAULT_NODE_WIDTH }}
      title={tooltip || undefined}>
      <Handle type="target" position={targetPosition} />
      <div className="node-card-text nodrag">
        <div className="node-card-primary">
          {documentationUrl ? (
            <a href={documentationUrl} target="_blank" rel="noopener noreferrer" className="nodrag nopan">
              {primary}
            </a>
          ) : (
            primary
          )}
          {primaryHint && <span className="node-card-primary-hint"> {primaryHint}</span>}
        </div>
        {lines.map((line, index) => (
          <div key={index} className={line.muted ? "node-card-line muted" : "node-card-line"}>
            {line.label && <span className="node-card-line-label">{line.label}: </span>}
            {line.href ? (
              <Link to={line.href} className="nodrag nopan">
                {line.text}
              </Link>
            ) : (
              line.text
            )}
          </div>
        ))}
        {counts && counts.length > 0 && (
          <div className="node-card-counts">
            {counts.map((c, index) =>
              c.href ? (
                <Link
                  key={index}
                  to={c.href}
                  className="node-card-count nodrag nopan"
                  title={`${c.count} ${c.label}`}
                  aria-label={`${c.count} ${c.label}`}
                >
                  <span aria-hidden="true">{c.icon}</span>
                  {c.count}
                </Link>
              ) : (
                <span
                  key={index}
                  className="node-card-count"
                  title={`${c.count} ${c.label}`}
                  aria-label={`${c.count} ${c.label}`}
                >
                  <span aria-hidden="true">{c.icon}</span>
                  {c.count}
                </span>
              )
            )}
          </div>
        )}
      </div>
      {badge && <span className="node-card-badge">{badge}</span>}
      <CopyButton className="node-card-copy" getText={() => copyText} label={`Copy ${primary}`} />
      {onSelect && (
        <button
          type="button"
          className="copy-button node-card-select nodrag nopan"
          aria-label={`Select ${primary}`}
          title={`Select ${primary}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          ⌖
        </button>
      )}
      {detailsHref && (
        <Link to={detailsHref} className="node-card-details nodrag nopan" aria-label={`View details for ${primary}`}>
          ↗
        </Link>
      )}
      <Handle type="source" position={sourcePosition} />
      {foldable && onToggleFold && (
        <FoldToggle
          folded={Boolean(folded)}
          hiddenCount={hiddenCount ?? 0}
          directHiddenCount={directHiddenCount ?? 0}
          onToggle={onToggleFold}
          direction={direction}
        />
      )}
    </div>
  );
}

export function TeamNode({ id, data }: NodeProps) {
  const direction = directionFromData(data);
  const type = typeof data.type === "string" ? data.type : "";
  const description = typeof data.description === "string" ? data.description : "";
  const lines: NodeCardLine[] = [];
  if (description) lines.push({ text: description, muted: true });

  return (
    <NodeCard
      primary={String(data.label ?? "")}
      primaryHint={type || undefined}
      documentationUrl={typeof data.documentationUrl === "string" ? data.documentationUrl : undefined}
      lines={lines}
      className="node-team"
      direction={direction}
      detailsHref={detailsHrefForNodeId(id)}
      selected={Boolean(data.selected)}
      onSelect={selectHandlerFromData(data)}
      tooltip={description || undefined}
      {...foldPropsFromData(data)}
    />
  );
}

export function PersonNode({ id, data }: NodeProps) {
  const direction = directionFromData(data);
  const lines: NodeCardLine[] = [];
  if (typeof data.teamName === "string" && data.teamName) {
    lines.push({ label: "Unit", text: data.teamName });
  }
  if (typeof data.primaryTitle === "string" && data.primaryTitle) {
    lines.push({ label: "Role", text: data.primaryTitle });
  }
  const secondaryTitles = Array.isArray(data.secondaryTitles) ? (data.secondaryTitles as string[]) : [];
  for (const title of secondaryTitles) {
    lines.push({ text: title, muted: true });
  }
  if (typeof data.positionTitle === "string" && data.positionTitle) {
    lines.push({ label: "Position", text: data.positionTitle });
  }

  return (
    <NodeCard
      primary={String(data.label ?? "")}
      documentationUrl={typeof data.documentationUrl === "string" ? data.documentationUrl : undefined}
      lines={lines}
      className="node-person"
      direction={direction}
      detailsHref={detailsHrefForNodeId(id)}
      selected={Boolean(data.selected)}
      onSelect={selectHandlerFromData(data)}
      {...foldPropsFromData(data)}
    />
  );
}

export function ComponentNode({ id, data }: NodeProps) {
  const direction = directionFromData(data);
  const type = typeof data.type === "string" ? data.type : "";
  const lines: NodeCardLine[] = [];
  if (type) lines.push({ text: type });

  const ownerTeamId = typeof data.ownerTeamId === "string" ? data.ownerTeamId : undefined;
  if (ownerTeamId) {
    const ownerTeamName = typeof data.ownerTeamName === "string" ? data.ownerTeamName : ownerTeamId;
    lines.push({ text: ownerTeamName, href: `/views/org-tree?teamId=${encodeURIComponent(ownerTeamId)}` });
  }

  const componentId = id.startsWith("component:") ? id.slice("component:".length) : id;
  const dependenciesHref = `/views/component-dependencies?componentId=${encodeURIComponent(componentId)}`;
  // → direct dependencies, ⇒ all dependencies (direct + transitive), ← direct dependees,
  // ⇐ all dependees (direct + transitive).
  const countSpecs: Array<[string, string, unknown]> = [
    ["→", "direct dependencies", data.directDependencies],
    ["⇒", "all dependencies", data.transitiveDependencies],
    ["←", "direct dependees", data.directDependees],
    ["⇐", "all dependees", data.transitiveDependees],
  ];
  const counts: NodeCardCount[] = [];
  for (const [icon, label, count] of countSpecs) {
    if (typeof count !== "number") continue;
    counts.push({ icon, count, label, href: dependenciesHref });
  }

  return (
    <NodeCard
      primary={String(data.label ?? "")}
      documentationUrl={typeof data.documentationUrl === "string" ? data.documentationUrl : undefined}
      lines={lines}
      counts={counts}
      badge={data.isEndUserFacing ? "end-user-facing" : undefined}
      className="node-component"
      direction={direction}
      detailsHref={detailsHrefForNodeId(id)}
      selected={Boolean(data.selected)}
      onSelect={selectHandlerFromData(data)}
      {...foldPropsFromData(data)}
    />
  );
}

export const nodeTypes = { team: TeamNode, person: PersonNode, component: ComponentNode };
