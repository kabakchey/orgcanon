import { ToolbarToggle } from "../components/toolbar-toggle";
import { componentDependenciesToFlow } from "../lib/relationships/component-dependencies-to-flow";
import { componentTree } from "../lib/picker/tree";
import { useBooleanParam } from "../lib/use-boolean-param";
import { PickerGraphView } from "./picker-graph-view";

export function ComponentDependenciesView() {
  const [transitive, setTransitive] = useBooleanParam("transitive", false);
  const mode = transitive ? "transitive" : "direct";

  return (
    <PickerGraphView
      slug="component-dependencies"
      load={["components", "teams"]}
      picked="components"
      tree={(data) => componentTree(data.teams, data.components)}
      graph={(componentId, data) => componentDependenciesToFlow(componentId, data.components, data.teams, mode)}
      variant={mode}
      toolbar={
        <ToolbarToggle checked={transitive} onChange={setTransitive}>
          Show transitive dependencies
        </ToolbarToggle>
      }
      direction="RIGHT"
      emptyMessage="Select a component above to see its dependencies."
    />
  );
}
