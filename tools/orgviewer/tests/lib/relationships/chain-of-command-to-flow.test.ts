import { describe, expect, it } from "vitest";
import { chainOfCommandToFlow } from "../../../src/lib/relationships/chain-of-command-to-flow";
import type { OrgData } from "../../../src/lib/orgapi/types";
import orgData from "../../fixtures/three-level-org-data.json";

const { teams, people } = orgData as unknown as OrgData;

describe("chainOfCommandToFlow", () => {
  it("builds one person node per link in the chain, no team nodes", () => {
    const { nodes } = chainOfCommandToFlow("carol-lee", teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:carol-lee", "person:alice-nguyen", "person:vp-eng", "person:cto"].sort()
    );
    expect(nodes.every((n) => n.type === "person")).toBe(true);
  });

  it("draws edges from manager to report, so the manager lays out above (ELK DOWN direction)", () => {
    const { edges } = chainOfCommandToFlow("carol-lee", teams, people);

    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:alice-nguyen", target: "person:carol-lee" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:vp-eng", target: "person:alice-nguyen" })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({ source: "person:cto", target: "person:vp-eng" })
    );
  });

  it("puts the selected person's primary team name on their card", () => {
    const { nodes } = chainOfCommandToFlow("carol-lee", teams, people);

    const carol = nodes.find((n) => n.id === "person:carol-lee");
    expect(carol?.data).toMatchObject({ teamName: "Platform Squad" });

    const vpEng = nodes.find((n) => n.id === "person:vp-eng");
    expect(vpEng?.data).toMatchObject({ teamName: "R&D" });
  });

  it("puts the person's documentation_url on their card", () => {
    const { nodes } = chainOfCommandToFlow("carol-lee", teams, people);

    const carol = nodes.find((n) => n.id === "person:carol-lee");
    expect(carol?.data).toMatchObject({ documentationUrl: "https://example.com/people/carol-lee" });
  });

  it("draws no chain: edges for the root of the org (no manager), only its downward reports", () => {
    const { edges } = chainOfCommandToFlow("cto", teams, people);

    expect(edges.some((e) => e.id.startsWith("chain:"))).toBe(false);
    expect(edges.every((e) => e.id.startsWith("reports:"))).toBe(true);
  });

  it("also includes the selected person's own subordinates, recursively, as person nodes", () => {
    const { nodes } = chainOfCommandToFlow("alice-nguyen", teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:alice-nguyen", "person:vp-eng", "person:cto", "person:bob-diaz", "person:carol-lee"].sort()
    );
  });

  it("draws reports: edges from manager to subordinate for the downward subtree, separate from the chain: edges", () => {
    const { edges } = chainOfCommandToFlow("alice-nguyen", teams, people);

    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "reports:alice-nguyen->bob-diaz",
        source: "person:alice-nguyen",
        target: "person:bob-diaz",
      })
    );
    expect(edges).toContainEqual(
      expect.objectContaining({
        id: "reports:alice-nguyen->carol-lee",
        source: "person:alice-nguyen",
        target: "person:carol-lee",
      })
    );
    expect(edges.some((e) => e.id.startsWith("chain:"))).toBe(true);
  });

  it("does not duplicate a subordinate that also happens to be an ancestor's other report (recursive descent, no unrelated siblings)", () => {
    const { nodes } = chainOfCommandToFlow("cto", teams, people);

    expect(nodes.map((n) => n.id).sort()).toEqual(
      ["person:cto", "person:vp-eng", "person:alice-nguyen", "person:bob-diaz", "person:carol-lee"].sort()
    );
  });
});
