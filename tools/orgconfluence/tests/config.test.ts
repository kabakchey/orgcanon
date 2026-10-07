import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/position/config";

const stored = {
  team: "platform",
  kind: "role",
  positionId: "platform-owner",
  positionText: "Platform Owner",
  show: "both",
  override: "  our platform contact ",
};

describe("parseConfig", () => {
  it("reads a stored macro config, trimming the override", () => {
    expect(parseConfig(stored)).toEqual({ ...stored, override: "our platform contact" });
  });

  it("is null for a macro that has not been configured", () => {
    expect(parseConfig(undefined)).toBeNull();
    expect(parseConfig({})).toBeNull();
    expect(parseConfig({ ...stored, team: "" })).toBeNull();
    expect(parseConfig({ ...stored, kind: "manager" })).toBeNull();
    expect(parseConfig({ ...stored, positionId: "" })).toBeNull();
  });

  it("needs no position id for the head", () => {
    expect(parseConfig({ team: "platform", kind: "head" })).toMatchObject({ kind: "head", positionId: "" });
  });

  it("shows the holder unless told otherwise", () => {
    expect(parseConfig({ ...stored, show: "everyone" })).toMatchObject({ show: "holder" });
    expect(parseConfig({ ...stored, show: undefined, override: undefined })).toMatchObject({
      show: "holder",
      override: "",
    });
  });
});
