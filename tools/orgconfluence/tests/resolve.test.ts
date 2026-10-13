import { describe, expect, it } from "vitest";
import { OrgApiError, type OrgApi } from "../src/orgapi/client";
import { resolvePosition } from "../src/position/resolve";
import type { MacroConfig } from "../src/position/types";
import { alice, bob, carol, fakeOrgApi, platformHoldings, role } from "./fixtures";

const ORGVIEWER = "https://org.example.com/ui";

function orgApi(overrides: Partial<OrgApi> = {}): OrgApi {
  return fakeOrgApi({
    teamPeople: async (_team, position) =>
      platformHoldings.filter(
        (holding) =>
          !position ||
          (holding.kind === position.kind &&
            (position.kind === "head" ||
              holding.role === position.id ||
              holding.authority_line_type === position.id))
      ),
    positionName: async () => "Platform Owner",
    ...overrides,
  });
}

function config(overrides: Partial<MacroConfig> = {}): MacroConfig {
  return {
    team: "platform",
    kind: "role",
    positionId: "platform-owner",
    positionText: "Platform Owner",
    show: "holder",
    override: "",
    ...overrides,
  };
}

const personUrl = (id: string) => `${ORGVIEWER}/#/entities/people?id=${id}`;
const teamUrl = `${ORGVIEWER}/#/entities/teams?id=platform`;

describe("resolvePosition", () => {
  it("shows every holder of a Role under the Role's own name", async () => {
    expect(await resolvePosition(orgApi(), ORGVIEWER, config())).toEqual({
      status: "resolved",
      text: "Platform Owner",
      teamUrl,
      people: [
        { name: "Bob Santos", url: personUrl(bob.id), accountId: null, isInterim: false, deputy: null },
        { name: "Carol Diaz", url: personUrl(carol.id), accountId: null, isInterim: false, deputy: null },
      ],
    });
  });

  it("attaches each deputy to its own holder when showing both", async () => {
    const view = await resolvePosition(orgApi(), ORGVIEWER, config({ show: "both" }));

    expect(view).toMatchObject({
      text: "Platform Owner",
      people: [
        {
          name: "Bob Santos",
          deputy: { name: "Carol Diaz", url: personUrl(carol.id), accountId: null, isInterim: false },
        },
        { name: "Carol Diaz", deputy: null },
      ],
    });
  });

  it("shows only deputies, under a deputy-prefixed name, when showing deputies", async () => {
    const view = await resolvePosition(orgApi(), ORGVIEWER, config({ show: "deputy" }));

    expect(view).toMatchObject({
      status: "resolved",
      text: "Deputy Platform Owner",
      people: [{ name: "Carol Diaz", deputy: null }],
    });
  });

  it("names the head by its head title and the head deputy by its own title", async () => {
    const headConfig = config({ kind: "head", positionId: "", positionText: "Platform Lead" });

    expect(await resolvePosition(orgApi(), ORGVIEWER, headConfig)).toMatchObject({
      text: "Platform Lead",
      people: [{ name: "Bob Santos", isInterim: false }],
    });
    expect(await resolvePosition(orgApi(), ORGVIEWER, { ...headConfig, show: "deputy" })).toMatchObject({
      text: "Deputy Lead",
      people: [{ name: "Carol Diaz", isInterim: true }],
    });
  });

  it("names an AuthorityLine by its type's title", async () => {
    const view = await resolvePosition(
      orgApi(),
      ORGVIEWER,
      config({ kind: "authority_line", positionId: "tech-lead", positionText: "Tech Lead", show: "both" })
    );

    expect(view).toMatchObject({
      text: "Tech Lead",
      people: [{ name: "Bob Santos", deputy: { name: alice.name } }],
    });
  });

  it("carries a person's Atlassian account id when the org data has one", async () => {
    const view = await resolvePosition(
      orgApi(),
      ORGVIEWER,
      config({ kind: "authority_line", positionId: "tech-lead", positionText: "Tech Lead", show: "both" })
    );

    expect(view).toMatchObject({
      people: [{ name: "Bob Santos", accountId: null, deputy: { name: alice.name, accountId: "557058:alice" } }],
    });
  });

  it("uses the author's override verbatim, deputy prefix included", async () => {
    const view = await resolvePosition(
      orgApi(),
      ORGVIEWER,
      config({ show: "deputy", override: "our platform contact" })
    );

    expect(view).toMatchObject({ text: "our platform contact" });
  });

  it("leaves people and the team unlinked when no orgviewer URL is configured", async () => {
    const view = await resolvePosition(orgApi(), undefined, config());

    expect(view).toMatchObject({ teamUrl: null, people: [{ url: null }, { url: null }] });
  });

  it("tolerates a trailing slash on the orgviewer URL", async () => {
    const view = await resolvePosition(orgApi(), `${ORGVIEWER}/`, config());

    expect(view).toMatchObject({ teamUrl });
  });

  it("is vacant when the Role exists but nobody on the team holds it", async () => {
    const view = await resolvePosition(orgApi({ teamPeople: async () => [] }), ORGVIEWER, config());

    expect(view).toEqual({ status: "vacant", text: "Platform Owner", teamUrl });
  });

  it("is vacant when showing deputies and no holder has one", async () => {
    const view = await resolvePosition(
      orgApi({ teamPeople: async () => [role(bob)] }),
      ORGVIEWER,
      config({ show: "deputy" })
    );

    expect(view).toEqual({ status: "vacant", text: "Deputy Platform Owner", teamUrl });
  });

  it("is unknown when the team no longer exists", async () => {
    const view = await resolvePosition(orgApi({ teamPeople: async () => null }), ORGVIEWER, config());

    expect(view).toEqual({ status: "unknown", team: "platform", position: "platform-owner" });
  });

  it("is unknown when nobody holds the position and it no longer exists", async () => {
    const view = await resolvePosition(
      orgApi({ teamPeople: async () => [], positionName: async () => null }),
      ORGVIEWER,
      config()
    );

    expect(view).toEqual({ status: "unknown", team: "platform", position: "platform-owner" });
  });

  it("is unavailable, under the name saved with the macro, when orgapi cannot be reached", async () => {
    const failing = orgApi({
      teamPeople: async () => {
        throw new OrgApiError("orgapi responded 502");
      },
    });

    expect(await resolvePosition(failing, ORGVIEWER, config())).toEqual({
      status: "unavailable",
      text: "Platform Owner",
    });
    expect(await resolvePosition(failing, ORGVIEWER, config({ show: "deputy" }))).toEqual({
      status: "unavailable",
      text: "Deputy Platform Owner",
    });
  });
});
