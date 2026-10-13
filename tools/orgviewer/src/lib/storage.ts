// Storage can be unavailable (private mode, blocked site data) or hold something unreadable.
// Either only costs the user a remembered preference, so reads fall back to null and writes are
// dropped.

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readStoredJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // See the top of this file.
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  writeStored(key, JSON.stringify(value));
}
