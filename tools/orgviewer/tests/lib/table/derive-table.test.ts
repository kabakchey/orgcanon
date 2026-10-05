import { describe, expect, it } from "vitest";
import { cellText, deriveTable } from "../../../src/lib/table/derive-table";

const teams = {
  alpha: {
    name: "Alpha",
    description: "First.",
    head: "ann-example",
    parent_team: null,
    is_temporary: false,
    external_references: { github_team_slug: "alpha" },
    members: [{ person: "bo-example", role: "owner", deputy: null, is_primary_team: true }],
    reviewable: { owner: "ann-example", expiration_date: "2027-01-01", notes: "" },
  },
  beta: {
    name: "Beta",
    description: "Second.",
    head: "bo-example",
    parent_team: "alpha",
    is_temporary: true,
    external_references: { jira_project: "BET" },
    members: [],
    reviewable: { owner: "bo-example", expiration_date: "2027-06-01", notes: "check" },
  },
};

describe("deriveTable", () => {
  const table = deriveTable("teams", teams);
  const column = (key: string) => table.columns.find((candidate) => candidate.key === key)!;

  it("puts id first, keeps field order, and groups flattened sub-columns with their parent", () => {
    expect(table.columns.map((candidate) => candidate.key)).toEqual([
      "id",
      "name",
      "description",
      "head",
      "parent_team",
      "is_temporary",
      "external_references.github_team_slug",
      "external_references.jira_project",
      "members",
      "reviewable.owner",
      "reviewable.expiration_date",
      "reviewable.notes",
    ]);
  });

  it("classifies column kinds from the values", () => {
    expect(column("is_temporary").kind).toBe("boolean");
    expect(column("members").kind).toBe("objects");
    expect(column("name").kind).toBe("text");
    const lines = deriveTable("authority_lines", { lead: { person: "ann-example", teams: ["alpha", "beta"] } });
    expect(lines.columns.find((candidate) => candidate.key === "teams")).toMatchObject({
      kind: "list",
      target: "teams",
    });
  });

  it("shows id, scalars and scalar lists by default, hiding flattened, object-list and description columns", () => {
    expect(table.columns.filter((candidate) => candidate.defaultVisible).map((candidate) => candidate.key)).toEqual([
      "id",
      "name",
      "head",
      "parent_team",
      "is_temporary",
    ]);
  });

  it("marks reference columns with the collection they point at", () => {
    expect(column("id").target).toBe("teams");
    expect(column("head").target).toBe("people");
    expect(column("parent_team").target).toBe("teams");
    expect(column("reviewable.owner").target).toBe("people");
    expect(column("name").target).toBeUndefined();
  });

  it("builds one row per entity, blank where a map key is absent", () => {
    expect(table.rows.map((row) => row.id)).toEqual(["alpha", "beta"]);
    const [alpha, beta] = table.rows;
    expect(alpha!.values.id).toBe("alpha");
    expect(alpha!.values.parent_team).toBeNull();
    expect(alpha!.values["external_references.github_team_slug"]).toBe("alpha");
    expect(cellText(beta!.values["external_references.github_team_slug"])).toBe("");
    expect(beta!.values["reviewable.notes"]).toBe("check");
  });

  it("summarizes each object-list item as key=value pairs, skipping empty values", () => {
    expect(table.rows[0]!.values.members).toEqual(["person=bo-example, role=owner, is_primary_team=true"]);
    expect(table.rows[1]!.values.members).toEqual([]);
  });

  it("flattens maps nested more than one level", () => {
    const people = deriveTable("people", {
      "ann-example": { name: "Ann Example", extensions: { hr: { hiring_type: "internal" } } },
    });
    expect(people.columns.map((candidate) => candidate.key)).toEqual(["id", "name", "extensions.hr.hiring_type"]);
    expect(people.rows[0]!.values["extensions.hr.hiring_type"]).toBe("internal");
  });

  it("has no columns for an empty collection", () => {
    expect(deriveTable("teams", {})).toEqual({ columns: [], rows: [] });
  });
});

describe("cellText", () => {
  it("renders every cell value as the text shown and exported", () => {
    expect(cellText(["alpha", "beta"])).toBe("alpha; beta");
    expect(cellText(false)).toBe("false");
    expect(cellText(null)).toBe("");
    expect(cellText(undefined)).toBe("");
    expect(cellText("Alpha")).toBe("Alpha");
  });
});
