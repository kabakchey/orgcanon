import type { EntityType } from "../orgapi/client";

/** What a macro stores on the page. */
export type EntityConfig = {
  type: EntityType;
  id: string;
  /** The entity's name when the macro was configured -- all there is to show if orgapi is down. */
  name: string;
};

export type EntityOption = { id: string; name: string; label: string };

export type EntityView =
  | {
      status: "resolved";
      name: string;
      url: string | null;
      /** Set only for a person who has an Atlassian account. */
      accountId: string | null;
      /** Set only for an authority line, which is shown as its type and who holds it. */
      holder: { name: string; url: string | null; accountId: string | null } | null;
      note: string | null;
    }
  | { status: "unknown"; type: EntityType; id: string }
  | { status: "unavailable"; name: string };
