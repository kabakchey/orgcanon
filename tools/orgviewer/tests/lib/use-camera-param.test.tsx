import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useCameraParam } from "../../src/lib/use-camera-param";

function Harness() {
  const [camera, setCamera] = useCameraParam();
  return (
    <>
      <output aria-label="camera">{JSON.stringify(camera)}</output>
      <output aria-label="search">{useLocation().search}</output>
      <output aria-label="navigation type">{useNavigationType()}</output>
      <button onClick={() => setCamera({ x: 10.4, y: -3.6, zoom: 0.123456 })}>move</button>
    </>
  );
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Harness />
    </MemoryRouter>
  );
}

describe("useCameraParam", () => {
  it("is null when the URL has no camera", () => {
    renderAt("/?other=x");
    expect(screen.getByLabelText("camera")).toHaveTextContent("null");
  });

  it("reads zoom and pan from the URL", () => {
    renderAt("/?zoom=0.5&x=10&y=-20");
    expect(JSON.parse(screen.getByLabelText("camera").textContent!)).toEqual({ x: 10, y: -20, zoom: 0.5 });
  });

  it.each(["/?zoom=0&x=1&y=1", "/?zoom=1&x=abc&y=1", "/?zoom=1&x=1"])("ignores an incomplete or invalid camera (%s)", (url) => {
    renderAt(url);
    expect(screen.getByLabelText("camera")).toHaveTextContent("null");
  });

  it("writes a rounded camera in place of the current entry, keeping other params", async () => {
    renderAt("/?other=x");
    await userEvent.click(screen.getByRole("button", { name: "move" }));

    expect(screen.getByLabelText("search")).toHaveTextContent("?other=x&zoom=0.123&x=10&y=-4");
    expect(screen.getByLabelText("navigation type")).toHaveTextContent("REPLACE");
  });
});
