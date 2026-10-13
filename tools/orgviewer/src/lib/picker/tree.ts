import { deriveLineManager } from "../relationships/line-management";
import type { Component, Person, Team } from "../orgapi/types";

// `key` identifies the row; `value` is the id a selection sets, absent for group-only rows.
export interface TreeItem {
  key: string;
  value?: string;
  label: string;
  children: TreeItem[];
}

export interface TreeRow {
  item: TreeItem;
  level: number;
  parentKey: string | null;
}

function byLabel(a: TreeItem, b: TreeItem): number {
  return a.label.localeCompare(b.label);
}

// Generic parent-pointer -> tree. Anything unreachable from a real root (missing parent, or a
// cycle) is promoted to a root instead of silently dropped.
function buildTree(ids: string[], parentOf: (id: string) => string | null, toItem: (id: string) => TreeItem): TreeItem[] {
  const idSet = new Set(ids);
  const childIds = new Map<string, string[]>();
  const rootIds: string[] = [];
  for (const id of ids) {
    const parent = parentOf(id);
    if (parent === null || parent === id || !idSet.has(parent)) {
      rootIds.push(id);
    } else {
      childIds.set(parent, [...(childIds.get(parent) ?? []), id]);
    }
  }

  const placed = new Set<string>();
  const build = (id: string): TreeItem => {
    placed.add(id);
    const item = toItem(id);
    for (const child of childIds.get(id) ?? []) {
      if (!placed.has(child)) item.children.push(build(child));
    }
    item.children.sort(byLabel);
    return item;
  };

  const roots = rootIds.map(build);
  for (const id of ids) {
    if (!placed.has(id)) roots.push(build(id));
  }
  return roots.sort(byLabel);
}

export function teamTree(teams: Record<string, Team>): TreeItem[] {
  return buildTree(
    Object.keys(teams),
    (id) => teams[id]!.parent_team,
    (id) => ({ key: id, value: id, label: teams[id]!.name, children: [] })
  );
}

export function componentTree(teams: Record<string, Team>, components: Record<string, Component>): TreeItem[] {
  const componentsByTeam = new Map<string, TreeItem[]>();
  const unowned: TreeItem[] = [];
  for (const [id, component] of Object.entries(components)) {
    const item: TreeItem = { key: `component:${id}`, value: id, label: component.name, children: [] };
    if (teams[component.team]) {
      componentsByTeam.set(component.team, [...(componentsByTeam.get(component.team) ?? []), item]);
    } else {
      unowned.push(item);
    }
  }

  const regroup = (items: TreeItem[]): TreeItem[] =>
    items.flatMap((teamItem) => {
      const subteams = regroup(teamItem.children);
      const owned = (componentsByTeam.get(teamItem.key) ?? []).sort(byLabel);
      if (owned.length === 0 && subteams.length === 0) return [];
      return [{ key: `team:${teamItem.key}`, label: teamItem.label, children: [...owned, ...subteams] }];
    });

  return [...regroup(teamTree(teams)), ...unowned.sort(byLabel)];
}

const NO_LINE_MANAGER_LABEL = "(no line manager)";

export function lineManagementTree(teams: Record<string, Team>, people: Record<string, Person>): TreeItem[] {
  const managerOf = new Map(Object.keys(people).map((id) => [id, deriveLineManager(id, teams)]));
  const roots = buildTree(
    Object.keys(people),
    (id) => managerOf.get(id) ?? null,
    (id) => ({ key: id, value: id, label: people[id]!.name, children: [] })
  );

  const lone = roots.filter((item) => item.children.length === 0 && !managerOf.get(item.key));
  if (lone.length === 0) return roots;
  return [
    ...roots.filter((item) => !lone.includes(item)),
    { key: "group:no-line-manager", label: NO_LINE_MANAGER_LABEL, children: lone },
  ];
}

// Matches plus their ancestors; a match's own non-matching descendants are dropped.
export function filterTree(items: TreeItem[], query: string): { items: TreeItem[]; matchedKeys: Set<string> } {
  const needle = query.trim().toLowerCase();
  const matchedKeys = new Set<string>();
  if (!needle) return { items, matchedKeys };

  const prune = (list: TreeItem[]): TreeItem[] =>
    list.flatMap((item) => {
      const children = prune(item.children);
      const matches = item.label.toLowerCase().includes(needle);
      if (matches) matchedKeys.add(item.key);
      return matches || children.length > 0 ? [{ ...item, children }] : [];
    });

  return { items: prune(items), matchedKeys };
}

export function visibleRows(items: TreeItem[], expandedKeys: Set<string>): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (list: TreeItem[], level: number, parentKey: string | null) => {
    for (const item of list) {
      rows.push({ item, level, parentKey });
      if (expandedKeys.has(item.key)) walk(item.children, level + 1, item.key);
    }
  };
  walk(items, 1, null);
  return rows;
}

export function allBranchKeys(items: TreeItem[]): Set<string> {
  const keys = new Set<string>();
  const walk = (list: TreeItem[]) => {
    for (const item of list) {
      if (item.children.length === 0) continue;
      keys.add(item.key);
      walk(item.children);
    }
  };
  walk(items);
  return keys;
}

export function findItem(items: TreeItem[], value: string): TreeItem | undefined {
  for (const item of items) {
    if (item.value === value) return item;
    const found = findItem(item.children, value);
    if (found) return found;
  }
  return undefined;
}

export function ancestorKeys(items: TreeItem[], value: string): string[] {
  const search = (list: TreeItem[]): string[] | null => {
    for (const item of list) {
      if (item.value === value) return [];
      const below = search(item.children);
      if (below) return [item.key, ...below];
    }
    return null;
  };
  return search(items) ?? [];
}

export function firstValue(items: TreeItem[]): string | undefined {
  for (const item of items) {
    if (item.value !== undefined) return item.value;
    const found = firstValue(item.children);
    if (found !== undefined) return found;
  }
  return undefined;
}
