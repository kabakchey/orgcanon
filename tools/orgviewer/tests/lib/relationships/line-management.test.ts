import { describe, expect, it } from "vitest";
import {
  deriveLineManager,
  deriveLineManagerLink,
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

  it("rule 2 uses the head's primary team when they also head a non-primary child team listed first", () => {
    const multiHeadTeams = {
      "a-interim-squad": {
        ...teams["platform-squad"]!,
        parent_team: "r-and-d",
        head: "vp-eng",
        head_deputy: null,
        is_head_primary_team: false,
        is_head_deputy_primary_team: null,
      },
      ...teams,
    };

    expect(deriveLineManager("vp-eng", multiHeadTeams)).toBe("cto");
  });

  it("rule 3 uses the deputy's primary team when they also deputize a non-primary team listed first", () => {
    const multiDeputyTeams = {
      "a-interim-squad": {
        ...teams["platform-squad"]!,
        parent_team: "r-and-d",
        head: "vp-eng",
        head_deputy: "bob-diaz",
        is_head_primary_team: false,
        is_head_deputy_primary_team: false,
      },
      ...teams,
    };

    expect(deriveLineManager("bob-diaz", multiDeputyTeams)).toBe("alice-nguyen");
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

describe("deriveLineManagerLink", () => {
  it("marks a member's and a deputy's link non-hierarchical when their team is (platform-squad)", () => {
    expect(deriveLineManagerLink("carol-lee", teams)).toEqual({ managerId: "alice-nguyen", hierarchical: false });
    expect(deriveLineManagerLink("bob-diaz", teams)).toEqual({ managerId: "alice-nguyen", hierarchical: false });
  });

  it("marks a head's link non-hierarchical when either their team or the parent team is", () => {
    expect(deriveLineManagerLink("alice-nguyen", teams)).toEqual({ managerId: "vp-eng", hierarchical: false });
    expect(deriveLineManagerLink("vp-eng", teams)).toEqual({ managerId: "cto", hierarchical: true });
  });

  it("returns null with no line manager", () => {
    expect(deriveLineManagerLink("cto", teams)).toBeNull();
  });
});
