import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { TeamNode, PersonNode, ComponentNode } from "../../src/components/node-types";

function renderNode(ui: React.ReactElement) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>);
}

const baseProps = {
  selected: false,
  isConnectable: true,
  zIndex: 0,
  dragging: false,
  draggable: true,
  selectable: true,
  deletable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
} as const;

describe("node-types direction-aware handles", () => {
  it("uses top/bottom handles for the default DOWN direction", () => {
    const { container } = renderNode(
      <TeamNode id="n1" type="team" data={{ label: "Team Down" }} {...baseProps} />
    );

    expect(screen.getByText("Team Down")).toBeInTheDocument();
    expect(container.querySelector('[data-handlepos="top"]')).not.toBeNull();
    expect(container.querySelector('[data-handlepos="bottom"]')).not.toBeNull();
    expect(container.querySelector('[data-handlepos="left"]')).toBeNull();
    expect(container.querySelector('[data-handlepos="right"]')).toBeNull();
  });

  it("uses left/right handles when data.direction is RIGHT", () => {
    const { container } = renderNode(
      <TeamNode id="n2" type="team" data={{ label: "Team Right", direction: "RIGHT" }} {...baseProps} />
    );

    expect(screen.getByText("Team Right")).toBeInTheDocument();
    expect(container.querySelector('[data-handlepos="left"]')).not.toBeNull();
    expect(container.querySelector('[data-handlepos="right"]')).not.toBeNull();
    expect(container.querySelector('[data-handlepos="top"]')).toBeNull();
    expect(container.querySelector('[data-handlepos="bottom"]')).toBeNull();
  });
});

