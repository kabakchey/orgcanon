// Shared by every relationship module that composes a displayed title from a head/deputy/role
// title plus its `is_*interim` flag (person-roles.ts, org-tree-to-flow.ts, authority-over-to-flow.ts).
export function withInterimSuffix(title: string, isInterim: boolean): string {
  return isInterim ? `${title} (interim)` : title;
}
