import React, { useEffect, useState } from "react";
import ForgeReconciler, { Button, ButtonGroup, Label, SectionMessage, Select, Stack, Text } from "@forge/react";
import { view } from "@forge/bridge";
import { parseEntityConfig } from "../entity/config";
import { ENTITY_LABELS } from "../entity/names";
import type { EntityConfig, EntityOption } from "../entity/types";
import { ENTITY_TYPES, type EntityType } from "../orgapi/client";
import { call } from "./call";

type Option<Value> = { label: string; value: Value };

const TYPE_OPTIONS: Option<EntityType>[] = ENTITY_TYPES.map((type) => ({
  label: ENTITY_LABELS[type].replace(/^./, (first) => first.toUpperCase()),
  value: type,
}));

function Config() {
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<EntityType | "">("");
  const [entities, setEntities] = useState<EntityOption[] | null>(null);
  const [id, setId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    view
      .getContext()
      .then((context) => parseEntityConfig(context.extension?.config))
      .catch(() => null)
      .then((config) => {
        if (config) {
          setType(config.type);
          setId(config.id);
        }
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!type) return;
    let current = true;
    setEntities(null);
    setError("");
    call<EntityOption[]>("listEntityOptions", { type })
      .then((options) => {
        if (current) setEntities(options);
      })
      .catch(() => {
        if (current) setError("The org data could not be loaded. Try again later.");
      });
    return () => {
      current = false;
    };
  }, [type]);

  if (!loaded) return <Text>Loading…</Text>;

  const entityOptions = (entities ?? []).map((entity) => ({ label: entity.label, value: entity.id }));
  const entity = entities?.find((candidate) => candidate.id === id);

  const save = () => {
    if (!type || !entity) return;
    const config: EntityConfig = { type, id: entity.id, name: entity.name };
    view.submit({ config }).catch(() => setError("The macro could not be saved."));
  };

  return (
    <Stack space="space.200">
      {error && <SectionMessage appearance="error">{error}</SectionMessage>}

      <Label labelFor="type">Type</Label>
      <Select
        inputId="type"
        options={TYPE_OPTIONS}
        value={TYPE_OPTIONS.find((option) => option.value === type) ?? null}
        onChange={(option: Option<EntityType> | null) => {
          setType(option?.value ?? "");
          setId("");
        }}
      />

      <Label labelFor="entity">Entity</Label>
      <Select
        inputId="entity"
        isDisabled={!type}
        isLoading={Boolean(type) && entities === null && !error}
        options={entityOptions}
        value={entityOptions.find((option) => option.value === id) ?? null}
        onChange={(option: Option<string> | null) => setId(option?.value ?? "")}
      />

      <ButtonGroup>
        <Button appearance="subtle" onClick={() => view.close()}>
          Cancel
        </Button>
        <Button appearance="primary" isDisabled={!entity} onClick={save}>
          Save
        </Button>
      </ButtonGroup>
    </Stack>
  );
}

ForgeReconciler.render(
  <React.StrictMode>
    <Config />
  </React.StrictMode>
);
