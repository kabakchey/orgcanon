import type { MacroConfig, PositionKind, Show } from "./types";

const KINDS: readonly PositionKind[] = ["head", "role", "authority_line"];
const SHOWS: readonly Show[] = ["holder", "deputy", "both"];

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Null for a macro nobody has configured yet, or whose stored config is not one this app wrote. */
export function parseConfig(raw: unknown): MacroConfig | null {
  const stored = (raw ?? {}) as Record<string, unknown>;
  const kind = KINDS.find((candidate) => candidate === stored.kind);
  const team = text(stored.team);
  const positionId = text(stored.positionId);
  if (!kind || !team || (kind !== "head" && !positionId)) return null;
  return {
    team,
    kind,
    positionId,
    positionText: text(stored.positionText),
    show: SHOWS.find((candidate) => candidate === stored.show) ?? "holder",
    override: text(stored.override).trim(),
  };
}
