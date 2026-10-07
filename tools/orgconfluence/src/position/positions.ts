import type { Holding } from "../orgapi/client";
import type { Position } from "./types";

function positionOf(holding: Holding): Position | null {
  if (holding.kind === "head") {
    return holding.deputy_for === null ? { kind: "head", id: "", text: holding.title ?? "Head" } : null;
  }
  if (holding.kind === "role") {
    return { kind: "role", id: holding.role ?? "", text: holding.role_name ?? "" };
  }
  return {
    kind: "authority_line",
    id: holding.authority_line_type ?? "",
    text: holding.authority_line_type_title ?? "",
  };
}

/** The distinct positions held on a team, in the order orgapi lists its holdings. */
export function positionsOf(holdings: Holding[]): Position[] {
  const positions = new Map<string, Position>();
  for (const holding of holdings) {
    const position = positionOf(holding);
    if (position && !positions.has(`${position.kind}/${position.id}`)) {
      positions.set(`${position.kind}/${position.id}`, position);
    }
  }
  return [...positions.values()];
}
