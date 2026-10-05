import { describe, expect, it } from "vitest";
import { getViewBySlug, views } from "../../src/views/registry";

describe("views registry", () => {
  it("has unique slugs", () => {
    const slugs = views.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has exactly the 6 views", () => {
    expect(views.map((v) => v.slug).sort()).toEqual(
      [
        "org-tree",
        "chain-of-command",
        "authority-over",
        "team-components",
        "component-dependencies",
        "entities",
      ].sort()
    );
  });

  it("looks up a view by slug", () => {
    expect(getViewBySlug("org-tree")?.title).toBe("Org Tree");
    expect(getViewBySlug("nonexistent")).toBeUndefined();
  });
});
