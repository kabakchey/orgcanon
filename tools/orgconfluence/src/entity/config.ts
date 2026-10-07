import { ENTITY_TYPES } from "../orgapi/client";
import type { EntityConfig } from "./types";

/** Null for a macro nobody has configured yet, or whose stored config is not one this app wrote. */
export function parseEntityConfig(raw: unknown): EntityConfig | null {
  const stored = (raw ?? {}) as Record<string, unknown>;
  const type = ENTITY_TYPES.find((candidate) => candidate === stored.type);
  if (!type || typeof stored.id !== "string" || !stored.id) return null;
  return { type, id: stored.id, name: typeof stored.name === "string" ? stored.name : "" };
}
