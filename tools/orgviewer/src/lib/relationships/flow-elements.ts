import type { CSSProperties } from "react";
import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE } from "./edge-styles";
import { computeDependencyCounts } from "./component-dependencies";
import { deputyTitle, withInterimSuffix } from "./interim";
import type { AuthorityLine, AuthorityLineType, Component, Person, Team } from "../orgapi/types";

// What the canvas (selection, folding) and withNodeSelect layer onto any card.
type CardControls = {
  selected?: boolean;
  onSelect?: () => void;
  foldable?: boolean;
  folded?: boolean;
  hiddenCount?: number;
  directHiddenCount?: number;
  onToggleFold?: () => void;
};

type PersonCard = {
  teamName?: string | null;
  primaryTitle?: string | null;
  secondaryTitles?: string[];
  positionTitle?: string | null;
};

export type TeamFlowNode = Node<
  CardControls & { label: string; type?: string; description?: string; documentationUrl?: string },
  "team"
>;

export type PersonFlowNode = Node<CardControls & PersonCard & { label: string; documentationUrl?: string }, "person">;

export type ComponentFlowNode = Node<
  CardControls & {
    label: string;
    type?: string;
    isEndUserFacing?: boolean;
    documentationUrl?: string;
    ownerTeamId?: string;
    ownerTeamName?: string;
    directDependencies?: number;
    transitiveDependencies?: number;
    directDependees?: number;
    transitiveDependees?: number;
  },
  "component"
>;

export type FlowNode = TeamFlowNode | PersonFlowNode | ComponentFlowNode;

export const DEPENDENCY_COUNTS = [
  { icon: "→", label: "direct dependencies", field: "directDependencies" },
  { icon: "⇒", label: "all dependencies", field: "transitiveDependencies" },
  { icon: "←", label: "direct dependees", field: "directDependees" },
  { icon: "⇐", label: "all dependees", field: "transitiveDependees" },
] as const;

const UNPLACED = { x: 0, y: 0 };

export function teamNode(teamId: string, team: Team | undefined): TeamFlowNode {
  return {
    id: `team:${teamId}`,
    type: "team",
    data: {
      label: team?.name ?? teamId,
      type: team?.type ?? "",
      description: team?.description ?? "",
      documentationUrl: team?.documentation_url,
    },
    position: UNPLACED,
  };
}

export function personNode(personId: string, person: Person | undefined, card: PersonCard): PersonFlowNode {
  return {
    id: `person:${personId}`,
    type: "person",
    data: { label: person?.name ?? personId, ...card, documentationUrl: person?.documentation_url },
    position: UNPLACED,
  };
}

export function componentNode(
  componentId: string,
  components: Record<string, Component>,
  teams: Record<string, Team>
): ComponentFlowNode {
  const component = components[componentId];
  const counts = computeDependencyCounts(componentId, components);
  return {
    id: `component:${componentId}`,
    type: "component",
    data: {
      label: component?.name ?? componentId,
      type: component?.type ?? "",
      isEndUserFacing: component?.is_end_user_facing ?? false,
      documentationUrl: component?.documentation_url,
      ownerTeamId: component?.team,
      ownerTeamName: component ? (teams[component.team]?.name ?? component.team) : undefined,
      directDependencies: counts.direct,
      transitiveDependencies: counts.transitive,
      directDependees: counts.directDependees,
      transitiveDependees: counts.transitiveDependees,
    },
    position: UNPLACED,
  };
}

export function flowEdge(id: string, source: string, target: string, style: CSSProperties, label?: string): Edge {
  return label === undefined ? { id, source, target, style } : { id, source, target, style, label };
}

function authorityLineTitle(line: AuthorityLine, authorityLineTypes: Record<string, AuthorityLineType>): string {
  return authorityLineTypes[line.type]?.title ?? line.type;
}

export function authorityEdge(
  teamId: string,
  line: AuthorityLine,
  authorityLineTypes: Record<string, AuthorityLineType>
): Edge {
  return flowEdge(
    `authority:${line.person}->${teamId}`,
    `person:${line.person}`,
    `team:${teamId}`,
    EDGE_STYLE.authority,
    withInterimSuffix(authorityLineTitle(line, authorityLineTypes), line.is_interim)
  );
}

// The deputy's own edge to the team, then the holder -> deputy link; empty without a deputy.
export function authorityDeputyEdges(
  teamId: string,
  line: AuthorityLine,
  authorityLineTypes: Record<string, AuthorityLineType>
): Edge[] {
  if (!line.deputy) return [];
  const isInterim = line.is_deputy_interim ?? false;
  return [
    flowEdge(
      `authority-deputy:${line.deputy}->${teamId}`,
      `person:${line.deputy}`,
      `team:${teamId}`,
      EDGE_STYLE.authority,
      withInterimSuffix(deputyTitle(authorityLineTitle(line, authorityLineTypes)), isInterim)
    ),
    flowEdge(
      `deputy:authority:${line.person}->${line.deputy}:${line.type}`,
      `person:${line.person}`,
      `person:${line.deputy}`,
      EDGE_STYLE.authority,
      withInterimSuffix("Deputy", isInterim)
    ),
  ];
}
