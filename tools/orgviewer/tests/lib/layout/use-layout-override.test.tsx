import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useLayoutOverride } from "../../../src/lib/layout/use-layout-override";

function OverrideProbe({ storageKey }: { storageKey: string }) {
  const { override, save, reset } = useLayoutOverride(storageKey);
  return (
    <div>
      <span>{override ? `has:${Object.keys(override.nodePositions).join(",")}` : "none"}</span>
      <button
        type="button"
        onClick={() => save({ nodePositions: { "component:a": { x: 10, y: 20 } }, edgeRoutes: {} })}
      >
        save
      </button>
      <button type="button" onClick={reset}>
        reset
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("useLayoutOverride", () => {
  it("starts with no override", () => {
    render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("save persists to storage and updates the returned override", async () => {
    render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    await userEvent.click(screen.getByText("save"));
    expect(screen.getByText("has:component:a")).toBeInTheDocument();
  });

  it("persists across remounts under the same storage key", async () => {
    const { unmount } = render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    await userEvent.click(screen.getByText("save"));
    unmount();

    render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    expect(screen.getByText("has:component:a")).toBeInTheDocument();
  });

  it("reset clears storage and the returned override", async () => {
    const { unmount } = render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    await userEvent.click(screen.getByText("save"));
    await userEvent.click(screen.getByText("reset"));
    expect(screen.getByText("none")).toBeInTheDocument();
    unmount();

    render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("keeps overrides independent across different storage keys", async () => {
    render(<OverrideProbe storageKey="component-dependencies:audit-log:direct" />);
    await userEvent.click(screen.getByText("save"));

    render(<OverrideProbe storageKey="component-dependencies:event-bus:direct" />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });
});
