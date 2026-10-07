import { describe, expect, it } from "vitest";
import { positionsOf } from "../src/position/positions";
import { authorityLine, bob, carol, platformHoldings } from "./fixtures";

describe("positionsOf", () => {
  it("lists the head, then each distinct Role, then each distinct AuthorityLine type", () => {
    expect(positionsOf(platformHoldings)).toEqual([
      { kind: "head", id: "", text: "Platform Lead" },
      { kind: "role", id: "platform-owner", text: "Platform Owner" },
      { kind: "authority_line", id: "tech-lead", text: "Tech Lead" },
    ]);
  });

  it("lists an AuthorityLine type once however many lines of that type cover the team", () => {
    const holdings = [authorityLine(bob), authorityLine(carol, { authority_line: "carol-tech-lead" })];

    expect(positionsOf(holdings)).toEqual([{ kind: "authority_line", id: "tech-lead", text: "Tech Lead" }]);
  });
});
