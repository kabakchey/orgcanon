import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearColumnLayout, loadColumnLayout, saveColumnLayout } from "../../../src/lib/table/column-memory";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("column layout memory", () => {
  it("remembers a layout per entity type", () => {
    saveColumnLayout("teams", ["id", "head"]);
    saveColumnLayout("people", ["id", "email"]);
    expect(loadColumnLayout("teams")).toEqual(["id", "head"]);
    expect(loadColumnLayout("people")).toEqual(["id", "email"]);
    expect(loadColumnLayout("roles")).toBeUndefined();
  });

  it("forgets a cleared layout", () => {
    saveColumnLayout("teams", ["id", "head"]);
    clearColumnLayout("teams");
    expect(loadColumnLayout("teams")).toBeUndefined();
  });

  it("treats corrupt or wrongly-shaped stored data as no layout", () => {
    localStorage.setItem("orgviewer-entities-columns:teams", "{not json");
    expect(loadColumnLayout("teams")).toBeUndefined();
    localStorage.setItem("orgviewer-entities-columns:teams", JSON.stringify({ id: true }));
    expect(loadColumnLayout("teams")).toBeUndefined();
    localStorage.setItem("orgviewer-entities-columns:teams", JSON.stringify([]));
    expect(loadColumnLayout("teams")).toBeUndefined();
  });

  it("survives storage being unavailable", () => {
    const unavailable = () => {
      throw new Error("storage blocked");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(unavailable);
    expect(loadColumnLayout("teams")).toBeUndefined();
    expect(() => saveColumnLayout("teams", ["id"])).not.toThrow();
    expect(() => clearColumnLayout("teams")).not.toThrow();
  });
});
