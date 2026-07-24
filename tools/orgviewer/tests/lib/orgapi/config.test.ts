import { beforeEach, describe, expect, it } from "vitest";
import { getOrgapiBaseUrl, setOrgapiBaseUrl } from "../../../src/lib/orgapi/config";

describe("getOrgapiBaseUrl", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to the current origin plus /api when nothing is stored", () => {
    expect(getOrgapiBaseUrl()).toBe(`${window.location.origin}/api`);
  });

  it("returns a previously saved value instead of the default", () => {
    setOrgapiBaseUrl("http://127.0.0.1:8387");

    expect(getOrgapiBaseUrl()).toBe("http://127.0.0.1:8387");
  });
});
