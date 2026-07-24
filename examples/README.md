# Examples

Three worked, runnable examples of org data validated against [`org-model/validated/`](../org-model/validated/).
All are self-contained Terraform root modules -- each sources `../../org-model/validated`
directly, the same way an adopting repo would eventually pin
`source = ".../validated?ref=vX.Y.Z"` (see
[`../docs/architecture.md`](../docs/architecture.md#key-design-decisions) for the full
reasoning on distribution). None is wired into the root [`org-model/`](../org-model/) tree --
that tree is a template for *your* org data, not a place for these examples to live.

- [`single-team/`](./single-team/) -- the simplest valid org: one team, no departments or squads,
  all data in one `data.tf`.
- [`three-level-hierarchy/`](./three-level-hierarchy/) -- a 3-level hierarchy (organization ->
  department -> squad), structured into `common/` + `teams/<team>/` to demonstrate that
  file-split pattern (see [`../org-model/main.tf`](../org-model/main.tf)'s onboarding comment).
- [`complex-org/`](./complex-org/) -- a bigger, branchier org (5 levels, 10 teams, 15 components)
  purpose-built to exercise every scenario `orgviewer`'s graph views can show: direct and
  transitive component dependencies, a real dependency cycle (allowed, not an error), a
  cross-team dependency, a large chain-of-command fan-out, an AuthorityLine spanning two teams
  at once, a secondary (non-primary) team membership, a person heading two teams at once, the
  same person also holding two AuthorityLines at once, a different person holding two Roles
  within one team, and both patterns of the `duty` component type (a recurring activity and a
  constant watch). Reach for this one when developing or demoing `orgviewer` and the other two
  examples feel too small to show something off; reach for `three-level-hierarchy/` when the
  file-split pattern itself is what you're demonstrating.

## Running an example

```sh
terraform -chdir=examples/single-team init -backend=false
terraform -chdir=examples/single-team plan
```

(swap in `examples/three-level-hierarchy` or `examples/complex-org` for the others).
`terraform validate` alone won't catch invariant violations -- per its own `--help` text, it
checks validity "regardless of any provided variables." `plan` or `console` is what actually
runs the schema's `validation` blocks against this data.

To validate every example the same way CI does (fmt + validate + plan + team-hierarchy cycle
check), run from the repo root:

```sh
make check-examples
```

This is a separate target from `make check` on purpose, so deleting this directory means
removing `make check-examples` and its CI job/pre-commit hook and nothing else -- see
[`../docs/architecture.md`](../docs/architecture.md#key-design-decisions) for the full
reasoning.
