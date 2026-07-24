import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../../src/components/copy-button";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CopyButton", () => {
  it("writes the provided text to the clipboard when clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<CopyButton getText={() => "Chris Osei\nCTO"} label="Copy Potuto" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy Potuto" }));

    expect(writeText).toHaveBeenCalledWith("Chris Osei\nCTO");
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("✓"));
  });

  it("applies an extra className when given one", () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn() } });

    render(<CopyButton getText={() => "x"} label="Copy" className="node-card-copy" />);

    expect(screen.getByRole("button", { name: "Copy" })).toHaveClass("node-card-copy");
  });
});
