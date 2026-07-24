import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../../src/components/app-layout";

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
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppLayout", () => {
  it("renders a link to home plus every registered view", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppLayout>{null}</AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Org Viewer" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Org Tree" })).toHaveAttribute("href", "/views/org-tree");
    expect(screen.getByRole("link", { name: "Component Dependencies" })).toHaveAttribute(
      "href",
      "/views/component-dependencies"
    );
  });

  it("marks the current view's link as active and leaves others inactive", () => {
    render(
      <MemoryRouter initialEntries={["/views/org-tree"]}>
        <AppLayout>{null}</AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Org Tree" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Chain of Command" })).not.toHaveClass("active");
  });

  it("toggles the theme via the header button", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppLayout>{null}</AppLayout>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: /dark/i }));

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("renders children inside the content area", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppLayout>
          <p>page body</p>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("page body")).toBeInTheDocument();
  });
});
