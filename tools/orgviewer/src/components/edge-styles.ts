export const EDGE_STYLE = {
  parentChild: { stroke: "var(--edge-parent-child)", strokeWidth: 2 },
  nonHierarchical: { stroke: "var(--edge-non-hierarchical)", strokeWidth: 2, strokeDasharray: "10 5" },
  membership: { stroke: "var(--edge-membership)", strokeWidth: 1, strokeDasharray: "2 2" },
  lineManagement: { stroke: "var(--edge-line-management)", strokeWidth: 2, strokeDasharray: "6 3" },
  lineManagementNonHierarchical: { stroke: "var(--edge-non-hierarchical)", strokeWidth: 2, strokeDasharray: "10 4 2 4" },
  authority: { stroke: "var(--edge-authority)", strokeWidth: 2, strokeDasharray: "2 4" },
  ownership: { stroke: "var(--edge-ownership)", strokeWidth: 1.5, strokeDasharray: "1 3" },
  dependency: { stroke: "var(--edge-dependency)", strokeWidth: 2 },
} as const;

export function lineManagementStyle(hierarchical: boolean) {
  return hierarchical ? EDGE_STYLE.lineManagement : EDGE_STYLE.lineManagementNonHierarchical;
}
