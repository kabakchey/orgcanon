import { ToolbarToggle } from "../components/toolbar-toggle";
import { teamComponentsToFlow } from "../lib/relationships/team-components-to-flow";
import { teamTree } from "../lib/picker/tree";
import { useBooleanParam } from "../lib/use-boolean-param";
import { PickerGraphView } from "./picker-graph-view";

export function TeamComponentsView() {
  const [indirect, setIndirect] = useBooleanParam("indirect", false);
  const mode = indirect ? "indirect" : "direct";

  return (
    <PickerGraphView
      slug="team-components"
      // Every component, not one team's: each card's dependency counts need the full dependency
      // graph, and indirect mode spans several teams.
      load={["teams", "components"]}
      picked="teams"
      tree={(data) => teamTree(data.teams)}
      graph={(teamId, data) => teamComponentsToFlow(teamId, data.teams, data.components, mode)}
      variant={mode}
      toolbar={
        <ToolbarToggle checked={indirect} onChange={setIndirect}>
          Include components owned by subteams
        </ToolbarToggle>
      }
      emptyMessage="Select a team above to see the components it owns."
    />
  );
}
