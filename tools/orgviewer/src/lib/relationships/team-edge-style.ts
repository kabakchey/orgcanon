import { EDGE_STYLE } from "../../components/edge-styles";
import type { Team } from "../orgapi/types";

export function teamEdgeStyle(parent: Team | undefined, child: Team | undefined) {
  return parent?.is_hierarchical === false || child?.is_hierarchical === false
    ? EDGE_STYLE.nonHierarchical
    : EDGE_STYLE.parentChild;
}
