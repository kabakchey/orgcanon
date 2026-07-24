import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { EntityFieldValue } from "../../src/components/entity-field-value";

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("EntityFieldValue", () => {
  it("renders a reviewable block with owner, expiration, and notes", () => {
    renderWithRouter(
      <EntityFieldValue
        entityKey="people"
        field="reviewable"
        value={{ owner: "cto", expiration_date: "2027-01-01", notes: "Some notes." }}
      />
    );

    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("cto")).toBeInTheDocument();
    expect(screen.getByText("2027-01-01")).toBeInTheDocument();
    expect(screen.getByText("Some notes.")).toBeInTheDocument();
  });

  it("renders a dated list of positions, using 'present' for a null end_date", () => {
    renderWithRouter(
      <EntityFieldValue
        entityKey="people"
        field="positions"
        value={[
          {
            type: "vp-of-engineering",
            title: "VP of Engineering",
            start_date: "2024-01-01",
            end_date: null,
            reviewable: { owner: "cto", expiration_date: "2027-01-01", notes: "" },
          },
        ]}
      />
    );

    expect(screen.getByText(/VP of Engineering/)).toBeInTheDocument();
    expect(screen.getByText(/present/)).toBeInTheDocument();
  });

  it("renders documentation_url as a link", () => {
    renderWithRouter(
      <EntityFieldValue entityKey="teams" field="documentation_url" value="https://example.com/teams/potuto" />
    );
    expect(screen.getByRole("link", { name: "https://example.com/teams/potuto" })).toHaveAttribute(
      "href",
      "https://example.com/teams/potuto"
    );
  });

  it("renders external_references as a key: value list", () => {
    renderWithRouter(
      <EntityFieldValue entityKey="people" field="external_references" value={{ github_accountname: "alicen" }} />
    );
    expect(screen.getByText("github_accountname: alicen")).toBeInTheDocument();
  });

  it("falls back to an em dash for null/undefined", () => {
    const { container } = renderWithRouter(<EntityFieldValue entityKey="teams" field="head_deputy" value={null} />);
    expect(container).toHaveTextContent("—");
  });
});

describe("EntityFieldValue relational fields", () => {
  it("renders a scalar foreign key as a link into the target collection", () => {
    renderWithRouter(<EntityFieldValue entityKey="teams" field="head" value="alice-nguyen" />);
    expect(screen.getByRole("link", { name: "alice-nguyen" })).toHaveAttribute(
      "href",
      "/entities/people?id=alice-nguyen"
    );
  });

  it("renders an array-valued foreign key as a list of links", () => {
    renderWithRouter(<EntityFieldValue entityKey="authority_lines" field="teams" value={["platform-squad"]} />);
    expect(screen.getByRole("link", { name: "platform-squad" })).toHaveAttribute(
      "href",
      "/entities/teams?id=platform-squad"
    );
  });

  it("renders a non-relational field unaffected, even on an entity key with relational fields", () => {
    renderWithRouter(<EntityFieldValue entityKey="teams" field="description" value="Owns billing." />);
    expect(screen.getByText("Owns billing.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders team members as person+role links", () => {
    renderWithRouter(
      <EntityFieldValue
        entityKey="teams"
        field="members"
        value={[
          { person: "carol-lee", role: "backend-owner", title: "Backend Owner", is_primary_team: true, deputy: null },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "carol-lee" })).toHaveAttribute("href", "/entities/people?id=carol-lee");
    expect(screen.getByRole("link", { name: "backend-owner" })).toHaveAttribute(
      "href",
      "/entities/roles?id=backend-owner"
    );
    expect(screen.getByText(/Backend Owner/)).toBeInTheDocument();
  });
});
