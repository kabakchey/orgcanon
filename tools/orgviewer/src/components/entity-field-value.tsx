import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { OrgData, Position, Reviewable, TeamMember } from "../lib/orgapi/types";
import { relationalTargetFor } from "../lib/orgapi/relational-fields";

function isReviewable(value: unknown): value is Reviewable {
  return (
    typeof value === "object" &&
    value !== null &&
    "expiration_date" in value &&
    "notes" in value &&
    "owner" in value
  );
}

function isPositionArray(value: unknown): value is Position[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "object" && item !== null && "start_date" in item && "title" in item)
  );
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

export function ReviewableBlock({ reviewable }: { reviewable: Reviewable }): ReactElement {
  return (
    <dl className="reviewable-block">
      <div>
        <dt>Owner</dt>
        <dd>{reviewable.owner}</dd>
      </div>
      <div>
        <dt>Expires</dt>
        <dd>{reviewable.expiration_date}</dd>
      </div>
      {reviewable.notes && (
        <div>
          <dt>Notes</dt>
          <dd>{reviewable.notes}</dd>
        </div>
      )}
    </dl>
  );
}

export function PositionsList({ positions }: { positions: Position[] }): ReactElement {
  if (positions.length === 0) return <p className="muted">None.</p>;
  return (
    <ul className="positions-list">
      {positions.map((position, index) => (
        <li key={index}>
          <strong>{position.title}</strong> ({position.type}) — {position.start_date} –{" "}
          {position.end_date ?? "present"}
        </li>
      ))}
    </ul>
  );
}

export function RecordList({ record }: { record: Record<string, string> }): ReactElement {
  const entries = Object.entries(record);
  if (entries.length === 0) return <p className="muted">None.</p>;
  return (
    <ul className="record-list">
      {entries.map(([key, value]) => (
        <li key={key}>
          {key}: {value}
        </li>
      ))}
    </ul>
  );
}

function RelationalLink({ targetKey, id }: { targetKey: keyof OrgData; id: string }): ReactElement {
  return <Link to={`/entities/${targetKey}?id=${encodeURIComponent(id)}`}>{id}</Link>;
}

function MembersList({ members }: { members: TeamMember[] }): ReactElement {
  if (members.length === 0) return <p className="muted">None.</p>;
  return (
    <ul className="members-list">
      {members.map((member, index) => (
        <li key={index}>
          <RelationalLink targetKey="people" id={member.person} /> — {member.title} (
          <RelationalLink targetKey="roles" id={member.role} />){member.is_primary_team ? " · primary" : ""}
        </li>
      ))}
    </ul>
  );
}

export function EntityFieldValue({
  entityKey,
  field,
  value,
}: {
  entityKey: keyof OrgData;
  field: string;
  value: unknown;
}): ReactElement {
  if (value === null || value === undefined) return <>—</>;

  if (field === "reviewable" && isReviewable(value)) {
    return <ReviewableBlock reviewable={value} />;
  }
  if (field === "positions" && isPositionArray(value)) {
    return <PositionsList positions={value} />;
  }
  if (field === "members" && Array.isArray(value)) {
    return <MembersList members={value as TeamMember[]} />;
  }

  const relationalTarget = relationalTargetFor(entityKey, field);
  if (relationalTarget) {
    if (typeof value === "string" && value) {
      return <RelationalLink targetKey={relationalTarget} id={value} />;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      if (value.length === 0) return <p className="muted">None.</p>;
      return (
        <ul className="record-list">
          {value.map((id) => (
            <li key={id}>
              <RelationalLink targetKey={relationalTarget} id={id} />
            </li>
          ))}
        </ul>
      );
    }
  }

  if (field === "documentation_url" && typeof value === "string" && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    );
  }
  if ((field === "external_references" || field === "extensions") && typeof value === "object") {
    if (isRecordOfStrings(value)) {
      return <RecordList record={value} />;
    }
    const namespaces = Object.entries(value as Record<string, unknown>);
    if (namespaces.length === 0) return <p className="muted">None.</p>;
    return (
      <>
        {namespaces.map(([namespace, nested]) =>
          isRecordOfStrings(nested) ? (
            <div key={namespace}>
              <em>{namespace}</em>
              <RecordList record={nested} />
            </div>
          ) : null
        )}
      </>
    );
  }

  if (typeof value === "object") return <>{JSON.stringify(value)}</>;
  return <>{String(value)}</>;
}
