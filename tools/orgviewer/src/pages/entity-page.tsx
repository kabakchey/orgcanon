import type { ReactElement } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EntityFieldValue } from "../components/entity-field-value";
import { EntityLink } from "../components/entity-link";
import { useEntities, useEntityById, useOrgData } from "../lib/orgapi/use-entities";
import {
  reverseConnectionSourceKeysFor,
  reverseConnectionsFor,
  type EntityConnection,
} from "../lib/orgapi/reverse-connections";
import { isEntityKey, type OrgData } from "../lib/orgapi/types";
import { entitiesTableHref } from "../lib/routes";

type EntitySources = Partial<Record<keyof OrgData, Record<string, object>>>;

function labelFor(entity: object, id: string): string {
  const { name, title } = entity as { name?: unknown; title?: unknown };
  if (typeof name === "string") return name;
  if (typeof title === "string") return title;
  return id;
}

function EntityFields({ entity, entityKey }: { entity: object; entityKey: keyof OrgData }) {
  return (
    <dl className="entity-fields">
      {Object.entries(entity).map(([field, value]) => (
        <div key={field} className="entity-field">
          <dt>{field}</dt>
          <dd>
            <EntityFieldValue entityKey={entityKey} field={field} value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EntityConnections({
  connections,
  sources,
}: {
  connections: EntityConnection[];
  sources: EntitySources;
}) {
  return (
    <div className="entity-connection-groups">
      {connections.map((connection) => (
        <div key={connection.label} className="entity-connection-group">
          <h3 className="entity-connection-label">{connection.label}</h3>
          <div className="entity-connection-chips">
            {connection.ids.map((connectionId) => {
              const target = sources[connection.targetKey]?.[connectionId];
              const name = target ? labelFor(target, connectionId) : connectionId;
              return (
                <EntityLink
                  key={connectionId}
                  entityKey={connection.targetKey}
                  id={connectionId}
                  className="entity-connection-chip"
                >
                  {name}
                </EntityLink>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityById({ entityKey, id }: { entityKey: keyof OrgData; id: string }) {
  const { data: entity, notFound, error } = useEntityById(entityKey, id);
  const sources = useOrgData(reverseConnectionSourceKeysFor(entityKey)).data;

  if (error) return <p>Failed to load entity.</p>;
  if (notFound) return <p>No {entityKey} entity with id {JSON.stringify(id)}.</p>;
  if (!entity) return <p>Loading…</p>;

  const connections = sources ? reverseConnectionsFor(entityKey, id, sources) : undefined;

  return (
    <div className="entity-detail">
      <div className="entity-header">
        <Link to={entitiesTableHref(entityKey)} className="entity-type-badge">
          {entityKey}
        </Link>
        <h2 className="entity-name">{labelFor(entity, id)}</h2>
      </div>
      <section className="entity-card">
        <h3 className="entity-card-title">Properties</h3>
        <EntityFields entity={entity} entityKey={entityKey} />
      </section>
      <section className="entity-card">
        <h3 className="entity-card-title">Connections</h3>
        {connections === undefined ? (
          <p className="muted">Loading connections…</p>
        ) : connections.length === 0 ? (
          <p className="muted">No other entities reference this one.</p>
        ) : (
          <EntityConnections connections={connections} sources={sources ?? {}} />
        )}
      </section>
    </div>
  );
}

function EntityByFilters({
  entityKey,
  filters,
}: {
  entityKey: keyof OrgData;
  filters: Record<string, string>;
}) {
  const { data, error } = useEntities(entityKey, filters);

  if (error) return <p>Failed to load entities.</p>;
  if (!data) return <p>Loading…</p>;

  // Filter lookups can match zero, one, or many entities (e.g. two people can share a Role) --
  // always rendered as a list, even for a single match, so the URL contract doesn't shift shape
  // depending on how many results happen to come back.
  const matches = Object.entries(data);
  if (matches.length === 0) {
    return <p>No matching {entityKey} entity.</p>;
  }

  return (
    <ul>
      {matches.map(([id, entity]) => (
        <li key={id}>
          <EntityLink entityKey={entityKey} id={id}>
            {labelFor(entity, id)}
          </EntityLink>
        </li>
      ))}
    </ul>
  );
}

export function EntityPage() {
  const { entityKey: rawEntityKey } = useParams<{ entityKey: string }>();
  const [searchParams] = useSearchParams();

  if (!rawEntityKey || !isEntityKey(rawEntityKey)) {
    return <main className="page">Unknown entity type.</main>;
  }
  const entityKey = rawEntityKey;

  const id = searchParams.get("id");
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key !== "id") filters[key] = value;
  }
  const hasFilters = Object.keys(filters).length > 0;

  let body: ReactElement;
  if (id && hasFilters) {
    body = <p>Provide either `id` or lookup filter params, not both.</p>;
  } else if (id) {
    body = <EntityById entityKey={entityKey} id={id} />;
  } else if (hasFilters) {
    body = <EntityByFilters entityKey={entityKey} filters={filters} />;
  } else {
    body = <p>Provide `?id=&lt;id&gt;` or lookup filter query params to display an entity.</p>;
  }

  return (
    <main className="page">
      <h1>{entityKey}</h1>
      {body}
    </main>
  );
}
