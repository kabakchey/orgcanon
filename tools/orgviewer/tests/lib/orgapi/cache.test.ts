import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchEntitiesMock = vi.fn();
const fetchEntityByIdMock = vi.fn();
vi.mock("../../../src/lib/orgapi/client", () => ({
  fetchEntities: (...args: unknown[]) => fetchEntitiesMock(...args),
  fetchEntityById: (...args: unknown[]) => fetchEntityByIdMock(...args),
}));

import { clearEntityCache, getCachedEntities, getCachedEntityById } from "../../../src/lib/orgapi/cache";

beforeEach(() => {
  fetchEntitiesMock.mockReset();
  fetchEntityByIdMock.mockReset();
  clearEntityCache();
});

describe("getCachedEntities", () => {
  it("only fetches once for repeated calls with the same entity+baseUrl+filters", async () => {
    fetchEntitiesMock.mockResolvedValue({ "acme-hq": { name: "Acme HQ" } });

    const first = await getCachedEntities("teams", "http://orgapi.example");
    const second = await getCachedEntities("teams", "http://orgapi.example");

    expect(fetchEntitiesMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("fetches independently for a different entity or different filters", async () => {
    fetchEntitiesMock.mockResolvedValue({});

    await getCachedEntities("teams", "http://orgapi.example");
    await getCachedEntities("people", "http://orgapi.example");
    await getCachedEntities("components", "http://orgapi.example", { team: "platform" });
    await getCachedEntities("components", "http://orgapi.example", { team: "growth" });

    expect(fetchEntitiesMock).toHaveBeenCalledTimes(4);
  });

  it("dedupes concurrent in-flight requests, not just resolved ones", async () => {
    let resolve!: (value: unknown) => void;
    fetchEntitiesMock.mockReturnValue(new Promise((r) => (resolve = r)));

    const firstCall = getCachedEntities("teams", "http://orgapi.example");
    const secondCall = getCachedEntities("teams", "http://orgapi.example");
    resolve({ "acme-hq": { name: "Acme HQ" } });
    await Promise.all([firstCall, secondCall]);

    expect(fetchEntitiesMock).toHaveBeenCalledTimes(1);
  });
});

describe("getCachedEntityById", () => {
  it("only fetches once for repeated calls with the same entity+baseUrl+id", async () => {
    fetchEntityByIdMock.mockResolvedValue({ name: "Bob Santos" });

    const first = await getCachedEntityById("people", "http://orgapi.example", "bob-santos");
    const second = await getCachedEntityById("people", "http://orgapi.example", "bob-santos");

    expect(fetchEntityByIdMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("fetches independently for a different entity, baseUrl, or id", async () => {
    fetchEntityByIdMock.mockResolvedValue(undefined);

    await getCachedEntityById("people", "http://orgapi.example", "bob-santos");
    await getCachedEntityById("teams", "http://orgapi.example", "bob-santos");
    await getCachedEntityById("people", "http://orgapi.example", "carol-diaz");

    expect(fetchEntityByIdMock).toHaveBeenCalledTimes(3);
  });

  it("is independent of getCachedEntities' cache", async () => {
    fetchEntitiesMock.mockResolvedValue({});
    fetchEntityByIdMock.mockResolvedValue({ name: "Bob Santos" });

    await getCachedEntities("people", "http://orgapi.example");
    await getCachedEntityById("people", "http://orgapi.example", "bob-santos");

    expect(fetchEntitiesMock).toHaveBeenCalledTimes(1);
    expect(fetchEntityByIdMock).toHaveBeenCalledTimes(1);
  });
});
