import { describe, expect, it } from "vitest";
import { relationalTargetFor } from "../../../src/lib/orgapi/relational-fields";

describe("relationalTargetFor", () => {
  it("resolves team.head, team.head_deputy, team.parent_team, and team.type", () => {
    expect(relationalTargetFor("teams", "head")).toBe("people");
    expect(relationalTargetFor("teams", "head_deputy")).toBe("people");
    expect(relationalTargetFor("teams", "parent_team")).toBe("teams");
    expect(relationalTargetFor("teams", "type")).toBe("team_types");
  });

  it("resolves component.team, component.dependency_components, and component.type", () => {
    expect(relationalTargetFor("components", "team")).toBe("teams");
    expect(relationalTargetFor("components", "dependency_components")).toBe("components");
    expect(relationalTargetFor("components", "type")).toBe("component_types");
  });

  it("resolves authority_lines.person, .deputy, .teams, and .type", () => {
    expect(relationalTargetFor("authority_lines", "person")).toBe("people");
    expect(relationalTargetFor("authority_lines", "deputy")).toBe("people");
    expect(relationalTargetFor("authority_lines", "teams")).toBe("teams");
    expect(relationalTargetFor("authority_lines", "type")).toBe("authority_line_types");
  });

  it("resolves roles.components", () => {
    expect(relationalTargetFor("roles", "components")).toBe("components");
  });

  it("returns undefined for a non-relational field", () => {
    expect(relationalTargetFor("teams", "description")).toBeUndefined();
    expect(relationalTargetFor("people", "email")).toBeUndefined();
  });
});
