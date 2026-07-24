import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useFoldState } from "../../../src/lib/fold/use-fold-state";

function FoldProbe({
  storageKey,
  defaultFoldedIds,
  relevantIds,
  checkId = "team:platform-squad",
}: {
  storageKey: string;
  defaultFoldedIds?: Set<string>;
  relevantIds?: Set<string>;
  checkId?: string;
}) {
  const { isFolded, toggleFold } = useFoldState(storageKey, defaultFoldedIds, relevantIds);
  return (
    <button type="button" onClick={() => toggleFold(checkId)}>
      {isFolded(checkId) ? "folded" : "expanded"}
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("useFoldState", () => {
  it("starts expanded and toggles to folded and back on click", async () => {
    render(<FoldProbe storageKey="org-tree" />);

    expect(screen.getByText("expanded")).toBeInTheDocument();
    await userEvent.click(screen.getByText("expanded"));
    expect(screen.getByText("folded")).toBeInTheDocument();
    await userEvent.click(screen.getByText("folded"));
    expect(screen.getByText("expanded")).toBeInTheDocument();
  });

  it("persists folded state across remounts under the same storage key", async () => {
    const { unmount } = render(<FoldProbe storageKey="org-tree" />);
    await userEvent.click(screen.getByText("expanded"));
    unmount();

    render(<FoldProbe storageKey="org-tree" />);
    expect(screen.getByText("folded")).toBeInTheDocument();
  });

  it("keeps fold state independent across different storage keys", async () => {
    render(<FoldProbe storageKey="chain-of-command:carol-lee" />);
    await userEvent.click(screen.getByText("expanded"));

    render(<FoldProbe storageKey="team-components:platform-squad" />);
    expect(screen.getByText("expanded")).toBeInTheDocument();
  });
});

describe("useFoldState with a default", () => {
  it("starts folded per the given default when nothing is stored yet", () => {
    render(
      <FoldProbe storageKey="chain-of-command:alice" defaultFoldedIds={new Set(["team:platform-squad"])} />
    );
    expect(screen.getByText("folded")).toBeInTheDocument();
  });

  it("respects the user's own prior toggle over the default on a later mount", async () => {
    const { unmount } = render(
      <FoldProbe storageKey="chain-of-command:bob" defaultFoldedIds={new Set(["team:platform-squad"])} />
    );
    await userEvent.click(screen.getByText("folded"));
    unmount();

    render(
      <FoldProbe storageKey="chain-of-command:bob" defaultFoldedIds={new Set(["team:platform-squad"])} />
    );
    expect(screen.getByText("expanded")).toBeInTheDocument();
  });
});

describe("useFoldState with relevantIds", () => {
  it("falls back to the default when the stored fold ids share nothing with the current graph", async () => {
    const { unmount } = render(
      <FoldProbe storageKey="org-tree" relevantIds={new Set(["team:platform-squad"])} />
    );
    await userEvent.click(screen.getByText("expanded"));
    expect(screen.getByText("folded")).toBeInTheDocument();
    unmount();

    // Same storage key (org-tree's key isn't scoped per dataset -- see graph-canvas.tsx), but a
    // completely different graph: none of its node ids overlap with what got persisted above, so
    // the stored set is stale leftover from the old graph, not a real preference for this one.
    render(
      <FoldProbe
        storageKey="org-tree"
        defaultFoldedIds={new Set(["team:other-org-root"])}
        relevantIds={new Set(["team:other-org-root"])}
        checkId="team:other-org-root"
      />
    );
    expect(screen.getByText("folded")).toBeInTheDocument();
  });

  it("still respects the user's prior toggle when the stored ids overlap the current graph", async () => {
    const { unmount } = render(
      <FoldProbe storageKey="org-tree" relevantIds={new Set(["team:platform-squad", "team:other"])} />
    );
    await userEvent.click(screen.getByText("expanded"));
    unmount();

    render(
      <FoldProbe
        storageKey="org-tree"
        defaultFoldedIds={new Set(["team:other"])}
        relevantIds={new Set(["team:platform-squad", "team:other"])}
      />
    );
    expect(screen.getByText("folded")).toBeInTheDocument();
  });
});
