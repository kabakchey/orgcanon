# External references

A person, team or component usually also exists in other systems: an Atlassian account, a GitHub
team, a repository. Its identifier in each of those systems goes in that entity's
`external_references` -- a flat map of strings -- and nowhere else:

```hcl
external_references = {
  atlassian_account_id = "557058:00000000-0000-0000-0000-000000000000"
  github_accountname   = "anguyen"
}
```

## Rules

- **One key per system identifier, named `<system>_<field>`**: lowercase, underscores, the system
  first (`github_accountname`, not `accountname_github` or `GitHubUser`).
- **The value is one identifier, as that system writes it** -- an account id, a username, a slug.
  Not a URL, not a list, not a description.
- **An entity that isn't in a system omits the key.** Don't write `""` or a placeholder;
  `make report-data-quality` lists empty values as likely mistakes.
- **Identifiers do not go in `extensions`.** `extensions` (people only) is for richer per-system
  data that isn't an identifier, grouped by domain -- e.g. `extensions.hr.hiring_type`. Tooling
  that needs to find an entity in another system only ever looks in `external_references`.

The map is freeform: the schema accepts any key, and nothing validates a key's name. That is what
makes agreeing on the names below worthwhile -- a tool can only find an identifier under the key it
expects.

## Keys

Use these exact keys where they apply. **Read by** names the tooling shipped in this repository
that depends on the key today; a key with nothing there is a naming convention only, reserved so
that everyone -- and any tooling added later -- uses the same name.

### Person

| Key | Value | Read by |
|---|---|---|
| `atlassian_account_id` | Atlassian account id -- the last part of the person's profile address on your Atlassian site, after `/people/` | [`tools/orgconfluence`](../tools/orgconfluence/README.md): links the person's name to their Atlassian profile |
| `github_accountname` | GitHub username, without the `@` | -- |
| `slack_id` | Slack member id (e.g. `U012AB3CD`), not the display name | -- |
| `aws_iam_username` | AWS IAM user name | -- |
| `datadog_id` | Datadog user id | -- |
| `sentry_id` | Sentry user id | -- |

### Team

| Key | Value | Read by |
|---|---|---|
| `github_team_slug` | GitHub team slug, as it appears in the team's address | -- |

### Component

| Key | Value | Read by |
|---|---|---|
| `github_repo` | GitHub repository name, without the owner | -- |

## Adding a key

For a system not listed here, follow the `<system>_<field>` rule and add a row to the table above
in the same change, so the next person uses the same name. If you write tooling that reads a key,
name it in that row's **Read by** column: from then on, renaming the key breaks something.
