import type { ReactElement } from "react";
import { OrgTreeView } from "./org-tree-view";
import { ChainOfCommandView } from "./chain-of-command-view";
import { AuthorityOverView } from "./authority-over-view";
import { TeamComponentsView } from "./team-components-view";
import { ComponentDependenciesView } from "./component-dependencies-view";
import { EntitiesView } from "./entities-view";

export type ViewComponent = () => ReactElement;

export interface ViewDefinition {
  slug: string;
  title: string;
  description: string;
  component: ViewComponent;
}

export const views: ViewDefinition[] = [
  {
    slug: "org-tree",
    title: "Org Tree",
    description: "The full team hierarchy.",
    component: OrgTreeView,
  },
  {
    slug: "chain-of-command",
    title: "Chain of Command",
    description: "Line-management chain for a person.",
    component: ChainOfCommandView,
  },
  {
    slug: "authority-over",
    title: "Authority Over",
    description: "Who has authority over a person or team.",
    component: AuthorityOverView,
  },
  {
    slug: "team-components",
    title: "Team Components",
    description: "Components a team owns.",
    component: TeamComponentsView,
  },
  {
    slug: "component-dependencies",
    title: "Component Dependencies",
    description: "Dependency graph between components.",
    component: ComponentDependenciesView,
  },
  {
    slug: "entities",
    title: "Entities",
    description: "Any entity type as a filterable table, exportable to CSV.",
    component: EntitiesView,
  },
];

export function getViewBySlug(slug: string): ViewDefinition | undefined {
  return views.find((view) => view.slug === slug);
}
