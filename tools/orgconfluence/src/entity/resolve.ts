import { atlassianAccountId, OrgApiError, type OrgApi } from "../orgapi/client";
import { entityUrl } from "../orgviewer";
import { displayName, inactiveNote, type AuthorityLine } from "./names";
import type { EntityConfig, EntityView } from "./types";

/** What to show when orgapi cannot be asked: the name saved with the macro. */
export function unavailable(config: EntityConfig): EntityView {
  return { status: "unavailable", name: config.name };
}

/** `today` is an ISO-8601 date. */
export async function resolveEntity(
  orgApi: OrgApi,
  orgviewerUrl: string | undefined,
  config: EntityConfig,
  today: string
): Promise<EntityView> {
  try {
    const record = await orgApi.getEntity(config.type, config.id);
    if (record === null) return { status: "unknown", type: config.type, id: config.id };

    const url = entityUrl(orgviewerUrl, config.type, config.id);
    if (config.type !== "authority_lines") {
      const accountId = config.type === "people" ? atlassianAccountId(record) : null;
      return { status: "resolved", name: displayName(record), url, accountId, holder: null, note: null };
    }

    const line = record as AuthorityLine;
    const [type, person] = await Promise.all([
      orgApi.getEntity("authority_line_types", line.type),
      orgApi.getEntity("people", line.person),
    ]);
    return {
      status: "resolved",
      name: type ? displayName(type) : line.type,
      url,
      accountId: null,
      holder: {
        name: person ? displayName(person) : line.person,
        url: entityUrl(orgviewerUrl, "people", line.person),
        accountId: person ? atlassianAccountId(person) : null,
      },
      note: inactiveNote(line, today),
    };
  } catch (error) {
    if (error instanceof OrgApiError) return unavailable(config);
    throw error;
  }
}
