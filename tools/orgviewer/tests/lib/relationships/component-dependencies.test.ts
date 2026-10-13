import { describe, expect, it } from "vitest";
import {
  computeDependencyCounts,
  dependencyLinks,
  relatedComponentIds,
} from "../../../src/lib/relationships/component-dependencies";
import type { Component } from "../../../src/lib/orgapi/types";
import { component } from "../../fixtures/entities";

describe("dependencyLinks", () => {
  it("builds one link per dependency", () => {
    const components: Record<string, Component> = {
      a: component({ team: "t", dependency_components: ["b"] }),
      b: component({ team: "t", dependency_components: [] }),
    };

    expect(dependencyLinks(components)).toEqual([{ source: "a", target: "b" }]);
  });

  it("handles a cycle without crashing (cycles are legitimate, not an error)", () => {
    const components: Record<string, Component> = {
      a: component({ team: "t", dependency_components: ["b"] }),
      b: component({ team: "t", dependency_components: ["a"] }),
    };

    expect(dependencyLinks(components)).toEqual([
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ]);
  });
});

describe("computeDependencyCounts", () => {
  function chainComponents(): Record<string, Component> {
    return {
      a: component({ team: "t", dependency_components: ["b", "c"] }),
      b: component({ team: "t", dependency_components: ["c"] }),
      c: component({ team: "t", dependency_components: [] }),
    };
  }

  it("counts direct and transitive dependencies", () => {
    const counts = computeDependencyCounts("a", chainComponents());
    expect(counts.direct).toBe(2);
    expect(counts.transitive).toBe(2);
  });

  it("counts direct and transitive dependees", () => {
    const counts = computeDependencyCounts("c", chainComponents());
    expect(counts.directDependees).toBe(2);
    expect(counts.transitiveDependees).toBe(2);
  });

  it("returns zero counts for a component with no dependencies or dependees", () => {
    const counts = computeDependencyCounts("c", { c: component({ team: "t" }) });
    expect(counts).toEqual({ direct: 0, transitive: 0, directDependees: 0, transitiveDependees: 0 });
  });

  it("does not hang on a dependency cycle", () => {
    const components: Record<string, Component> = {
      a: component({ team: "t", dependency_components: ["b"] }),
      b: component({ team: "t", dependency_components: ["a"] }),
    };
    const counts = computeDependencyCounts("a", components);
    expect(counts.transitive).toBe(1);
    expect(counts.transitiveDependees).toBe(1);
  });
});

describe("relatedComponentIds", () => {
  function chainComponents(): Record<string, Component> {
    return {
      a: component({ team: "t", dependency_components: ["b"] }),
      b: component({ team: "t", dependency_components: ["c"] }),
      c: component({ team: "t", dependency_components: [] }),
      standalone: component({ team: "t", dependency_components: [] }),
    };
  }

  it("direct mode returns only immediate dependencies and dependees", () => {
    expect(relatedComponentIds("b", chainComponents(), "direct")).toEqual(new Set(["a", "c"]));
  });

  it("transitive mode returns the full closure in both directions", () => {
    expect(relatedComponentIds("a", chainComponents(), "transitive")).toEqual(new Set(["b", "c"]));
  });

  it("never includes an unrelated component", () => {
    const related = relatedComponentIds("a", chainComponents(), "transitive");
    expect(related.has("standalone")).toBe(false);
  });

  it("does not hang on a dependency cycle", () => {
    const components: Record<string, Component> = {
      a: component({ team: "t", dependency_components: ["b"] }),
      b: component({ team: "t", dependency_components: ["a"] }),
    };
    expect(relatedComponentIds("a", components, "transitive")).toEqual(new Set(["b"]));
  });
});
