import type { Holding, OrgApi } from "../src/orgapi/client";

/** An orgapi that knows nothing; a test overrides the calls it cares about. */
export function fakeOrgApi(overrides: Partial<OrgApi> = {}): OrgApi {
  return {
    listTeams: async () => [],
    teamPeople: async () => null,
    positionName: async () => null,
    listEntities: async () => [],
    getEntity: async () => null,
    ...overrides,
  };
}

function person(id: string, name: string, external_references: Record<string, string> = {}) {
  return { id, name, external_references };
}

export const bob = person("bob-santos", "Bob Santos");
export const carol = person("carol-diaz", "Carol Diaz");
export const alice = person("alice-nguyen", "Alice Nguyen", { atlassian_account_id: "557058:alice" });

const none = {
  title: null,
  role: null,
  role_name: null,
  authority_line: null,
  authority_line_type: null,
  authority_line_type_title: null,
};

export function head(who: typeof bob, title: string, extra: Partial<Holding> = {}): Holding {
  return { ...none, person: who, kind: "head", deputy_for: null, is_interim: false, title, ...extra };
}

export function role(who: typeof bob, extra: Partial<Holding> = {}): Holding {
  return {
    ...none,
    person: who,
    kind: "role",
    deputy_for: null,
    is_interim: false,
    title: "Senior Platform Owner",
    role: "platform-owner",
    role_name: "Platform Owner",
    ...extra,
  };
}

export function authorityLine(who: typeof bob, extra: Partial<Holding> = {}): Holding {
  return {
    ...none,
    person: who,
    kind: "authority_line",
    deputy_for: null,
    is_interim: false,
    authority_line: "bob-tech-lead",
    authority_line_type: "tech-lead",
    authority_line_type_title: "Tech Lead",
    ...extra,
  };
}

export const platformHoldings: Holding[] = [
  head(bob, "Platform Lead"),
  head(carol, "Deputy Lead", { deputy_for: bob.id, is_interim: true }),
  role(bob),
  role(carol, { deputy_for: bob.id, title: null }),
  role(carol),
  authorityLine(bob),
  authorityLine(alice, { deputy_for: bob.id }),
];
