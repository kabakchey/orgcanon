import { describe, expect, it } from "vitest";
import { parseEntityConfig } from "../src/entity/config";
import { entityOptions } from "../src/entity/options";
import { resolveEntity } from "../src/entity/resolve";
import { entitySegments } from "../src/entity/segments";
import type { EntityConfig, EntityView } from "../src/entity/types";
import { OrgApiError, type EntityRecord, type EntityType, type OrgApi } from "../src/orgapi/client";

import { fakeOrgApi } from "./fixtures";

const ORGVIEWER = "https://org.example.com/ui";
const TODAY = "2026-06-15";

const DATA: Partial<Record<EntityType, EntityRecord[]>> = {
  people: [
    { id: "bob-santos", name: "Bob Santos", external_references: { atlassian_account_id: "557058:bob" } },
    { id: "alice-nguyen", name: "Alice Nguyen", external_references: { atlassian_account_id: " " } },
    { id: "alice-nguyen-2", name: "Alice Nguyen" },
  ],
  teams: [
    { id: "platform", name: "Platform" },
    { id: "payments", name: "Payments" },
  ],
  components: [{ id: "api", name: "API" }],
  team_types: [{ id: "squad", title: "Squad" }],
  authority_line_types: [{ id: "tech-lead", title: "Tech Lead" }],
  authority_lines: [
    line("bob-tech-lead", "bob-santos", { teams: ["platform", "payments"] }),
    line("alice-ended", "alice-nguyen", { end_date: "2026-06-14" }),
    line("alice-last-day", "alice-nguyen", { end_date: TODAY }),
    line("alice-upcoming", "alice-nguyen", { start_date: "2027-01-01" }),
  ],
};

function line(id: string, person: string, extra: Record<string, unknown> = {}): EntityRecord {
  return { id, person, type: "tech-lead", start_date: "2025-01-01", end_date: null, teams: ["platform"], ...extra };
}

function orgApi(overrides: Partial<OrgApi> = {}): OrgApi {
  return fakeOrgApi({
    listEntities: async (type) => DATA[type] ?? [],
    getEntity: async (type, id) => (DATA[type] ?? []).find((record) => record.id === id) ?? null,
    ...overrides,
  });
}

const offline = orgApi({
  listEntities: async () => {
    throw new OrgApiError("orgapi responded 502");
  },
  getEntity: async () => {
    throw new OrgApiError("orgapi responded 502");
  },
});

const url = (type: EntityType, id: string) => `${ORGVIEWER}/#/entities/${type}?id=${id}`;
const text = (view: EntityView) =>
  entitySegments(view)
    .map((segment) => segment.text)
    .join("");

describe("entityOptions", () => {
  it("lists entities by name, with the id to tell namesakes apart", async () => {
    expect(await entityOptions(orgApi(), "people", TODAY)).toEqual([
      { id: "alice-nguyen", name: "Alice Nguyen", label: "Alice Nguyen (alice-nguyen)" },
      { id: "alice-nguyen-2", name: "Alice Nguyen", label: "Alice Nguyen (alice-nguyen-2)" },
      { id: "bob-santos", name: "Bob Santos", label: "Bob Santos (bob-santos)" },
    ]);
  });

  it("names the type lists by their title", async () => {
    expect(await entityOptions(orgApi(), "team_types", TODAY)).toEqual([
      { id: "squad", name: "Squad", label: "Squad (squad)" },
    ]);
  });

  it("lists only authority lines active today, by type, holder and teams", async () => {
    expect(await entityOptions(orgApi(), "authority_lines", TODAY)).toEqual([
      { id: "alice-last-day", name: "Tech Lead (Alice Nguyen)", label: "Tech Lead — Alice Nguyen (Platform)" },
      {
        id: "bob-tech-lead",
        name: "Tech Lead (Bob Santos)",
        label: "Tech Lead — Bob Santos (Platform, Payments)",
      },
    ]);
  });
});