describe("TeamNode card content", () => {
  it("shows the team's type inline with its name, and the description as a secondary line", () => {
    const { container } = renderNode(
      <TeamNode
        id="t1"
        type="team"
        data={{ label: "Platform Squad", type: "squad", description: "Owns billing." }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Platform Squad", { exact: false })).toBeInTheDocument();
    expect(container.querySelector(".node-card-primary-hint")).toHaveTextContent("squad");
    expect(screen.getByText("Owns billing.")).toBeInTheDocument();
  });

  it("shows the full description as a native tooltip on hover", () => {
    const { container } = renderNode(
      <TeamNode
        id="t2"
        type="team"
        data={{ label: "Platform Squad", type: "squad", description: "Owns platform billing end to end." }}
        {...baseProps}
      />
    );

    expect(container.querySelector(".node-card")).toHaveAttribute(
      "title",
      "Owns platform billing end to end."
    );
  });

  it("omits the type hint and tooltip when neither is given", () => {
    const { container } = renderNode(
      <TeamNode id="t3" type="team" data={{ label: "Platform Squad" }} {...baseProps} />
    );

    expect(container.querySelector(".node-card-primary-hint")).toBeNull();
    expect(container.querySelector(".node-card")).not.toHaveAttribute("title");
  });

  it("links the card title to documentationUrl when present, opening in a new tab, without pulling the type hint into the link", () => {
    renderNode(
      <TeamNode
        id="t4"
        type="team"
        data={{
          label: "Platform Squad",
          type: "squad",
          documentationUrl: "https://example.com/teams/platform-squad",
        }}
        {...baseProps}
      />
    );

    const titleLink = screen.getByRole("link", { name: "Platform Squad" });
    expect(titleLink).toHaveAttribute("href", "https://example.com/teams/platform-squad");
    expect(titleLink).toHaveAttribute("target", "_blank");
    expect(titleLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not link the title when documentationUrl is empty", () => {
    renderNode(
      <TeamNode id="t5" type="team" data={{ label: "Platform Squad", documentationUrl: "" }} {...baseProps} />
    );

    expect(screen.queryByRole("link", { name: "Platform Squad" })).toBeNull();
    expect(screen.getByText("Platform Squad")).toBeInTheDocument();
  });
});

describe("PersonNode card content", () => {
  it("shows the primary title prominently, prefixed with 'Role: ', and secondary titles below it", () => {
    renderNode(
      <PersonNode
        id="p1"
        type="person"
        data={{
          label: "Carol Lee",
          primaryTitle: "Backend Owner",
          secondaryTitles: ["Frontend Owner"],
        }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Carol Lee")).toBeInTheDocument();
    expect(screen.getByText("Role:")).toBeInTheDocument();
    expect(screen.getByText("Backend Owner")).toBeInTheDocument();
    expect(screen.getByText("Frontend Owner")).toBeInTheDocument();
  });

  it("shows the person's current position title, prefixed with 'Position: '", () => {
    renderNode(
      <PersonNode
        id="p6"
        type="person"
        data={{ label: "Carol Lee", positionTitle: "Senior Software Engineer" }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Position:")).toBeInTheDocument();
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  it("styles the 'Unit'/'Role'/'Position' labels less prominently than their values", () => {
    renderNode(
      <PersonNode
        id="p7"
        type="person"
        data={{
          label: "Carol Lee",
          teamName: "Platform Squad",
          primaryTitle: "Backend Owner",
          positionTitle: "Senior Software Engineer",
        }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Unit:")).toHaveClass("node-card-line-label");
    expect(screen.getByText("Role:")).toHaveClass("node-card-line-label");
    expect(screen.getByText("Position:")).toHaveClass("node-card-line-label");
    expect(screen.getByText("Platform Squad")).not.toHaveClass("node-card-line-label");
  });

  it("shows the person's team name when given, prefixed with 'Unit: ', ahead of the title", () => {
    renderNode(
      <PersonNode
        id="p4"
        type="person"
        data={{
          label: "Carol Lee",
          teamName: "Platform Squad",
          primaryTitle: "Backend Owner",
          secondaryTitles: [],
        }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Unit:")).toBeInTheDocument();
    expect(screen.getByText("Platform Squad")).toBeInTheDocument();
  });

  it("renders no secondary lines for a person with no roles", () => {
    renderNode(
      <PersonNode
        id="p2"
        type="person"
        data={{ label: "Nobody", primaryTitle: null, secondaryTitles: [] }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Nobody")).toBeInTheDocument();
  });

  it("does not show a person's specialization on the card", () => {
    renderNode(
      <PersonNode
        id="p5"
        type="person"
        data={{
          label: "Carol Lee",
          primaryTitle: "Backend Owner",
          secondaryTitles: [],
          specialization: "backend",
        }}
        {...baseProps}
      />
    );

    expect(screen.queryByText("backend")).toBeNull();
    expect(screen.queryByText(/specialization/i)).toBeNull();
  });

  it("links the card title to documentationUrl when present", () => {
    renderNode(
      <PersonNode
        id="p8"
        type="person"
        data={{ label: "Carol Lee", documentationUrl: "https://example.com/people/carol-lee" }}
        {...baseProps}
      />
    );

    expect(screen.getByRole("link", { name: "Carol Lee" })).toHaveAttribute(
      "href",
      "https://example.com/people/carol-lee"
    );
  });
});

describe("ComponentNode card content", () => {
  it("shows the component's type and an end-user-facing badge when applicable", () => {
    renderNode(
      <ComponentNode
        id="c1"
        type="component"
        data={{ label: "Billing UI", type: "user-interface", isEndUserFacing: true }}
        {...baseProps}
      />
    );

    expect(screen.getByText("Billing UI")).toBeInTheDocument();
    expect(screen.getByText("user-interface")).toBeInTheDocument();
    expect(screen.getByText("end-user-facing")).toBeInTheDocument();
  });

  it("omits the badge when the component is not end-user-facing", () => {
    renderNode(
      <ComponentNode
        id="c2"
        type="component"
        data={{ label: "Billing API", type: "service", isEndUserFacing: false }}
        {...baseProps}
      />
    );

    expect(screen.queryByText("end-user-facing")).toBeNull();
  });

  it("shows a link to the owning team on Org Tree, and links for each dependency count into Component Dependencies", () => {
    renderNodeWithRouter(
      <ComponentNode
        id="component:billing-ui"
        type="component"
        data={{
          label: "Billing UI",
          type: "user-interface",
          isEndUserFacing: true,
          ownerTeamId: "platform-squad",
          ownerTeamName: "Platform Squad",
          directDependencies: 1,
          transitiveDependencies: 2,
          directDependees: 0,
          transitiveDependees: 0,
        }}
        {...baseProps}
      />
    );

    expect(screen.getByRole("link", { name: "Platform Squad" })).toHaveAttribute(
      "href",
      "/views/org-tree?teamId=platform-squad"
    );

    const depLink = screen.getByRole("link", { name: "1 direct dependencies" });
    expect(depLink).toHaveAttribute("href", "/views/component-dependencies?componentId=billing-ui");
    expect(screen.getByRole("link", { name: "2 all dependencies" })).toHaveAttribute(
      "href",
      "/views/component-dependencies?componentId=billing-ui"
    );
    expect(screen.getByRole("link", { name: "0 direct dependees" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "0 all dependees" })).toBeInTheDocument();
  });

  it("shows dependency/dependee counts as an icon plus a bare number, with the label only in the hover title (and accessible name)", () => {
    renderNodeWithRouter(
      <ComponentNode
        id="component:billing-ui"
        type="component"
        data={{
          label: "Billing UI",
          type: "user-interface",
          directDependencies: 1,
          transitiveDependencies: 2,
          directDependees: 0,
          transitiveDependees: 0,
        }}
        {...baseProps}
      />
    );

    const depLink = screen.getByRole("link", { name: "1 direct dependencies" });
    expect(depLink).toHaveTextContent("1");
    expect(depLink).not.toHaveTextContent("direct dependencies");
    expect(depLink).toHaveAttribute("title", "1 direct dependencies");
  });

  it("omits owner-team and dependency-count lines when that data is absent", () => {
    renderNodeWithRouter(
      <ComponentNode
        id="component:billing-ui"
        type="component"
        data={{ label: "Billing UI", type: "user-interface", isEndUserFacing: false }}
        {...baseProps}
      />
    );

    expect(screen.queryByRole("link", { name: /direct dependencies|all dependencies|dependees/ })).toBeNull();
  });

  it("links the card title to documentationUrl when present", () => {
    renderNode(
      <ComponentNode
        id="c3"
        type="component"
        data={{ label: "Billing UI", documentationUrl: "https://example.com/components/billing-ui" }}
        {...baseProps}
      />
    );

    expect(screen.getByRole("link", { name: "Billing UI" })).toHaveAttribute(
      "href",
      "https://example.com/components/billing-ui"
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("node card copy button", () => {
  it("copies every visible line of a person card, joined by newlines", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    renderNode(
      <PersonNode
        id="p3"
        type="person"
        data={{
          label: "Carol Lee",
          primaryTitle: "Backend Owner",
          secondaryTitles: ["Frontend Owner"],
        }}
        {...baseProps}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy Carol Lee" }));

    expect(writeText).toHaveBeenCalledWith("Carol Lee\nRole: Backend Owner\nFrontend Owner");
  });
});

describe("fold toggle", () => {
  it("renders a fold circle only when data.foldable is true", () => {
    const { rerender } = renderNode(
      <TeamNode id="t1" type="team" data={{ label: "Potuto" }} {...baseProps} />
    );
    expect(screen.queryByRole("button", { name: /collapse|expand/i })).toBeNull();

    rerender(
      <ReactFlowProvider>
        <TeamNode
          id="t1"
          type="team"
          data={{ label: "Potuto", foldable: true, folded: false, hiddenCount: 0, onToggleFold: () => {} }}
          {...baseProps}
        />
      </ReactFlowProvider>
    );
    expect(screen.getByRole("button", { name: "Collapse" })).toBeInTheDocument();
  });

  it("shows both the direct and total hidden-descendant counts once folded, and calls onToggleFold when clicked", async () => {
    const onToggleFold = vi.fn();
    renderNode(
      <TeamNode
        id="t1"
        type="team"
        data={{ label: "R&D", foldable: true, folded: true, hiddenCount: 7, directHiddenCount: 3, onToggleFold }}
        {...baseProps}
      />
    );

    const toggle = screen.getByRole("button", { name: "Expand (3 direct, 7 total hidden)" });
    expect(toggle).toHaveTextContent("+3/7");
    expect(toggle).toHaveClass("folded");

    await userEvent.click(toggle);
    expect(onToggleFold).toHaveBeenCalledTimes(1);
  });

  it("styles the direct count more prominently than the total count", () => {
    renderNode(
      <TeamNode
        id="t1"
        type="team"
        data={{ label: "R&D", foldable: true, folded: true, hiddenCount: 7, directHiddenCount: 3, onToggleFold: () => {} }}
        {...baseProps}
      />
    );

    const direct = screen.getByText("+3");
    const total = screen.getByText("/7");
    expect(direct).toHaveClass("fold-toggle-direct");
    expect(total).toHaveClass("fold-toggle-total");
  });
});

import { MemoryRouter } from "react-router-dom";

function renderNodeWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ReactFlowProvider>{ui}</ReactFlowProvider>
    </MemoryRouter>
  );
}

describe("node card select control", () => {
  it("renders no select control when data.onSelect is absent", () => {
    renderNodeWithRouter(
      <PersonNode
        id="person:carol-lee"
        type="person"
        data={{ label: "Carol Lee", primaryTitle: null, secondaryTitles: [] }}
        {...baseProps}
      />
    );
    expect(screen.queryByRole("button", { name: /select carol lee/i })).toBeNull();
  });

  it("calls data.onSelect when the select control is clicked, without navigating via the details link", async () => {
    const onSelect = vi.fn();
    renderNodeWithRouter(
      <PersonNode
        id="person:carol-lee"
        type="person"
        data={{ label: "Carol Lee", primaryTitle: null, secondaryTitles: [], onSelect }}
        {...baseProps}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Select Carol Lee" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("node card details link", () => {
  it("links a person card to its entity page using the node's id", () => {
    renderNodeWithRouter(
      <PersonNode
        id="person:carol-lee"
        type="person"
        data={{ label: "Carol Lee", primaryTitle: null, secondaryTitles: [] }}
        {...baseProps}
      />
    );

    expect(screen.getByRole("link", { name: "View details for Carol Lee" })).toHaveAttribute(
      "href",
      "/entities/people?id=carol-lee"
    );
  });

  it("links a team card to /entities/teams and a component card to /entities/components", () => {
    renderNodeWithRouter(
      <TeamNode id="team:platform-squad" type="team" data={{ label: "Platform Squad" }} {...baseProps} />
    );
    expect(screen.getByRole("link", { name: "View details for Platform Squad" })).toHaveAttribute(
      "href",
      "/entities/teams?id=platform-squad"
    );
  });
});
