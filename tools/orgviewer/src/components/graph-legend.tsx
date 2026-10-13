import { useId, type CSSProperties } from "react";
import type { Edge } from "@xyflow/react";
import { EDGE_STYLE } from "../lib/relationships/edge-styles";
import { useBooleanParam } from "../lib/use-boolean-param";

type EdgeStyle = (typeof EDGE_STYLE)[keyof typeof EDGE_STYLE];

const LEGEND: { style: EdgeStyle; label: string }[] = [
  { style: EDGE_STYLE.parentChild, label: "Parent team" },
  { style: EDGE_STYLE.nonHierarchical, label: "Parent team (non-hierarchical)" },
  { style: EDGE_STYLE.membership, label: "Team membership" },
  { style: EDGE_STYLE.lineManagement, label: "Line management" },
  { style: EDGE_STYLE.lineManagementNonHierarchical, label: "Line management (non-hierarchical)" },
  { style: EDGE_STYLE.authority, label: "Authority" },
  { style: EDGE_STYLE.ownership, label: "Ownership" },
  { style: EDGE_STYLE.dependency, label: "Dependency" },
];

// Matched by look rather than object identity, so an edge whose style was copied still counts.
function sameLine(a: CSSProperties | undefined, b: EdgeStyle): boolean {
  return a?.stroke === b.stroke && a?.strokeDasharray === ("strokeDasharray" in b ? b.strokeDasharray : undefined);
}

export function legendEntries(edges: Edge[]): typeof LEGEND {
  return LEGEND.filter((entry) => edges.some((edge) => sameLine(edge.style, entry.style)));
}

export function GraphLegend({ edges }: { edges: Edge[] }) {
  const [open, setOpen] = useBooleanParam("legend", true);
  const titleId = useId();
  const entries = legendEntries(edges);
  if (entries.length === 0) return null;

  return (
    <section className="graph-legend" aria-labelledby={titleId}>
      <button
        type="button"
        id={titleId}
        className="graph-legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> Legend
      </button>
      {open && (
        <ul className="graph-legend-list">
          {entries.map(({ style, label }) => (
            <li key={label} className="graph-legend-row">
              <svg width="36" height="10" aria-hidden="true">
                <line x1="1" y1="5" x2="35" y2="5" style={style} />
              </svg>
              {label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
