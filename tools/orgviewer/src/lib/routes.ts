import type { OrgData } from "./orgapi/types";

export function viewPath(slug: string): string {
  return `/views/${slug}`;
}

export function entityHref(entityKey: keyof OrgData, id: string): string {
  return `/entities/${entityKey}?id=${encodeURIComponent(id)}`;
}

export function entitiesTableHref(entityKey: keyof OrgData): string {
  return `${viewPath("entities")}?entity=${entityKey}`;
}

export function orgTreeHref(teamId: string): string {
  return `${viewPath("org-tree")}?teamId=${encodeURIComponent(teamId)}`;
}

export function componentDependenciesHref(componentId: string): string {
  return `${viewPath("component-dependencies")}?componentId=${encodeURIComponent(componentId)}`;
}
