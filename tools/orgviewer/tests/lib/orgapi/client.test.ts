import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEntities, fetchEntityById } from "../../../src/lib/orgapi/client";

function mockFetchOnce(body: unknown): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchEntities", () => {
  it("requests the entity's collection endpoint and reshapes the array into a Record keyed by id", async () => {
    const mock = mockFetchOnce([
      { id: "acme-hq", name: "Acme HQ" },
      { id: "platform-squad", name: "Platform Squad" },
    ]);

    const result = await fetchEntities("teams", "http://orgapi.example");

    expect(mock).toHaveBeenCalledWith("http://orgapi.example/teams");
    expect(result).toEqual({
      "acme-hq": { name: "Acme HQ" },
      "platform-squad": { name: "Platform Squad" },
    });
  });

  it("appends filter params to the query string", async () => {
    const mock = mockFetchOnce([{ id: "api", name: "API", team: "platform" }]);

    await fetchEntities("components", "http://orgapi.example", { team: "platform" });

    expect(mock).toHaveBeenCalledWith("http://orgapi.example/components?team=platform");
  });
});

describe("fetchEntityById", () => {
  it("requests the entity's by-id endpoint and strips the id back out of the body", async () => {
    const mock = mockFetchOnce({ id: "bob-santos", name: "Bob Santos" });

    const result = await fetchEntityById("people", "http://orgapi.example", "bob-santos");

    expect(mock).toHaveBeenCalledWith("http://orgapi.example/people/bob-santos");
    expect(result).toEqual({ name: "Bob Santos" });
  });

  it("returns undefined on a 404 instead of throwing", async () => {
    const mock = vi.fn().mockResolvedValue({ status: 404, ok: false, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", mock);

    const result = await fetchEntityById("people", "http://orgapi.example", "does-not-exist");

    expect(result).toBeUndefined();
  });

  it("throws for other non-ok statuses", async () => {
    const mock = vi.fn().mockResolvedValue({ status: 500, ok: false, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", mock);

    await expect(fetchEntityById("people", "http://orgapi.example", "bob-santos")).rejects.toThrow();
  });
});
