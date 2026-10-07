import React from "react";
import ForgeReconciler, { Text, useConfig } from "@forge/react";
import { parseEntityConfig } from "../entity/config";
import { unavailable } from "../entity/resolve";
import { entitySegments } from "../entity/segments";
import type { EntityConfig, EntityView } from "../entity/types";
import { Segments } from "./segments";
import { useResolved } from "./use-resolved";

function Entity({ config }: { config: EntityConfig }) {
  const view = useResolved<EntityConfig, EntityView>("resolveEntity", config, unavailable);
  if (!view) return <Text>{config.name} (…)</Text>;
  return <Segments segments={entitySegments(view)} />;
}

function App() {
  const config = parseEntityConfig(useConfig());
  return config ? <Entity config={config} /> : <Text>OrgCanon entity: edit this macro to pick one</Text>;
}

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
