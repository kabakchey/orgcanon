import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { applyFold, foldableSourceIds, isFoldableEdgeId } from "../../../src/lib/fold/apply-fold";

function node(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} };
}

describe("isFoldableEdgeId", () => {
  it("treats hierarchy, membership, dependency, and reports edges as foldable", () => {
    expect(isFoldableEdgeId("hierarchy:potuto->r-and-d")).toBe(true);
    expect(isFoldableEdgeId("membership:r-and-d->vp-eng:VP Eng")).toBe(true);
    expect(isFoldableEdgeId("dependency:billing-ui->billing-api")).toBe(true);
    expect(isFoldableEdgeId("reports:alice-nguyen->carol-lee")).toBe(true);
  });

  it("treats overlay relationship edges as not foldable", () => {
    expect(isFoldableEdgeId("chain:carol-lee->alice-nguyen")).toBe(false);
    expect(isFoldableEdgeId("authority:carol-lee->platform-squad")).toBe(false);
    expect(isFoldableEdgeId("ownership:platform-squad->billing-api")).toBe(false);
  });
});

describe("foldableSourceIds", () => {
  it("returns the set of node ids that are the source of at least one foldable edge", () => {
    const edges: Edge[] = [
      { id: "hierarchy:potuto->r-and-d", source: "team:potuto", target: "team:r-and-d" },
      { id: "authority:x->y", source: "person:x", target: "team:y" },
    ];
    expect(foldableSourceIds(edges)).toEqual(new Set(["team:potuto"]));
  });
});

describe("applyFold", () => {
  const nodes = [
    node("team:potuto"),
    node("team:r-and-d"),
    node("team:platform-squad"),
    node("person:alice-nguyen"),
  ];
  const edges: Edge[] = [
    { id: "hierarchy:potuto->r-and-d", source: "team:potuto", target: "team:r-and-d" },
    { id: "hierarchy:r-and-d->platform-squad", source: "team:r-and-d", target: "team:platform-squad" },
    {
      id: "membership:platform-squad->alice-nguyen:Lead",
      source: "team:platform-squad",
      target: "person:alice-nguyen",
    },
  ];

  it("returns everything unchanged when nothing is folded", () => {
    const result = applyFold(nodes, edges, new Set());
    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(3);
  });

  it("hides every descendant node and edge below a folded node, and reports the hidden count", () => {
    const result = applyFold(nodes, edges, new Set(["team:r-and-d"]));

    expect(result.nodes.map((n) => n.id).sort()).toEqual(["team:potuto", "team:r-and-d"]);
    expect(result.edges.map((e) => e.id)).toEqual(["hierarchy:potuto->r-and-d"]);
    expect(result.hiddenCounts.get("team:r-and-d")).toBe(2);
  });

  it("also reports the direct hidden count, distinct from the transitive total", () => {
    const result = applyFold(nodes, edges, new Set(["team:r-and-d"]));

    expect(result.directHiddenCounts.get("team:r-and-d")).toBe(1);
    expect(result.hiddenCounts.get("team:r-and-d")).toBe(2);
  });

  it("also hides a non-foldable overlay edge whose endpoint fell inside a folded subtree", () => {
    const overlayEdges: Edge[] = [
      ...edges,
      { id: "authority:x->platform-squad", source: "person:alice-nguyen", target: "team:platform-squad" },
    ];

    const result = applyFold(nodes, overlayEdges, new Set(["team:r-and-d"]));
    expect(result.edges.map((e) => e.id)).not.toContain("authority:x->platform-squad");
  });
});