describe("resolveEntity", () => {
  const config = (overrides: Partial<EntityConfig> = {}): EntityConfig => ({
    type: "teams",
    id: "platform",
    name: "Platform Squad",
    ...overrides,
  });

  it("shows the entity's current name, linked to its orgviewer page", async () => {
    const view = await resolveEntity(orgApi(), ORGVIEWER, config(), TODAY);

    expect(view).toEqual({
      status: "resolved",
      name: "Platform",
      url: url("teams", "platform"),
      accountId: null,
      holder: null,
      note: null,
    });
    expect(entitySegments(view)).toEqual([{ text: "Platform", href: url("teams", "platform") }]);
  });

  it("leaves the name unlinked when no orgviewer URL is configured", async () => {
    const view = await resolveEntity(orgApi(), undefined, config(), TODAY);

    expect(entitySegments(view)).toEqual([{ text: "Platform" }]);
  });

  it("shows an authority line as its type and holder, each linked", async () => {
    const view = await resolveEntity(orgApi(), ORGVIEWER, config({ type: "authority_lines", id: "bob-tech-lead" }), TODAY);

    expect(entitySegments(view)).toEqual([
      { text: "Tech Lead", href: url("authority_lines", "bob-tech-lead") },
      { text: " (" },
      { text: "Bob Santos", accountId: "557058:bob" },
      { text: "\u00a0" },
      { text: "↗", href: url("people", "bob-santos") },
      { text: ")" },
    ]);
  });

  it("links a person with an Atlassian account to it, and one without to orgviewer", async () => {
    const person = (id: string) => resolveEntity(orgApi(), ORGVIEWER, config({ type: "people", id }), TODAY);

    expect(entitySegments(await person("bob-santos"))).toEqual([
      { text: "Bob Santos", accountId: "557058:bob" },
      { text: "\u00a0" },
      { text: "↗", href: url("people", "bob-santos") },
    ]);
    expect(entitySegments(await person("alice-nguyen"))).toEqual([
      { text: "Alice Nguyen", href: url("people", "alice-nguyen") },
    ]);
    expect(entitySegments(await person("alice-nguyen-2"))).toEqual([
      { text: "Alice Nguyen", href: url("people", "alice-nguyen-2") },
    ]);
  });

  it("marks an authority line that has ended or not yet started", async () => {
    const lineView = (id: string) => resolveEntity(orgApi(), ORGVIEWER, config({ type: "authority_lines", id }), TODAY);

    expect(text(await lineView("alice-ended"))).toBe("Tech Lead (Alice Nguyen, ended)");
    expect(text(await lineView("alice-last-day"))).toBe("Tech Lead (Alice Nguyen)");
    expect(text(await lineView("alice-upcoming"))).toBe("Tech Lead (Alice Nguyen, from 2027-01-01)");
  });

  it("is a visible error naming the entity when it no longer exists", async () => {
    const view = await resolveEntity(orgApi(), ORGVIEWER, config({ id: "gone" }), TODAY);

    expect(view).toEqual({ status: "unknown", type: "teams", id: "gone" });
    expect(text(view)).toBe("⚠ unknown team: gone");
    expect(text({ status: "unknown", type: "authority_line_types", id: "x" })).toBe(
      "⚠ unknown authority line type: x"
    );
  });

  it("shows the name saved with the macro, marked unavailable, when orgapi cannot be reached", async () => {
    const view = await resolveEntity(offline, ORGVIEWER, config(), TODAY);

    expect(view).toEqual({ status: "unavailable", name: "Platform Squad" });
    expect(text(view)).toBe("Platform Squad (⚠ unavailable)");
  });
});

describe("parseEntityConfig", () => {
  it("reads a stored macro config", () => {
    const stored = { type: "components", id: "api", name: "API" };

    expect(parseEntityConfig(stored)).toEqual(stored);
  });

  it("is null for a macro that has not been configured", () => {
    expect(parseEntityConfig(undefined)).toBeNull();
    expect(parseEntityConfig({ type: "components", id: "" })).toBeNull();
    expect(parseEntityConfig({ type: "widgets", id: "api" })).toBeNull();
  });
});
