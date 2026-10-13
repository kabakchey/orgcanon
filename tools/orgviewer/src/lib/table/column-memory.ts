import { readStoredJson, writeStored, writeStoredJson } from "../storage";

function storageKeyFor(entityKey: string): string {
  return `orgviewer-entities-columns:${entityKey}`;
}

export function loadColumnLayout(entityKey: string): string[] | undefined {
  const stored = readStoredJson(storageKeyFor(entityKey));
  const valid = Array.isArray(stored) && stored.length > 0 && stored.every((key) => typeof key === "string");
  return valid ? (stored as string[]) : undefined;
}

export function saveColumnLayout(entityKey: string, keys: string[]): void {
  writeStoredJson(storageKeyFor(entityKey), keys);
}

export function clearColumnLayout(entityKey: string): void {
  writeStored(storageKeyFor(entityKey), null);
}
