import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEntityCache } from "../../src/lib/orgapi/cache";
import { installMockOrgapiFetch } from "../fixtures/mock-orgapi-fetch";
import { EntityPage } from "../../src/pages/entity-page";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/entities/:entityKey" element={<EntityPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  clearEntityCache();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EntityPage", () => {
  it("renders an unknown entity kind as not found, without fetching", () => {
    const fetchMock = installMockOrgapiFetch();

    renderAt("/entities/bogus-entity");

    expect(screen.getByText("Unknown entity type.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prompts for a selector when neither id nor filters are given", () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams");

    expect(screen.getByText(/Provide.*id.*or lookup filter query params/)).toBeInTheDocument();
  });

  it("rejects id combined with filter params", () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams?id=platform-squad&type=squad");

    expect(screen.getByText(/Provide either `id` or lookup filter params, not both\./)).toBeInTheDocument();
  });

  it("links the type badge back to that type's table", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams?id=platform-squad");

    const badge = await screen.findByRole("link", { name: "teams" });
    expect(badge).toHaveAttribute("href", "/views/entities?entity=teams");
  });

  it("renders the entity's own fields for a known id", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams?id=platform-squad");

    await waitFor(() => expect(screen.getByText("head")).toBeInTheDocument());
    expect(screen.getByText("alice-nguyen")).toBeInTheDocument();
  });

  it("reports not found for an unknown id", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams?id=no-such-team");

    await waitFor(() =>
      expect(screen.getByText('No teams entity with id "no-such-team".')).toBeInTheDocument()
    );
  });

  it("renders a single filter match as a one-item disambiguation list", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/roles?name=Backend%20Owner");

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByRole("link", { name: "Backend Owner" })).toHaveAttribute(
      "href",
      "/entities/roles?id=backend-owner"
    );
  });

  it("renders multiple filter matches as a disambiguation list", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/people?primary_specialization=backend");

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(3));
  });

  it("reports no matches when filters match nothing", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/people?primary_specialization=no-such-specialization");

    await waitFor(() => expect(screen.getByText("No matching people entity.")).toBeInTheDocument());
  });
});

describe("EntityPage connections", () => {
  it("shows reverse connections -- components owned by a team, and authority lines over it -- by name", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams?id=platform-squad");

    expect(await screen.findByText("Owned components")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing API" })).toHaveAttribute(
      "href",
      "/entities/components?id=billing-api"
    );
    expect(screen.getByRole("link", { name: "Billing UI" })).toHaveAttribute(
      "href",
      "/entities/components?id=billing-ui"
    );

    expect(screen.getByText("Authority lines over this team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "carol-lee-tech-lead" })).toHaveAttribute(
      "href",
      "/entities/authority_lines?id=carol-lee-tech-lead"
    );
  });

  it("shows a team's child teams as a reverse connection", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/teams?id=r-and-d");

    expect(await screen.findByText("Child teams")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Platform Squad" })).toHaveAttribute(
      "href",
      "/entities/teams?id=platform-squad"
    );
  });

  it("shows components that depend on a component, and roles that use it", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/components?id=billing-api");

    expect(await screen.findByText("Depended on by")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing UI" })).toHaveAttribute(
      "href",
      "/entities/components?id=billing-ui"
    );

    expect(screen.getByText("Used by roles")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Backend Owner" })).toHaveAttribute(
      "href",
      "/entities/roles?id=backend-owner"
    );
  });

  it("reports no connections for an entity type nothing else ever references", async () => {
    installMockOrgapiFetch();

    renderAt("/entities/authority_lines?id=carol-lee-tech-lead");

    expect(await screen.findByText("No other entities reference this one.")).toBeInTheDocument();
  });
});
