import { describe, expect, it } from "vitest";
import {
  deriveLineManager,
  getChainOfCommand,
  getDirectReports,
} from "../../../src/lib/relationships/line-management";
import type { OrgData } from "../../../src/lib/orgapi/types";
import orgData from "../../fixtures/three-level-org-data.json";

const { teams } = orgData as unknown as OrgData;

describe("deriveLineManager", () => {
  it("rule 1 (ordinary member): carol-lee's line manager is platform-squad's head", () => {
    expect(deriveLineManager("carol-lee", teams)).toBe("alice-nguyen");
  });

  it("rule 2 (team head): alice-nguyen's line manager is the parent team's head", () => {
    expect(deriveLineManager("alice-nguyen", teams)).toBe("vp-eng");
  });

  it("rule 2 (team head, one level up): vp-eng's line manager is potuto's head", () => {
    expect(deriveLineManager("vp-eng", teams)).toBe("cto");
  });

  it("rule 3 (head's deputy): bob-diaz's line manager is platform-squad's own head", () => {
    expect(deriveLineManager("bob-diaz", teams)).toBe("alice-nguyen");
  });

  it("root team's head has no line manager", () => {
    expect(deriveLineManager("cto", teams)).toBeNull();
  });
});

describe("getChainOfCommand", () => {
  it("walks the full chain from an ordinary member to the root", () => {
    expect(getChainOfCommand("carol-lee", teams)).toEqual(["alice-nguyen", "vp-eng", "cto"]);
  });

  it("returns an empty chain for the root head", () => {
    expect(getChainOfCommand("cto", teams)).toEqual([]);
  });
});

describe("getDirectReports", () => {
  it("finds the head's deputy and the primary-team member as alice-nguyen's direct reports", () => {
    expect(getDirectReports("alice-nguyen", teams)).toEqual(["bob-diaz", "carol-lee"]);
  });

  it("finds the department head as the org root's direct report", () => {
    expect(getDirectReports("cto", teams)).toEqual(["vp-eng"]);
  });

  it("returns an empty list for someone with no reports", () => {
    expect(getDirectReports("carol-lee", teams)).toEqual([]);
  });
});
