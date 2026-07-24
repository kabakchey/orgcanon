export const EDGE_STYLE = {
  parentChild: { stroke: "var(--edge-parent-child)", strokeWidth: 2 },
  membership: { stroke: "var(--edge-membership)", strokeWidth: 1, strokeDasharray: "2 2" },
  lineManagement: { stroke: "var(--edge-line-management)", strokeWidth: 2, strokeDasharray: "6 3" },
  authority: { stroke: "var(--edge-authority)", strokeWidth: 2, strokeDasharray: "2 4" },
  ownership: { stroke: "var(--edge-ownership)", strokeWidth: 1.5, strokeDasharray: "1 3" },
  dependency: { stroke: "var(--edge-dependency)", strokeWidth: 2 },
} as const;
