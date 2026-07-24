import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "../../../src/lib/theme/use-theme";
import { getStoredTheme } from "../../../src/lib/theme/config";

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      current: {theme}
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTheme", () => {
  it("applies the resolved initial theme to the document root", () => {
    stubMatchMedia(true);
    render(<ThemeProbe />);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByText("current: dark")).toBeInTheDocument();
  });

  it("toggles the theme, updates the document root, and persists the choice", async () => {
    stubMatchMedia(false);
    render(<ThemeProbe />);

    await userEvent.click(screen.getByText("current: light"));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getStoredTheme()).toBe("dark");
  });
});
