import { atlassianAccountId, OrgApiError, type Holding, type OrgApi } from "../orgapi/client";
import { entityUrl } from "../orgviewer";
import type { HolderView, MacroConfig, PersonView, PositionView } from "./types";

const DEPUTY_PREFIX = "Deputy ";

function nameOf(holding: Holding): string | null {
  if (holding.kind === "head") return holding.title;
  return holding.kind === "role" ? holding.role_name : holding.authority_line_type_title;
}

/** orgapi lists each deputy straight after the holder it backs up, so adjacency pairs them. */
function groupByHolder(holdings: Holding[]): { holder: Holding; deputy: Holding | null }[] {
  const groups: { holder: Holding; deputy: Holding | null }[] = [];
  for (const holding of holdings) {
    const last = groups.at(-1);
    if (holding.deputy_for === null) groups.push({ holder: holding, deputy: null });
    else if (last) last.deputy = holding;
  }
  return groups;
}

function namer(config: MacroConfig): (name: string) => string {
  return (name) => config.override || (config.show === "deputy" ? `${DEPUTY_PREFIX}${name}` : name);
}

/** What to show when orgapi cannot be asked: the name saved with the macro, and nobody's. */
export function unavailable(config: MacroConfig): PositionView {
  return { status: "unavailable", text: namer(config)(config.positionText) };
}

export async function resolvePosition(
  orgApi: OrgApi,
  orgviewerUrl: string | undefined,
  config: MacroConfig
): Promise<PositionView> {
  const deputiesOnly = config.show === "deputy";
  const named = namer(config);
  const position = { kind: config.kind, id: config.positionId };
  const unknown: PositionView = { status: "unknown", team: config.team, position: config.positionId };

  try {
    const holdings = await orgApi.teamPeople(config.team, position);
    if (holdings === null) return unknown;

    const teamUrl = entityUrl(orgviewerUrl, "teams", config.team);
    const groups = groupByHolder(holdings);
    const firstHolder = groups[0]?.holder;
    const name = firstHolder ? nameOf(firstHolder) : await orgApi.positionName(position);
    if (name === null) return unknown;

    const view = (holding: Holding): PersonView => ({
      name: holding.person.name,
      url: entityUrl(orgviewerUrl, "people", holding.person.id),
      accountId: atlassianAccountId(holding.person),
      isInterim: holding.is_interim,
    });
    const deputies = groups.flatMap((group) => (group.deputy ? [group.deputy] : []));
    const people: HolderView[] = deputiesOnly
      ? deputies.map((deputy) => ({ ...view(deputy), deputy: null }))
      : groups.map((group) => ({
          ...view(group.holder),
          deputy: config.show === "both" && group.deputy ? view(group.deputy) : null,
        }));

    // A head deputy carries its own title; every other deputy is named after what it deputises for.
    const deputyTitle = deputiesOnly && config.kind === "head" ? deputies[0]?.title : null;
    const text = config.override || deputyTitle || named(name);
    return people.length > 0 ? { status: "resolved", text, teamUrl, people } : { status: "vacant", text, teamUrl };
  } catch (error) {
    if (error instanceof OrgApiError) return unavailable(config);
    throw error;
  }
}
