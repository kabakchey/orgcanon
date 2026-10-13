import { createContext, useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Link } from "react-router-dom";
import { DEFAULT_NODE_WIDTH, type LayoutDirection } from "../lib/layout/elk-layout";
import {
  DEPENDENCY_COUNTS,
  type ComponentFlowNode,
  type FlowNode,
  type PersonFlowNode,
  type TeamFlowNode,
} from "../lib/relationships/flow-elements";
import type { OrgData } from "../lib/orgapi/types";
import { componentDependenciesHref, entityHref, orgTreeHref } from "../lib/routes";
import { CopyButton } from "./copy-button";

export const LayoutDirectionContext = createContext<LayoutDirection>("DOWN");

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

const ENTITY_KEY_BY_NODE_TYPE: Record<string, keyof OrgData> = {
  team: "teams",
  person: "people",
  component: "components",
};

function detailsHrefForNodeId(nodeId: string): string | undefined {
  const [nodeType, ...rest] = nodeId.split(":");
  const entityKey = nodeType ? ENTITY_KEY_BY_NODE_TYPE[nodeType] : undefined;
  const id = rest.join(":");
  if (!entityKey || !id) return undefined;
  return entityHref(entityKey, id);
}

function FoldToggle({
  folded,
  hiddenCount,
  directHiddenCount,
  onToggle,
}: {
  folded: boolean;
  hiddenCount: number;
  directHiddenCount: number;
  onToggle: () => void;
}) {
  const direction = useContext(LayoutDirectionContext);
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

function cardControls({ selected, onSelect, foldable, folded, hiddenCount, directHiddenCount, onToggleFold }: FlowNode["data"]) {
  return { selected, onSelect, foldable, folded, hiddenCount, directHiddenCount, onToggleFold };
}

function NodeCard({
  primary,
  primaryHint,
  documentationUrl,
  lines,
  counts,
  badge,
  className,
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
  const isRight = useContext(LayoutDirectionContext) === "RIGHT";
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
        />
      )}
    </div>
  );
}

export function TeamNode({ id, data }: NodeProps<TeamFlowNode>) {
  return (
    <NodeCard
      primary={data.label}
      primaryHint={data.type || undefined}
      documentationUrl={data.documentationUrl}
      lines={data.description ? [{ text: data.description, muted: true }] : []}
      className="node-team"
      detailsHref={detailsHrefForNodeId(id)}
      tooltip={data.description || undefined}
      {...cardControls(data)}
    />
  );
}

export function PersonNode({ id, data }: NodeProps<PersonFlowNode>) {
  const lines: NodeCardLine[] = [];
  if (data.teamName) lines.push({ label: "Unit", text: data.teamName });
  if (data.primaryTitle) lines.push({ label: "Role", text: data.primaryTitle });
  for (const title of data.secondaryTitles ?? []) {
    lines.push({ text: title, muted: true });
  }
  if (data.positionTitle) lines.push({ label: "Position", text: data.positionTitle });

  return (
    <NodeCard
      primary={data.label}
      documentationUrl={data.documentationUrl}
      lines={lines}
      className="node-person"
      detailsHref={detailsHrefForNodeId(id)}
      {...cardControls(data)}
    />
  );
}

export function ComponentNode({ id, data }: NodeProps<ComponentFlowNode>) {
  const lines: NodeCardLine[] = [];
  if (data.type) lines.push({ text: data.type });
  if (data.ownerTeamId) {
    lines.push({
      text: data.ownerTeamName ?? data.ownerTeamId,
      href: orgTreeHref(data.ownerTeamId),
    });
  }

  const componentId = id.startsWith("component:") ? id.slice("component:".length) : id;
  const dependenciesHref = componentDependenciesHref(componentId);
  const counts = DEPENDENCY_COUNTS.flatMap(({ icon, label, field }) => {
    const count = data[field];
    return count === undefined ? [] : [{ icon, count, label, href: dependenciesHref }];
  });

  return (
    <NodeCard
      primary={data.label}
      documentationUrl={data.documentationUrl}
      lines={lines}
      counts={counts}
      badge={data.isEndUserFacing ? "end-user-facing" : undefined}
      className="node-component"
      detailsHref={detailsHrefForNodeId(id)}
      {...cardControls(data)}
    />
  );
}

export const nodeTypes = { team: TeamNode, person: PersonNode, component: ComponentNode };
