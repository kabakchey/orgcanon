import type { Edge, Node } from "@xyflow/react";
import { EDGE_STYLE } from "../../components/edge-styles";
import { getChainOfCommand, getDirectReports } from "./line-management";
import { derivePersonCardRoles } from "./person-roles";
import type { Person, Team } from "../orgapi/types";

function personNode(personId: string, teams: Record<string, Team>, people: Record<string, Person>): Node {
  const person = people[personId];
  const { primary, secondary } = derivePersonCardRoles(personId, teams);
  return {
    id: `person:${personId}`,
    type: "person",
    data: {
      label: person?.name ?? personId,
      teamName: primary ? (teams[primary.teamId]?.name ?? null) : null,
      primaryTitle: primary?.title ?? null,
      secondaryTitles: secondary.map((role) => role.title),
      documentationUrl: person?.documentation_url,
      direction: "DOWN",
    },
    position: { x: 0, y: 0 },
  };
}

// The chain of command for one person: every manager above them up to the root (via "chain:"
// edges, never foldable -- see apply-fold.ts), plus that person's own subordinates and their
// subordinates recursively (via "reports:" edges, foldable and folded by default so a large
// downward tree doesn't dump onto the screen at once) -- and nothing else: no team nodes, no
// unrelated org-tree branches, no ancestors' *other* reports. Both edge kinds point
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
      style: EDGE_STYLE.lineManagement,
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
        style: EDGE_STYLE.lineManagement,
      });
    }
  }

  const nodes = [...upwardIds, ...downwardIds].map((id) => personNode(id, teams, people));

  return { nodes, edges };
}