describe("applyFold with a shared descendant", () => {
  it("keeps a node visible if it's still reachable from a non-folded, visible root", () => {
    const sharedNodes = [
      node("team:r-and-d"),
      node("team:platform-squad"),
      node("team:other-squad"),
      node("person:carol-lee"),
    ];
    const sharedEdges: Edge[] = [
      { id: "hierarchy:r-and-d->platform-squad", source: "team:r-and-d", target: "team:platform-squad" },
      { id: "hierarchy:r-and-d->other-squad", source: "team:r-and-d", target: "team:other-squad" },
      {
        id: "membership:platform-squad->carol-lee:Primary",
        source: "team:platform-squad",
        target: "person:carol-lee",
      },
      {
        id: "membership:other-squad->carol-lee:Secondary",
        source: "team:other-squad",
        target: "person:carol-lee",
      },
    ];

    const result = applyFold(sharedNodes, sharedEdges, new Set(["team:platform-squad"]));

    expect(result.nodes.map((n) => n.id)).toContain("person:carol-lee");
    expect(result.hiddenCounts.get("team:platform-squad")).toBe(0);
  });

  it("hides a node once every path to it goes through a folded node", () => {
    const sharedNodes = [
      node("team:r-and-d"),
      node("team:platform-squad"),
      node("team:other-squad"),
      node("person:carol-lee"),
    ];
    const sharedEdges: Edge[] = [
      { id: "hierarchy:r-and-d->platform-squad", source: "team:r-and-d", target: "team:platform-squad" },
      { id: "hierarchy:r-and-d->other-squad", source: "team:r-and-d", target: "team:other-squad" },
      {
        id: "membership:platform-squad->carol-lee:Primary",
        source: "team:platform-squad",
        target: "person:carol-lee",
      },
      {
        id: "membership:other-squad->carol-lee:Secondary",
        source: "team:other-squad",
        target: "person:carol-lee",
      },
    ];

    const result = applyFold(sharedNodes, sharedEdges, new Set(["team:platform-squad", "team:other-squad"]));

    expect(result.nodes.map((n) => n.id)).not.toContain("person:carol-lee");
  });

  it("hides a component whose only edge is a non-foldable ownership edge once its owning team is hidden by an ancestor fold, but not by folding the owning team itself", () => {
    const ownerNodes = [node("team:root"), node("team:mid"), node("component:c")];
    const ownerEdges: Edge[] = [
      { id: "hierarchy:root->mid", source: "team:root", target: "team:mid" },
      { id: "ownership:mid->c", source: "team:mid", target: "component:c" },
    ];

    // Folding team:mid itself: it keeps the "folded nodes show themselves" exemption, so
    // component:c (reachable only via the non-foldable ownership edge) stays attached to a
    // visible source.
    const midFolded = applyFold(ownerNodes, ownerEdges, new Set(["team:mid"]));
    expect(midFolded.nodes.map((n) => n.id)).toContain("component:c");
    expect(midFolded.edges.map((e) => e.id)).toContain("ownership:mid->c");

    // Folding team:root instead: team:mid loses that exemption and disappears like any
    // descendant, but component:c's only edge is the non-foldable ownership edge from team:mid --
    // since apply-fold only tracks foldable edges for reachability, this component could never be
    // hidden.
    const rootFolded = applyFold(ownerNodes, ownerEdges, new Set(["team:root"]));
    expect(rootFolded.nodes.map((n) => n.id)).not.toContain("component:c");
  });

  it("keeps a folded node itself visible even inside a fully isolated dependency cycle", () => {
    const cycleNodes = [node("component:a"), node("component:b")];
    const cycleEdges: Edge[] = [
      { id: "dependency:a->b", source: "component:a", target: "component:b" },
      { id: "dependency:b->a", source: "component:b", target: "component:a" },
    ];

    const result = applyFold(cycleNodes, cycleEdges, new Set(["component:a"]));

    expect(result.nodes.map((n) => n.id)).toEqual(["component:a"]);
  });

  it("hides a node that was individually folded once an ancestor above it is also folded", () => {
    const chainNodes = [node("team:cascadia"), node("team:engineering"), node("team:payments-squad")];
    const chainEdges: Edge[] = [
      { id: "hierarchy:cascadia->engineering", source: "team:cascadia", target: "team:engineering" },
      { id: "hierarchy:engineering->payments-squad", source: "team:engineering", target: "team:payments-squad" },
    ];

    const squadOnly = applyFold(chainNodes, chainEdges, new Set(["team:payments-squad"]));
    expect(squadOnly.nodes.map((n) => n.id)).toContain("team:payments-squad");

    const bothFolded = applyFold(chainNodes, chainEdges, new Set(["team:payments-squad", "team:cascadia"]));
    expect(bothFolded.nodes.map((n) => n.id)).toEqual(["team:cascadia"]);
  });
});
