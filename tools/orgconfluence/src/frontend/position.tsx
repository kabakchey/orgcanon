import React from "react";
import ForgeReconciler, { Text, useConfig } from "@forge/react";
import { parseConfig } from "../position/config";
import { unavailable } from "../position/resolve";
import { toSegments } from "../position/segments";
import type { MacroConfig, PositionView } from "../position/types";
import { Segments } from "./segments";
import { useResolved } from "./use-resolved";

function Position({ config }: { config: MacroConfig }) {
  const view = useResolved<MacroConfig, PositionView>("resolvePosition", config, unavailable);
  if (!view) return <Text>{config.override || config.positionText} (…)</Text>;
  return <Segments segments={toSegments(view)} />;
}

function App() {
  const config = parseConfig(useConfig());
  return config ? <Position config={config} /> : <Text>OrgCanon position: edit this macro to pick one</Text>;
}

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
