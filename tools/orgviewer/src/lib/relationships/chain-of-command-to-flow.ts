import type { Edge, Node } from "@xyflow/react";
import { lineManagementStyle } from "../../components/edge-styles";
import { deriveLineManagerLink, getChainOfCommand, getDirectReports } from "./line-management";
import { headDeputyEdges } from "./head-deputy-edges";
import { derivePersonCardRoles, type PersonRole } from "./person-roles";
import type { Person, Team } from "../orgapi/types";

function roleWithUnit(role: PersonRole, teams: Record<string, Team>): string {
  return `${role.title} · ${teams[role.teamId]?.name ?? role.teamId}`;
}

function personNode(personId: string, teams: Record<string, Team>, people: Record<string, Person>): Node {
  const person = people[personId];
  const { primary, secondary } = derivePersonCardRoles(personId, teams);
  return {
    id: `person:${personId}`,
    type: "person",
    data: {
      label: person?.name ?? personId,
      primaryTitle: primary ? roleWithUnit(primary, teams) : null,
      secondaryTitles: secondary.map((role) => roleWithUnit(role, teams)),
      documentationUrl: person?.documentation_url,
      direction: "DOWN",
    },
    position: { x: 0, y: 0 },
  };
}

// The chain of command for one person: every manager above them up to the root (via "chain:"
// edges, never foldable -- see apply-fold.ts), plus that person's own subordinates and their
// subordinates recursively (via "reports:" edges, foldable and folded by default so a large
// downward tree doesn't dump onto the screen at once), plus the head_deputy of every team any of
// those people heads (via non-foldable "deputy:" edges) -- and nothing else: no team nodes, no
// unrelated org-tree branches, no ancestors' *other* reports. All edge kinds point
// manager -> report (the reverse of "who reports to whom") so ELK's DOWN-direction layered
// layout places managers above their reports, matching how a chain of command actually reads.
export function chainOfCommandToFlow(
  personId: string,
  teams: Record<string, Team>,
  people: Record<string, Person>
): { nodes: Node[]; edges: Edge[] } {
  const chain = getChainOfCommand(personId, teams);
  const upwardIds = [personId, ...chain];
  const seen = new Set(upwardIds);

  const edges: Edge[] = [];
  for (let i = 0; i < upwardIds.length - 1; i++) {
    const report = upwardIds[i]!;
    const manager = upwardIds[i + 1]!;
    edges.push({
      id: `chain:${manager}->${report}`,
      source: `person:${manager}`,
      target: `person:${report}`,
      style: lineManagementStyle(deriveLineManagerLink(report, teams)?.hierarchical ?? true),
    });
  }

  const downwardIds: string[] = [];
  const queue = [personId];
  while (queue.length > 0) {
    const manager = queue.shift()!;
    for (const reportId of getDirectReports(manager, teams)) {
      if (seen.has(reportId)) continue;
      seen.add(reportId);
      downwardIds.push(reportId);
      queue.push(reportId);
      edges.push({
        id: `reports:${manager}->${reportId}`,
        source: `person:${manager}`,
        target: `person:${reportId}`,
        style: lineManagementStyle(deriveLineManagerLink(reportId, teams)?.hierarchical ?? true),
      });
    }
  }

  const { deputyIds, edges: deputyEdges } = headDeputyEdges([...upwardIds, ...downwardIds], teams);
  edges.push(...deputyEdges);
  const extraDeputyIds = [...new Set(deputyIds)].filter((id) => !seen.has(id));

  const nodes = [...upwardIds, ...downwardIds, ...extraDeputyIds].map((id) => personNode(id, teams, people));

  return { nodes, edges };
}
