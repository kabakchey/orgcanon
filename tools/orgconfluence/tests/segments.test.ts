import { describe, expect, it } from "vitest";
import { toSegments } from "../src/position/segments";
import type { HolderView, PositionView } from "../src/position/types";

function holder(name: string, extra: Partial<HolderView> = {}): HolderView {
  return { name, url: null, accountId: null, isInterim: false, deputy: null, ...extra };
}

function resolved(people: HolderView[], teamUrl: string | null = null): PositionView {
  return { status: "resolved", text: "Tech Lead", teamUrl, people };
}

const text = (view: PositionView) =>
  toSegments(view)
    .map((segment) => segment.text)
    .join("");

describe("toSegments", () => {
  it("renders a single holder in brackets after the position", () => {
    expect(text(resolved([holder("Bob Santos")]))).toBe("Tech Lead (Bob Santos)");
  });

  it("separates plain holders with commas", () => {
    expect(text(resolved([holder("Bob Santos"), holder("Dana Lee")]))).toBe("Tech Lead (Bob Santos, Dana Lee)");
  });

  it("puts each deputy after its own holder and separates holders with semicolons", () => {
    const people = [
      holder("Bob Santos", { deputy: { name: "Carol Diaz", url: null, accountId: null, isInterim: false } }),
      holder("Dana Lee"),
    ];

    expect(text(resolved(people))).toBe("Tech Lead (Bob Santos, deputy Carol Diaz; Dana Lee)");
  });

  it("marks interim holders and interim deputies", () => {
    const people = [
      holder("Bob Santos", { isInterim: true, deputy: { name: "Carol Diaz", url: null, accountId: null, isInterim: true } }),
      holder("Dana Lee"),
    ];

    expect(text(resolved(people))).toBe("Tech Lead (Bob Santos, interim, interim deputy Carol Diaz; Dana Lee)");
  });

  it("links the position to the team and each name to its person", () => {
    const people = [
      holder("Bob Santos", {
        url: "https://org.example.com/bob",
        deputy: { name: "Carol Diaz", url: "https://org.example.com/carol", accountId: null, isInterim: false },
      }),
    ];

    expect(toSegments(resolved(people, "https://org.example.com/team"))).toEqual([
      { text: "Tech Lead", href: "https://org.example.com/team" },
      { text: " (" },
      { text: "Bob Santos", href: "https://org.example.com/bob" },
      { text: ", deputy " },
      { text: "Carol Diaz", href: "https://org.example.com/carol" },
      { text: ")" },
    ]);
  });

  it("links a person with an Atlassian account to it, with a small second link to orgviewer", () => {
    const people = [
      holder("Bob Santos", {
        url: "https://org.example.com/bob",
        accountId: "557058:bob",
        deputy: { name: "Carol Diaz", url: "https://org.example.com/carol", accountId: null, isInterim: false },
      }),
    ];

    expect(toSegments(resolved(people))).toEqual([
      { text: "Tech Lead (" },
      { text: "Bob Santos", accountId: "557058:bob" },
      { text: "\u00a0" },
      { text: "↗", href: "https://org.example.com/bob" },
      { text: ", deputy " },
      { text: "Carol Diaz", href: "https://org.example.com/carol" },
      { text: ")" },
    ]);
  });

  it("adds no second link when there is no orgviewer page to link to", () => {
    const people = [holder("Bob Santos", { accountId: "557058:bob" }), holder("Dana Lee", { accountId: "557058:dana" })];

    expect(toSegments(resolved(people))).toEqual([
      { text: "Tech Lead (" },
      { text: "Bob Santos", accountId: "557058:bob" },
      { text: ", " },
      { text: "Dana Lee", accountId: "557058:dana" },
      { text: ")" },
    ]);
  });

  it("renders a vacant position", () => {
    expect(text({ status: "vacant", text: "Tech Lead", teamUrl: null })).toBe("Tech Lead (vacant)");
  });

  it("renders an unreachable orgapi without any name", () => {
    expect(text({ status: "unavailable", text: "Tech Lead" })).toBe("Tech Lead (⚠ unavailable)");
  });

  it("renders a position that no longer exists as an error naming it", () => {
    expect(text({ status: "unknown", team: "platform", position: "tech-lead" })).toBe(
      "⚠ unknown position: platform / tech-lead"
    );
    expect(text({ status: "unknown", team: "platform", position: "" })).toBe("⚠ unknown position: platform / head");
  });
});
