// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EDGE_STYLE } from "../../src/components/edge-styles";

const css = readFileSync(new URL("../../src/index.css", import.meta.url), "utf8");

function themeBlock(theme: "light" | "dark"): string {
  const start = css.indexOf(`:root[data-theme="${theme}"]`);
  return css.slice(start, css.indexOf("}", start));
}

describe("EDGE_STYLE", () => {
  it("only uses stroke variables that both themes define", () => {
    for (const style of Object.values(EDGE_STYLE)) {
      const varName = /var\((--[\w-]+)\)/.exec(style.stroke)![1]!;
      expect(themeBlock("light")).toContain(`${varName}:`);
      expect(themeBlock("dark")).toContain(`${varName}:`);
    }
  });

  it("gives non-hierarchical team and line-management edges one shared color, unlike their hierarchical versions", () => {
    expect(EDGE_STYLE.nonHierarchical.stroke).toBe(EDGE_STYLE.lineManagementNonHierarchical.stroke);
    expect(EDGE_STYLE.nonHierarchical.stroke).not.toBe(EDGE_STYLE.parentChild.stroke);
    expect(EDGE_STYLE.lineManagementNonHierarchical.stroke).not.toBe(EDGE_STYLE.lineManagement.stroke);
  });
});
