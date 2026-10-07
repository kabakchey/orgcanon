import { linked, merged, person, type Segment } from "../segments";
import type { HolderView, PositionView } from "./types";

function holderSegments(holder: HolderView): Segment[] {
  const segments = [...person(holder)];
  if (holder.isInterim) segments.push({ text: ", interim" });
  if (holder.deputy) {
    segments.push({ text: holder.deputy.isInterim ? ", interim deputy " : ", deputy " }, ...person(holder.deputy));
  }
  return segments;
}

export function toSegments(view: PositionView): Segment[] {
  if (view.status === "unknown") {
    return [{ text: `⚠ unknown position: ${view.team} / ${view.position || "head"}` }];
  }
  if (view.status === "unavailable") return [{ text: `${view.text} (⚠ unavailable)` }];

  const position = linked(view.text, view.teamUrl);
  if (view.status === "vacant") return merged([position, { text: " (vacant)" }]);

  const holders = view.people.map(holderSegments);
  // A holder that is more than a bare name already contains commas, so holders need a stronger separator.
  const separator = view.people.some((holder) => holder.isInterim || holder.deputy) ? "; " : ", ";
  return merged([
    position,
    { text: " (" },
    ...holders.flatMap((segments, index) => (index === 0 ? segments : [{ text: separator }, ...segments])),
    { text: ")" },
  ]);
}
