import type { Person } from "../orgapi/types";

// A person's current formal position -- as opposed to a team-membership title (see
// person-roles.ts), which describes what they do *for a given team*, not their own formal job
// title. "Current" means still open (end_date === null); if more than one position is open at
// once (a data inconsistency, not something the schema forbids), the most recently started one
// wins. A person with no open position has no current title at all.
export function currentPositionTitle(person: Person | undefined): string | null {
  if (!person) return null;
  const open = person.positions.filter((position) => position.end_date === null);
  if (open.length === 0) return null;
  const current = open.reduce((latest, position) =>
    position.start_date > latest.start_date ? position : latest
  );
  return current.title;
}
