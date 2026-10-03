import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { HomePage } from "../../src/pages/home-page";

beforeEach(() => {
  localStorage.clear();
});

describe("HomePage", () => {
  it("links each view to the query string it was last left with", () => {
    localStorage.setItem("orgviewer-view-query:chain-of-command", "?personId=carol-lee");

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Chain of Command" })).toHaveAttribute(
      "href",
      "/views/chain-of-command?personId=carol-lee"
    );
    expect(screen.getByRole("link", { name: "Org Tree" })).toHaveAttribute("href", "/views/org-tree");
  });
});
