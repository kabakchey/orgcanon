import type { EntityType } from "./orgapi/client";

/** Null when no orgviewer URL is configured, in which case nothing is linked. */
export function entityUrl(orgviewerUrl: string | undefined, type: EntityType, id: string): string | null {
  if (!orgviewerUrl) return null;
  return `${orgviewerUrl.replace(/\/+$/, "")}/#/entities/${type}?id=${encodeURIComponent(id)}`;
}
