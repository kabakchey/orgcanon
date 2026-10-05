import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEntityCache } from "../../src/lib/orgapi/cache";
import { installMockOrgapiFetch } from "../fixtures/mock-orgapi-fetch";

const { downloadTextFile } = vi.hoisted(() => ({ downloadTextFile: vi.fn() }));
vi.mock("../../src/lib/export/download-text-file", () => ({ downloadTextFile }));

import { EntitiesView } from "../../src/views/entities-view";

function renderAt(search: string) {
  installMockOrgapiFetch();
  return render(
    <MemoryRouter initialEntries={[`/views/entities${search}`]}>
      <EntitiesView />
    </MemoryRouter>
  );
}

const headerKeys = () =>
  screen
    .getAllByRole("columnheader")
    .map((header) => header.textContent);

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
  downloadTextFile.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EntitiesView", () => {
  it("opens on people, with a tab per entity type", async () => {
    renderAt("");

    expect(await screen.findByText("5 of 5 people")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "people" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "authority_line_types" })).toHaveAttribute(
      "href",
      "/views/entities?entity=authority_line_types"
    );
    expect(screen.getByRole("link", { name: "alice-nguyen" })).toHaveAttribute(
      "href",
      "/entities/people?id=alice-nguyen"
    );
  });

  it("shows the columns named in the URL, in that order", async () => {
    renderAt("?entity=teams&cols=name,id,head");

    await screen.findByText("3 of 3 teams");
    expect(headerKeys()).toEqual(["name", "id", "head"]);
  });

  it("hides flattened, object-list and description columns by default", async () => {
    renderAt("?entity=teams");

    await screen.findByText("3 of 3 teams");
    const keys = headerKeys();
    expect(keys[0]).toBe("id");
    expect(keys).toContain("head");
    expect(keys).not.toContain("description");
    expect(keys).not.toContain("members");
    expect(keys).not.toContain("reviewable.owner");
  });

  it("narrows the rows as a filter is typed", async () => {
    renderAt("?entity=teams&cols=id,name,head");
    await screen.findByText("3 of 3 teams");

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter head" }), "alice");

    expect(await screen.findByText("1 of 3 teams")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "platform-squad" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "potuto" })).not.toBeInTheDocument();
  });

  it("sorts by the column in the URL", async () => {
    renderAt("?entity=teams&cols=id,name&sort=-name");
    await screen.findByText("3 of 3 teams");

    expect(screen.getAllByRole("row")[2]).toHaveTextContent("r-and-d");
  });

  it("exports exactly the visible columns and shown rows as CSV", async () => {
    renderAt("?entity=teams&cols=name,id,head&f.head=alice");
    await screen.findByText("1 of 3 teams");

    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      "teams.csv",
      "﻿name,id,head\r\nPlatform Squad,platform-squad,alice-nguyen\r\n",
      "text/csv;charset=utf-8"
    );
  });

  it("keeps the filters on screen and disables export when nothing matches", async () => {
    renderAt("?entity=teams&cols=id,name&f.name=zzz");

    expect(await screen.findByText("0 of 3 teams")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    expect(screen.getByRole("searchbox", { name: "Filter name" })).toHaveValue("zzz");
    expect(screen.getByText("No matching rows.")).toBeInTheDocument();
  });

  it("drops a hidden column's filter and remembers the new layout for that entity type", async () => {
    renderAt("?entity=teams&cols=id,name,head&f.head=alice");
    await screen.findByText("1 of 3 teams");

    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "head" }));

    expect(await screen.findByText("3 of 3 teams")).toBeInTheDocument();
    expect(headerKeys()).toEqual(["id", "name"]);
    expect(JSON.parse(localStorage.getItem("orgviewer-entities-columns:teams")!)).toEqual(["id", "name"]);
  });

  it("carries a remembered layout in that entity type's tab link", async () => {
    localStorage.setItem("orgviewer-entities-columns:teams", JSON.stringify(["id", "name"]));
    renderAt("");
    await screen.findByText("5 of 5 people");

    expect(screen.getByRole("link", { name: "teams" })).toHaveAttribute(
      "href",
      "/views/entities?entity=teams&cols=id%2Cname"
    );
  });

  it("resets to the default layout and forgets the remembered one", async () => {
    localStorage.setItem("orgviewer-entities-columns:teams", JSON.stringify(["id", "name"]));
    renderAt("?entity=teams&cols=id,name");
    await screen.findByText("3 of 3 teams");

    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset to default" }));

    await waitFor(() => expect(headerKeys()).toContain("head"));
    expect(localStorage.getItem("orgviewer-entities-columns:teams")).toBeNull();
  });

  it("clears the filter boxes when a tab link drops the filters", async () => {
    renderAt("?entity=teams&cols=id,name,head");
    await screen.findByText("3 of 3 teams");
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter head" }), "alice");
    await screen.findByText("1 of 3 teams");

    await userEvent.click(screen.getByRole("link", { name: "teams" }));

    expect(await screen.findByText("3 of 3 teams")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Filter head" })).toHaveValue("");
  });

  it("rejects an unknown entity type without fetching", () => {
    const { container } = renderAt("?entity=bogus");

    expect(screen.getByText("Unknown entity type.")).toBeInTheDocument();
    expect(container.querySelector("table")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
