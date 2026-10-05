function storageKeyFor(entityKey: string): string {
  return `orgviewer-entities-columns:${entityKey}`;
}

export function loadColumnLayout(entityKey: string): string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKeyFor(entityKey)) ?? "null");
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((key) => typeof key === "string")) {
      return parsed as string[];
    }
  } catch {
    // Unavailable or corrupt storage only costs the user their saved layout.
  }
  return undefined;
}

export function saveColumnLayout(entityKey: string, keys: string[]): void {
  try {
    localStorage.setItem(storageKeyFor(entityKey), JSON.stringify(keys));
  } catch {
    // Same as above.
  }
}

export function clearColumnLayout(entityKey: string): void {
  try {
    localStorage.removeItem(storageKeyFor(entityKey));
  } catch {
    // Same as above.
  }
}
