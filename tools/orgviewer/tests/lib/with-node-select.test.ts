import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import { withNodeSelect } from "../../src/lib/with-node-select";

describe("withNodeSelect", () => {
  it("attaches an onSelect handler, bound to the id portion, only to nodes matching the prefix", () => {
    const nodes: Node[] = [
      { id: "person:carol-lee", type: "person", position: { x: 0, y: 0 }, data: { label: "Carol Lee" } },
      { id: "team:platform-squad", type: "team", position: { x: 0, y: 0 }, data: { label: "Platform Squad" } },
    ];
    const onSelect = vi.fn();

    const result = withNodeSelect(nodes, "person:", onSelect);

    const person = result.find((n) => n.id === "person:carol-lee")!;
    const team = result.find((n) => n.id === "team:platform-squad")!;
    expect(typeof person.data.onSelect).toBe("function");
    expect(team.data.onSelect).toBeUndefined();

    (person.data.onSelect as () => void)();
    expect(onSelect).toHaveBeenCalledWith("carol-lee");
  });

  it("leaves other node data untouched", () => {
    const nodes: Node[] = [
      { id: "person:carol-lee", type: "person", position: { x: 0, y: 0 }, data: { label: "Carol Lee" } },
    ];

    const result = withNodeSelect(nodes, "person:", vi.fn());

    expect(result[0]!.data.label).toBe("Carol Lee");
  });
});
