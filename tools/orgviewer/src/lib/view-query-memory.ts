import { viewPath } from "./routes";
import { readStored, writeStored } from "./storage";

function storageKeyFor(slug: string): string {
  return `orgviewer-view-query:${slug}`;
}

export function viewHref(slug: string): string {
  const search = readStored(storageKeyFor(slug)) ?? "";
  return `${viewPath(slug)}${search.startsWith("?") ? search : ""}`;
}

export function rememberViewQuery(slug: string, search: string): void {
  writeStored(storageKeyFor(slug), search || null);
}
