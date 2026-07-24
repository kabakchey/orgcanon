import { describe, expect, it } from "vitest";
import {
  getAuthorityLinesForPerson,
  getAuthorityLinesForTeam,
} from "../../../src/lib/relationships/authority";
import type { OrgData } from "../../../src/lib/orgapi/types";
import orgData from "../../fixtures/three-level-org-data.json";

const { teams, authority_lines: authorityLines } = orgData as unknown as OrgData;

describe("getAuthorityLinesForTeam", () => {
  it("returns lines that explicitly name the team", () => {
    expect(getAuthorityLinesForTeam("platform-squad", authorityLines).map((l) => l.person)).toEqual([
      "carol-lee",
    ]);
  });

  it("does NOT return lines for an ancestor team not explicitly named (no cascade)", () => {
    expect(getAuthorityLinesForTeam("r-and-d", authorityLines)).toEqual([]);
    expect(getAuthorityLinesForTeam("potuto", authorityLines)).toEqual([]);
  });
});

describe("getAuthorityLinesForPerson", () => {
  it("returns lines whose teams include a team the person belongs to", () => {
    // carol-lee is a primary member of platform-squad, which carol-lee-tech-lead names directly
    expect(getAuthorityLinesForPerson("carol-lee", teams, authorityLines).map((l) => l.person)).toEqual([
      "carol-lee",
    ]);
  });

  it("does NOT return lines scoped to a team the person doesn't belong to", () => {
    // vp-eng heads r-and-d (an ancestor of platform-squad), not a team carol-lee-tech-lead names
    expect(getAuthorityLinesForPerson("vp-eng", teams, authorityLines)).toEqual([]);
  });
});
