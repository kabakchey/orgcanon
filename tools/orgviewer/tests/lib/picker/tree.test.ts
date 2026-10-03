import { describe, expect, it } from "vitest";
import {
  ancestorKeys,
  componentTree,
  filterTree,
  findItem,
  firstValue,
  lineManagementTree,
  teamTree,
  visibleRows,
  type TreeItem,
} from "../../../src/lib/picker/tree";
import type { Component, Person, Team } from "../../../src/lib/orgapi/types";

function team(overrides: Partial<Team> & { name: string; head: string }): Team {
  return {
    type: "squad",
    description: "",
    documentation_url: "",
    contact_email: "t@example.com",
    parent_team: null,
    head_title: "Head",
    head_deputy: null,
    head_deputy_title: null,
    is_head_primary_team: true,
    is_head_deputy_primary_team: null,
    is_head_interim: false,
    is_head_deputy_interim: null,
    external_references: {},
    members: [],
    reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
    is_hierarchical: false,
    is_cross_functional: false,
    is_temporary: false,
    ...overrides,
  };
}

function component(name: string, teamId: string): Component {
  return {
    name,
    description: "",
    documentation_url: "",
    team: teamId,
    dependency_components: [],
    is_end_user_facing: false,
    type: "service",
    external_references: {},
    reviewable: { expiration_date: "2027-01-01", notes: "", owner: "x" },
  };
}

function person(name: string): Person {
  return { name } as Person;
}

function member(personId: string) {
  return { person: personId, role: "r", title: "Engineer", is_primary_team: true, deputy: null, is_interim: false, is_deputy_interim: null };
}

const teams: Record<string, Team> = {
  root: team({ name: "Root", head: "cto" }),
  zeta: team({ name: "Zeta Squad", head: "zoe", parent_team: "root", members: [member("carl")] }),
  alpha: team({ name: "Alpha Squad", head: "amy", parent_team: "root" }),
};

const labels = (items: TreeItem[]): unknown =>
  items.map((item) => (item.children.length ? [item.label, labels(item.children)] : item.label));

describe("teamTree", () => {
  it("nests teams by parent_team, siblings sorted by name, every team selectable", () => {
    const tree = teamTree(teams);

    expect(labels(tree)).toEqual([["Root", ["Alpha Squad", "Zeta Squad"]]]);
    expect(tree[0]!.value).toBe("root");
    expect(tree[0]!.children.every((item) => item.value !== undefined)).toBe(true);
  });

  it("puts a team whose parent is missing or part of a cycle at the root instead of losing it", () => {
    const tree = teamTree({
      orphan: team({ name: "Orphan", head: "x", parent_team: "gone" }),
      a: team({ name: "Loop A", head: "x", parent_team: "b" }),
      b: team({ name: "Loop B", head: "x", parent_team: "a" }),
    });

    const all: string[] = [];
    const walk = (items: TreeItem[]) => items.forEach((item) => (all.push(item.label), walk(item.children)));
    walk(tree);
    expect(all.sort()).toEqual(["Loop A", "Loop B", "Orphan"]);
  });
});

describe("componentTree", () => {
  it("lists components under their owning team, as unselectable team groups, hiding teams with no components below", () => {
    const tree = componentTree(teams, { api: component("Billing API", "zeta"), ui: component("Admin UI", "root") });

    expect(labels(tree)).toEqual([["Root", ["Admin UI", ["Zeta Squad", ["Billing API"]]]]]);
    expect(tree[0]!.value).toBeUndefined();
    expect(findItem(tree, "api")?.label).toBe("Billing API");
  });
});

describe("lineManagementTree", () => {
  it("nests people under their derived line manager and groups lone people without one at the end", () => {
    const people = { cto: person("Cleo Root"), zoe: person("Zoe Zed"), amy: person("Amy Ash"), carl: person("Carl Cee"), lone: person("Lone Wolf") };

    const tree = lineManagementTree(teams, people);

    expect(labels(tree)).toEqual([
      ["Cleo Root", ["Amy Ash", ["Zoe Zed", ["Carl Cee"]]]],
      ["(no line manager)", ["Lone Wolf"]],
    ]);
    expect(tree[1]!.value).toBeUndefined();
  });

  it("does not loop forever on a line-management cycle", () => {
    const cyclic = {
      a: team({ name: "A", head: "p", parent_team: "b" }),
      b: team({ name: "B", head: "q", parent_team: "a" }),
    };

    const tree = lineManagementTree(cyclic, { p: person("P"), q: person("Q") });

    expect(findItem(tree, "p")).toBeDefined();
    expect(findItem(tree, "q")).toBeDefined();
  });
});

describe("filterTree", () => {
  it("keeps case-insensitive matches plus their ancestors, but not a match's non-matching children", () => {
    const { items, matchedKeys } = filterTree(teamTree(teams), "SQUAD");

    expect(labels(items)).toEqual([["Root", ["Alpha Squad", "Zeta Squad"]]]);
    expect([...matchedKeys].sort()).toEqual(["alpha", "zeta"]);

    expect(labels(filterTree(teamTree(teams), "root").items)).toEqual(["Root"]);
  });

  it("returns the tree unchanged for a blank query", () => {
    const tree = teamTree(teams);
    expect(filterTree(tree, "  ").items).toBe(tree);
  });
});

describe("visibleRows / ancestorKeys", () => {
  it("lists only rows under expanded items, with their depth", () => {
    const tree = teamTree(teams);

    expect(visibleRows(tree, new Set()).map((row) => row.item.label)).toEqual(["Root"]);
    expect(visibleRows(tree, new Set(["root"])).map((row) => [row.item.label, row.level])).toEqual([
      ["Root", 1],
      ["Alpha Squad", 2],
      ["Zeta Squad", 2],
    ]);
  });

  it("finds the keys of every ancestor of a value", () => {
    const tree = lineManagementTree(teams, { cto: person("Cleo Root"), zoe: person("Zoe Zed"), amy: person("Amy Ash"), carl: person("Carl Cee") });
    expect(ancestorKeys(tree, "carl")).toEqual(["cto", "zoe"]);
  });
});

describe("firstValue", () => {
  it("returns the first selectable value in display order, skipping group-only rows", () => {
    const tree = componentTree(teams, { api: component("Billing API", "zeta"), ui: component("Admin UI", "root") });
    expect(firstValue(tree)).toBe("ui");
    expect(firstValue([])).toBeUndefined();
  });
});
