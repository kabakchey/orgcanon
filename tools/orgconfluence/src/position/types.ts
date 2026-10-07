export type PositionKind = "head" | "role" | "authority_line";

/** `id` is a Role id or an AuthorityLine type id; empty for the head, which a team has one of. */
export type PositionRef = { kind: PositionKind; id: string };

export type Position = PositionRef & { text: string };

export type Show = "holder" | "deputy" | "both";

/** What a macro stores on the page. Confluence keeps macro config as strings, hence "" for unset. */
export type MacroConfig = {
  team: string;
  kind: PositionKind;
  positionId: string;
  /** The position's name when the macro was configured -- all there is to show if orgapi is down. */
  positionText: string;
  show: Show;
  override: string;
};

export type PersonView = { name: string; url: string | null; accountId: string | null; isInterim: boolean };

export type HolderView = PersonView & { deputy: PersonView | null };

export type PositionView =
  | { status: "resolved"; text: string; teamUrl: string | null; people: HolderView[] }
  | { status: "vacant"; text: string; teamUrl: string | null }
  | { status: "unknown"; team: string; position: string }
  | { status: "unavailable"; text: string };
