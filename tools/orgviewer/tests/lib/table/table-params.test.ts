import { describe, expect, it } from "vitest";
import type { Column } from "../../../src/lib/table/derive-table";
import {
  defaultColumnKeys,
  entitySearch,
  isDefaultLayout,
  readTableParams,
  resolveVisibleColumns,
  withColumns,
  withFilter,
  withSortToggled,
} from "../../../src/lib/table/table-params";

const columns: Column[] = [
  { key: "id", kind: "text", defaultVisible: true },
  { key: "name", kind: "text", defaultVisible: true },
  { key: "description", kind: "text", defaultVisible: false },
  { key: "head", kind: "text", defaultVisible: true },
];

const keys = (resolved: Column[]) => resolved.map((column) => column.key);

describe("readTableParams", () => {
  it("reads columns, sort and filters, ignoring unrelated params", () => {
    const params = new URLSearchParams("entity=teams&cols=id,head&sort=-name&f.head=alice&f.name=squad");
    expect(readTableParams(params)).toEqual({
      cols: ["id", "head"],
      sort: { key: "name", descending: true },
      filters: { head: "alice", name: "squad" },
    });
  });

  it("reports nothing set for a bare URL", () => {
    expect(readTableParams(new URLSearchParams("entity=teams"))).toEqual({
      cols: undefined,
      sort: undefined,
      filters: {},
    });
  });

  it("reads an ascending sort", () => {
    expect(readTableParams(new URLSearchParams("sort=name")).sort).toEqual({ key: "name", descending: false });
  });
});

describe("resolveVisibleColumns", () => {
  it("falls back to the default-visible columns", () => {
    expect(keys(resolveVisibleColumns(columns, undefined))).toEqual(["id", "name", "head"]);
    expect(defaultColumnKeys(columns)).toEqual(["id", "name", "head"]);
  });

  it("honors the requested keys and their order", () => {
    expect(keys(resolveVisibleColumns(columns, ["head", "description", "id"]))).toEqual([
      "head",
      "description",
      "id",
    ]);
  });

  it("drops unknown and duplicate keys", () => {
    expect(keys(resolveVisibleColumns(columns, ["head", "bogus", "head", "id"]))).toEqual(["head", "id"]);
  });

  it("falls back to the defaults when no requested key survives", () => {
    expect(keys(resolveVisibleColumns(columns, ["bogus"]))).toEqual(["id", "name", "head"]);
  });
});

describe("isDefaultLayout", () => {
  it("is true only for the same keys in the same order", () => {
    expect(isDefaultLayout(["id", "name"], ["id", "name"])).toBe(true);
    expect(isDefaultLayout(["name", "id"], ["id", "name"])).toBe(false);
    expect(isDefaultLayout(["id"], ["id", "name"])).toBe(false);
  });
});

describe("entitySearch", () => {
  it("builds a search string with only the entity, or the entity plus a column layout", () => {
    expect(entitySearch("teams", undefined)).toBe("?entity=teams");
    expect(entitySearch("teams", ["id", "name"])).toBe("?entity=teams&cols=id%2Cname");
  });
});

describe("a column key containing a comma", () => {
  it("survives a round trip through the cols param", () => {
    const layout = ["id", "external_references.a,b"];
    const viaColumns = withColumns(new URLSearchParams(), layout, ["id"]);
    expect(readTableParams(new URLSearchParams(viaColumns.toString())).cols).toEqual(layout);
    const viaTabLink = new URLSearchParams(entitySearch("teams", layout));
    expect(readTableParams(viaTabLink).cols).toEqual(layout);
  });
});

describe("a malformed cols param", () => {
  it("is read as written instead of throwing", () => {
    expect(readTableParams(new URLSearchParams("cols=id,100%25")).cols).toEqual(["id", "100%"]);
  });
});

describe("withFilter", () => {
  it("sets a filter, and removes it once emptied, leaving other params alone", () => {
    const set = withFilter(new URLSearchParams("entity=teams"), "head", "ali");
    expect(set.toString()).toBe("entity=teams&f.head=ali");
    expect(withFilter(set, "head", "").toString()).toBe("entity=teams");
  });
});

describe("withSortToggled", () => {
  it("cycles ascending, descending, then off", () => {
    const ascending = withSortToggled(new URLSearchParams(), "name");
    expect(ascending.get("sort")).toBe("name");
    const descending = withSortToggled(ascending, "name");
    expect(descending.get("sort")).toBe("-name");
    expect(withSortToggled(descending, "name").has("sort")).toBe(false);
  });

  it("starts ascending when switching to another column", () => {
    expect(withSortToggled(new URLSearchParams("sort=-name"), "head").get("sort")).toBe("head");
  });
});

describe("withColumns", () => {
  const defaults = ["id", "name", "head"];

  it("writes a non-default layout and omits a default one", () => {
    expect(withColumns(new URLSearchParams("entity=teams"), ["id", "head"], defaults).get("cols")).toBe("id,head");
    expect(withColumns(new URLSearchParams("entity=teams&cols=id"), defaults, defaults).has("cols")).toBe(false);
  });

  it("drops the filter and sort of a column that is no longer visible, keeping the rest", () => {
    const params = new URLSearchParams("entity=teams&sort=-head&f.head=alice&f.name=squad");
    const next = withColumns(params, ["id", "name"], defaults);
    expect(next.has("f.head")).toBe(false);
    expect(next.has("sort")).toBe(false);
    expect(next.get("f.name")).toBe("squad");
    expect(next.get("entity")).toBe("teams");
  });

  it("does not mutate the params it was given", () => {
    const params = new URLSearchParams("entity=teams&f.head=alice");
    withColumns(params, ["id"], defaults);
    expect(params.toString()).toBe("entity=teams&f.head=alice");
  });
});
