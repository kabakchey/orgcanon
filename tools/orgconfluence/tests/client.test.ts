import { describe, expect, it } from "vitest";
import { createOrgApi, OrgApiError, type Fetch } from "../src/orgapi/client";

type Call = { url: string; headers: Record<string, string> };

function fakeFetch(responses: Record<string, { status: number; body?: unknown; notJson?: true }>) {
  const calls: Call[] = [];
  const fetch: Fetch = async (url, init) => {
    calls.push({ url, headers: init.headers });
    const response = responses[url] ?? { status: 500 };
    const json = async () => {
      if (response.notJson) throw new SyntaxError("Unexpected token '<'");
      return response.body;
    };
    return { status: response.status, ok: response.status < 400, json };
  };
  return { fetch, calls };
}

const BASE = "https://orgapi.example.com";

describe("createOrgApi", () => {
  it("sends the configured headers on every request", async () => {
    const { fetch, calls } = fakeFetch({ [`${BASE}/teams`]: { status: 200, body: [] } });
    const headers = JSON.stringify({ "CF-Access-Client-Id": "id.access", "CF-Access-Client-Secret": "s3cret" });

    await createOrgApi({ baseUrl: BASE, headers }, fetch).listTeams();

    expect(calls[0]?.headers).toEqual({ "CF-Access-Client-Id": "id.access", "CF-Access-Client-Secret": "s3cret" });
  });

  it("sends no headers when none are configured", async () => {
    const { fetch, calls } = fakeFetch({ [`${BASE}/teams`]: { status: 200, body: [] } });

    await createOrgApi({ baseUrl: BASE }, fetch).listTeams();

    expect(calls[0]?.headers).toEqual({});
  });

  it.each(['{"Authorization": "Bearer s3cret"', '["s3cret"]', '{"X-Count": 3}', '"s3cret"'])(
    "fails without sending or echoing anything when the headers are not a JSON object of strings: %s",
    async (headers) => {
      const { fetch, calls } = fakeFetch({ [`${BASE}/teams`]: { status: 200, body: [] } });

      const failure = createOrgApi({ baseUrl: BASE, headers }, fetch).listTeams();

      await expect(failure).rejects.toThrow(new OrgApiError("ORGAPI_HEADERS is not a JSON object of strings"));
      expect(calls).toHaveLength(0);
    }
  );

  it("fails with an OrgApiError when a proxy answers with something other than JSON", async () => {
    const { fetch } = fakeFetch({ [`${BASE}/teams`]: { status: 200, notJson: true } });

    await expect(createOrgApi({ baseUrl: BASE }, fetch).listTeams()).rejects.toBeInstanceOf(OrgApiError);
  });

  it("lists teams by name", async () => {
    const { fetch } = fakeFetch({
      [`${BASE}/teams`]: {
        status: 200,
        body: [
          { id: "platform", name: "Platform", head: "bob-santos" },
          { id: "acme-hq", name: "Acme HQ", head: "alice-nguyen" },
        ],
      },
    });

    expect(await createOrgApi({ baseUrl: `${BASE}/` }, fetch).listTeams()).toEqual([
      { id: "acme-hq", name: "Acme HQ" },
      { id: "platform", name: "Platform" },
    ]);
  });

  it("asks for one position's holdings with the matching filters", async () => {
    const { fetch, calls } = fakeFetch({});
    const api = createOrgApi({ baseUrl: BASE }, fetch);

    await api.teamPeople("platform").catch(() => undefined);
    await api.teamPeople("platform", { kind: "head", id: "" }).catch(() => undefined);
    await api.teamPeople("platform", { kind: "role", id: "platform owner" }).catch(() => undefined);
    await api.teamPeople("a/b", { kind: "authority_line", id: "tech-lead" }).catch(() => undefined);

    expect(calls.map((call) => call.url)).toEqual([
      `${BASE}/teams/platform/people`,
      `${BASE}/teams/platform/people?kind=head`,
      `${BASE}/teams/platform/people?kind=role&role=platform+owner`,
      `${BASE}/teams/a%2Fb/people?kind=authority_line&authority_line_type=tech-lead`,
    ]);
  });

  it("returns null for a team that does not exist", async () => {
    const { fetch } = fakeFetch({ [`${BASE}/teams/gone/people`]: { status: 404 } });

    expect(await createOrgApi({ baseUrl: BASE }, fetch).teamPeople("gone")).toBeNull();
  });

  it("looks a position's display name up by kind, null when it does not exist", async () => {
    const { fetch } = fakeFetch({
      [`${BASE}/roles/platform-owner`]: { status: 200, body: { id: "platform-owner", name: "Platform Owner" } },
      [`${BASE}/authority_line_types/tech-lead`]: { status: 200, body: { id: "tech-lead", title: "Tech Lead" } },
      [`${BASE}/roles/gone`]: { status: 404 },
    });
    const api = createOrgApi({ baseUrl: BASE }, fetch);

    expect(await api.positionName({ kind: "role", id: "platform-owner" })).toBe("Platform Owner");
    expect(await api.positionName({ kind: "authority_line", id: "tech-lead" })).toBe("Tech Lead");
    expect(await api.positionName({ kind: "role", id: "gone" })).toBeNull();
  });

  it("lists and fetches entities of any type by orgapi's own route names", async () => {
    const component = { id: "api", name: "API" };
    const { fetch, calls } = fakeFetch({
      [`${BASE}/components`]: { status: 200, body: [component] },
      [`${BASE}/authority_line_types/tech%20lead`]: { status: 200, body: { id: "tech lead", title: "Tech Lead" } },
      [`${BASE}/people/gone`]: { status: 404 },
    });
    const api = createOrgApi({ baseUrl: BASE }, fetch);

    expect(await api.listEntities("components")).toEqual([component]);
    expect(await api.getEntity("authority_line_types", "tech lead")).toEqual({ id: "tech lead", title: "Tech Lead" });
    expect(await api.getEntity("people", "gone")).toBeNull();
    expect(calls).toHaveLength(3);
  });

  it("fails with an OrgApiError on any other error status, a network failure, or no base URL", async () => {
    const { fetch } = fakeFetch({});
    const offline: Fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await expect(createOrgApi({ baseUrl: BASE }, fetch).listTeams()).rejects.toBeInstanceOf(OrgApiError);
    await expect(createOrgApi({ baseUrl: BASE }, offline).listTeams()).rejects.toBeInstanceOf(OrgApiError);
    await expect(createOrgApi({}, fetch).listTeams()).rejects.toBeInstanceOf(OrgApiError);
  });
});
