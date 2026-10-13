import { authorityOverToFlow } from "../lib/relationships/authority-over-to-flow";
import { teamTree } from "../lib/picker/tree";
import { PickerGraphView } from "./picker-graph-view";

export function AuthorityOverView() {
  return (
    <PickerGraphView
      slug="authority-over"
      load={["teams", "people", "authority_lines", "authority_line_types"]}
      picked="teams"
      tree={(data) => teamTree(data.teams)}
      graph={(teamId, data) =>
        authorityOverToFlow(teamId, data.teams, data.people, data.authority_lines, data.authority_line_types)
      }
      emptyMessage="Select a team above to see who holds authority over it."
    />
  );
}
