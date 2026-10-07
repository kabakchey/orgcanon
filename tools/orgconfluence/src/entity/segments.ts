import { linked, merged, person, type Segment } from "../segments";
import { ENTITY_LABELS } from "./names";
import type { EntityView } from "./types";

export function entitySegments(view: EntityView): Segment[] {
  if (view.status === "unknown") return [{ text: `⚠ unknown ${ENTITY_LABELS[view.type]}: ${view.id}` }];
  if (view.status === "unavailable") return [{ text: `${view.name} (⚠ unavailable)` }];

  if (!view.holder) return person(view);
  return merged([
    linked(view.name, view.url),
    { text: " (" },
    ...person(view.holder),
    { text: view.note ? `, ${view.note})` : ")" },
  ]);
}
