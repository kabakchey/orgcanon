import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  resolveInitialTheme,
} from "../../../src/lib/theme/config";

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStoredTheme / setStoredTheme", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("round-trips a stored value", () => {
    setStoredTheme("dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("ignores a corrupted stored value", () => {
    localStorage.setItem("orgviewer-theme", "not-a-theme");
    expect(getStoredTheme()).toBeNull();
  });
});

describe("getSystemTheme", () => {
  it("returns dark when the OS prefers dark", () => {
    stubMatchMedia(true);
    expect(getSystemTheme()).toBe("dark");
  });

  it("returns light when the OS prefers light", () => {
    stubMatchMedia(false);
    expect(getSystemTheme()).toBe("light");
  });
});

describe("resolveInitialTheme", () => {
  it("prefers a stored theme over the OS preference", () => {
    stubMatchMedia(true);
    setStoredTheme("light");
    expect(resolveInitialTheme()).toBe("light");
  });

  it("falls back to the OS preference when nothing is stored", () => {
    stubMatchMedia(true);
    expect(resolveInitialTheme()).toBe("dark");
  });
});
