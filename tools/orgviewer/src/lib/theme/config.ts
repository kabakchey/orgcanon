import { readStored, writeStored } from "../storage";

export type Theme = "light" | "dark";

const STORAGE_KEY = "orgviewer-theme";

export function getStoredTheme(): Theme | null {
  const value = readStored(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function setStoredTheme(theme: Theme): void {
  writeStored(STORAGE_KEY, theme);
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}
