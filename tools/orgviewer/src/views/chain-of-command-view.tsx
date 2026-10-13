import type { Edge } from "@xyflow/react";
import { chainOfCommandToFlow } from "../lib/relationships/chain-of-command-to-flow";
import { lineManagementTree } from "../lib/picker/tree";
import { PickerGraphView } from "./picker-graph-view";

// Subordinates start folded so a manager's whole downward tree doesn't dump onto the screen the
// moment they're selected.
function managersWithReports(edges: Edge[]): Set<string> {
  return new Set(edges.filter((edge) => edge.id.startsWith("reports:")).map((edge) => edge.source));
}

export function ChainOfCommandView() {
  return (
    <PickerGraphView
      slug="chain-of-command"
      load={["teams", "people"]}
      picked="people"
      tree={(data) => lineManagementTree(data.teams, data.people)}
      graph={(personId, data) => chainOfCommandToFlow(personId, data.teams, data.people)}
      defaultFoldedNodeIds={managersWithReports}
      emptyMessage="Select a person above to see their chain of command."
    />
  );
}
