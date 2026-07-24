import { vi } from "vitest";
import orgData from "./three-level-org-data.json";

const orgDataByEntity = orgData as Record<string, Record<string, unknown>>;

/**
 * Routes by matching which path segment names a known entity key, not by segment position,
 * since baseUrl may itself carry a prefix (e.g. the default ".../api").
 */
export function installMockOrgapiFetch(): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async (input: string) => {
    const url = new URL(input);
    const segments = url.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] ?? "";
    const secondLastSegment = segments[segments.length - 2] ?? "";

    if (Object.hasOwn(orgDataByEntity, secondLastSegment)) {
      const collection = orgDataByEntity[secondLastSegment] ?? {};
      const entity = collection[lastSegment];
      if (!entity) {
        return { ok: false, status: 404, json: async () => ({ detail: "not found" }) };
      }
      return { ok: true, status: 200, json: async () => ({ id: lastSegment, ...(entity as object) }) };
    }

    const collection = orgDataByEntity[lastSegment] ?? {};

    let entries = Object.entries(collection);
    for (const [param, value] of url.searchParams.entries()) {
      entries = entries.filter(([, entity]) => (entity as Record<string, unknown>)[param] === value);
    }

    const body = entries.map(([id, entity]) => ({ id, ...(entity as object) }));
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
