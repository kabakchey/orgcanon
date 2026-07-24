# org-model/teams/

Empty by default -- this is where your organization's teams live, one directory per team, at
every level of the hierarchy that has its own head (departments included, not just leaf squads).
Directories are nested to mirror the org chart: a team's directory sits directly inside its
`parent_team`'s directory (directly under `teams/` if its parent is the root team), e.g.
`teams/engineering/payments-squad/payments-core/`.

See `../main.tf`'s "To onboard a new team" comment for the exact steps, and
[`../../examples/single-team/`](../../examples/single-team/) /
[`../../examples/three-level-hierarchy/`](../../examples/three-level-hierarchy/) for worked
examples of the data shape and nesting a `teams/.../<team>/data.tf` should follow.
