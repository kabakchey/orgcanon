import React, { useEffect, useState } from "react";
import ForgeReconciler, {
  Button,
  ButtonGroup,
  Label,
  RadioGroup,
  SectionMessage,
  Select,
  Stack,
  Text,
  Textfield,
} from "@forge/react";
import { view } from "@forge/bridge";
import type { Team } from "../orgapi/client";
import { call } from "./call";
import { parseConfig } from "../position/config";
import type { MacroConfig, Position, PositionKind, Show } from "../position/types";

type Option<Value> = { label: string; value: Value };

const KIND_LABELS: Record<PositionKind, string> = {
  head: "head",
  role: "role",
  authority_line: "authority line",
};

const SHOW_OPTIONS: (Option<Show> & { name: string })[] = [
  { name: "show", value: "holder", label: "Holder" },
  { name: "show", value: "deputy", label: "Deputy" },
  { name: "show", value: "both", label: "Holder and deputy" },
];

const positionKey = (position: { kind: PositionKind; id: string }) => `${position.kind}/${position.id}`;

function Config() {
  const [saved, setSaved] = useState<MacroConfig | null | undefined>(undefined);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [team, setTeam] = useState("");
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [selected, setSelected] = useState("");
  const [show, setShow] = useState<Show>("holder");
  const [override, setOverride] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    view
      .getContext()
      .then((context) => parseConfig(context.extension?.config))
      .catch(() => null)
      .then((config) => {
        setSaved(config);
        if (!config) return;
        setTeam(config.team);
        setSelected(positionKey({ kind: config.kind, id: config.positionId }));
        setShow(config.show);
        setOverride(config.override);
      });
    call<Team[]>("listTeams")
      .then(setTeams)
      .catch(() => setError("The org data could not be loaded. Try again later."));
  }, []);

  useEffect(() => {
    if (!team) return;
    let current = true;
    setPositions(null);
    call<Position[]>("listPositions", { team })
      .then((loaded) => {
        if (current) setPositions(loaded);
      })
      .catch(() => {
        if (current) setError("This team's positions could not be loaded. Try again later.");
      });
    return () => {
      current = false;
    };
  }, [team]);

  if (saved === undefined) return <Text>Loading…</Text>;

  const teamOptions = (teams ?? []).map((candidate) => ({ label: candidate.name, value: candidate.id }));
  const positionOptions = (positions ?? []).map((position) => ({
    label: `${position.text} — ${KIND_LABELS[position.kind]}`,
    value: positionKey(position),
  }));
  const position = positions?.find((candidate) => positionKey(candidate) === selected);

  const save = () => {
    if (!position) return;
    const config: MacroConfig = {
      team,
      kind: position.kind,
      positionId: position.id,
      positionText: position.text,
      show,
      override: override.trim(),
    };
    view.submit({ config }).catch(() => setError("The macro could not be saved."));
  };

  return (
    <Stack space="space.200">
      {error && <SectionMessage appearance="error">{error}</SectionMessage>}

      <Label labelFor="team">Team</Label>
      <Select
        inputId="team"
        isLoading={teams === null && !error}
        options={teamOptions}
        value={teamOptions.find((option) => option.value === team) ?? null}
        onChange={(option: Option<string> | null) => {
          setTeam(option?.value ?? "");
          setSelected("");
        }}
      />

      <Label labelFor="position">Position</Label>
      <Select
        inputId="position"
        isDisabled={!team}
        isLoading={Boolean(team) && positions === null && !error}
        options={positionOptions}
        value={positionOptions.find((option) => option.value === selected) ?? null}
        onChange={(option: Option<string> | null) => setSelected(option?.value ?? "")}
      />

      <Label labelFor="show">Show</Label>
      <RadioGroup
        name="show"
        options={SHOW_OPTIONS}
        value={show}
        onChange={(event) => setShow(event.target.value as Show)}
      />

      <Label labelFor="override">Text to show instead of the position's name (optional)</Label>
      <Textfield id="override" value={override} onChange={(event) => setOverride(event.target.value)} />

      <ButtonGroup>
        <Button appearance="subtle" onClick={() => view.close()}>
          Cancel
        </Button>
        <Button appearance="primary" isDisabled={!position} onClick={save}>
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
