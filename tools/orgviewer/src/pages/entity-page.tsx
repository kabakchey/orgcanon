import type { ReactElement } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EntityFieldValue } from "../components/entity-field-value";
import { useEntities, useEntityById } from "../lib/orgapi/use-entities";
import {
  reverseConnectionSourceKeysFor,
  reverseConnectionsFor,
  type EntityConnection,
} from "../lib/orgapi/direct-connections";
import { isEntityKey, type OrgData } from "../lib/orgapi/types";

type EntitySources = Partial<Record<keyof OrgData, Record<string, unknown>>>;

function labelFor(entity: Record<string, unknown>, id: string): string {
  if (typeof entity.name === "string") return entity.name;
  if (typeof entity.title === "string") return entity.title;
  return id;
}

function EntityFields({ entity, entityKey }: { entity: Record<string, unknown>; entityKey: keyof OrgData }) {
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
              const name = target ? labelFor(target as Record<string, unknown>, connectionId) : connectionId;
              return (
                <Link
                  key={connectionId}
                  to={`/entities/${connection.targetKey}?id=${encodeURIComponent(connectionId)}`}
                  className="entity-connection-chip"
                >
                  {name}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityById({ entityKey, id }: { entityKey: keyof OrgData; id: string }) {
  const { data, notFound, error } = useEntityById(entityKey, id);

  // Only the collections a *_types/self/etc. reverse-lookup for this entity type actually needs
  // are fetched (see reverseConnectionSourceKeysFor) -- these five useEntities calls always run,
  // in this fixed order, so the `enabled` flag (not a conditional hook) is what skips the unneeded
  // ones.
  const sourceKeys = reverseConnectionSourceKeysFor(entityKey);
  const teamsSource = useEntities("teams", undefined, { enabled: sourceKeys.includes("teams") });
  const peopleSource = useEntities("people", undefined, { enabled: sourceKeys.includes("people") });
  const componentsSource = useEntities("components", undefined, { enabled: sourceKeys.includes("components") });
  const authorityLinesSource = useEntities("authority_lines", undefined, {
    enabled: sourceKeys.includes("authority_lines"),
  });
  const rolesSource = useEntities("roles", undefined, { enabled: sourceKeys.includes("roles") });

  if (error) return <p>Failed to load entity.</p>;
  if (notFound) return <p>No {entityKey} entity with id {JSON.stringify(id)}.</p>;
  if (!data) return <p>Loading…</p>;

  const entity = data as unknown as Record<string, unknown>;
  const sources: EntitySources = {
    teams: teamsSource.data as unknown as Record<string, unknown> | undefined,
    people: peopleSource.data as unknown as Record<string, unknown> | undefined,
    components: componentsSource.data as unknown as Record<string, unknown> | undefined,
    authority_lines: authorityLinesSource.data as unknown as Record<string, unknown> | undefined,
    roles: rolesSource.data as unknown as Record<string, unknown> | undefined,
  };
  const sourcesReady = sourceKeys.every((key) => sources[key] !== undefined);
  const connections = sourcesReady ? reverseConnectionsFor(entityKey, id, sources) : undefined;

  return (
    <div className="entity-detail">
      <div className="entity-header">
        <Link to={`/views/entities?entity=${entityKey}`} className="entity-type-badge">
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
          <EntityConnections connections={connections} sources={sources} />
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
          <Link to={`/entities/${entityKey}?id=${encodeURIComponent(id)}`}>
            {labelFor(entity as Record<string, unknown>, id)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function EntityPage() {
  const { entityKey: rawEntityKey } = useParams<{ entityKey: string }>();
  const [searchParams] = useSearchParams();

  if (!rawEntityKey || !isEntityKey(rawEntityKey)) {
    return <main style={{ padding: 24 }}>Unknown entity type.</main>;
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
    <main style={{ padding: 24 }}>
      <h1>{entityKey}</h1>
      {body}
    </main>
  );
}
