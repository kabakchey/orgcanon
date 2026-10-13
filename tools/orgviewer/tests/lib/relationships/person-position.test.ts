import { describe, expect, it } from "vitest";
import { currentPositionTitle } from "../../../src/lib/relationships/person-position";
import type { Person, Position } from "../../../src/lib/orgapi/types";

const reviewable = { expiration_date: "2027-01-01", notes: "", owner: "x" };

function position(overrides: Partial<Position>): Position {
  return {
    type: "engineer",
    title: "Engineer",
    start_date: "2024-01-01",
    end_date: null,
    reviewable,
    ...overrides,
  };
}

function person(positions: Position[]): Person {
  return {
    name: "Carol Lee",
    email: "",
    documentation_url: "",
    primary_specialization: "",
    secondary_specializations: [],
    external_references: {},
    positions,
    extensions: {},
    reviewable,
  };
}

describe("currentPositionTitle", () => {
  it("returns null when the person is undefined", () => {
    expect(currentPositionTitle(undefined)).toBeNull();
  });

  it("returns null when the person has no positions", () => {
    expect(currentPositionTitle(person([]))).toBeNull();
  });

  it("returns null when every position has already ended", () => {
    expect(
      currentPositionTitle(person([position({ title: "Former Role", end_date: "2023-01-01" })]))
    ).toBeNull();
  });

  it("returns the open position's title, ignoring past positions", () => {
    expect(
      currentPositionTitle(
        person([
          position({ title: "Junior Engineer", start_date: "2020-01-01", end_date: "2023-12-31" }),
          position({ title: "Senior Engineer", start_date: "2024-01-01", end_date: null }),
        ])
      )
    ).toBe("Senior Engineer");
  });

  it("picks the most recently started open position when more than one is open", () => {
    expect(
      currentPositionTitle(
        person([
          position({ title: "Engineer", start_date: "2022-01-01", end_date: null }),
          position({ title: "Tech Lead", start_date: "2024-06-01", end_date: null }),
        ])
      )
    ).toBe("Tech Lead");
  });
});
