import { describe, expect, it } from "vitest";
import { getAuthorityLinesForTeam } from "../../../src/lib/relationships/authority";
import type { OrgData } from "../../../src/lib/orgapi/types";
import orgData from "../../fixtures/three-level-org-data.json";

const { authority_lines: authorityLines } = orgData as unknown as OrgData;

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
