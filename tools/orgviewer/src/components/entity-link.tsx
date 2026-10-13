import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { OrgData } from "../lib/orgapi/types";
import { entityHref } from "../lib/routes";

export function EntityLink({
  entityKey,
  id,
  className,
  children,
}: {
  entityKey: keyof OrgData;
  id: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link to={entityHref(entityKey, id)} className={className}>
      {children ?? id}
    </Link>
  );
}
