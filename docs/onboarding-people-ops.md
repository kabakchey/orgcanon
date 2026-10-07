# Editing org data as a non-engineer (people-ops guide)

<!-- self-review checklist (Step 6): every heading below must be filled in; avoid
     unnecessary "Terraform"/"HCL"/"provider"/"resource"/"module"/"validation block" jargon
     in the reader-facing prose past this comment. Two exceptions are deliberate, not
     violations: the reassurance sentence in "Who this guide is for" (naming them once, to
     tell the reader they don't need to know them), and markdown code-fence language tags
     (```hcl) -- those render as nothing to the reader, so they carry no jargon exposure. -->

## Who this guide is for

This guide is for people-ops staff (or any team's designated data owner) who need to edit and maintain org data without a software engineering background. You'll be editing either `org-model/common/` — the root team record and shared type vocabulary that people-ops maintains — or your own team's data under `org-model/teams/<team-id>/` (nested inside your parent team's own directory, mirroring the org chart), depending on your role.

This guide is not for engineers making changes to `org-model/validated/` (the schema and validation logic itself) — that's a different kind of change, reviewed by the platform team.

You don't need to know what Terraform or HCL are to use this guide. If you're curious about the mechanism, see [`docs/architecture.md`](./architecture.md#key-design-decisions) — but nothing below requires reading it.

## What you'll actually edit, and who reviews it

When you open a pull request (GitHub) or merge request (GitLab) to edit your file, the checks described below run automatically, and GitHub or GitLab automatically asks the right person to review your changes — you don't have to figure out who should approve (on GitLab, this is a required approval only on Premium+; on Free tier it's an informational owner list you should still check).

**If you're editing `org-model/common/`** (the shared type vocabulary and root team record), people-ops reviews your change per [`.github/CODEOWNERS`](./../.github/CODEOWNERS) — this directory's organizational content is deliberately reviewed separately from the engineering side (see [`docs/architecture.md`](./architecture.md#key-design-decisions) for why).

**If you're editing `org-model/teams/<your-team-id>/`** (your team's people, roles, and responsibilities), GitHub or GitLab automatically asks your team's owner to review it.

This template repo doesn't yet have any team directories or per-team review assignments set up — that's a one-time setup step an engineer does when onboarding your team, not something you need to do yourself as a people-ops editor. Until your team has been onboarded, `org-model/common/` is the one directory that's live-reviewable per the review rule already in place. In the meantime, see [`examples/single-team/`](../examples/single-team/) and [`examples/three-level-hierarchy/`](../examples/three-level-hierarchy/) for real, filled-in worked examples of what a team's data looks like once it exists.

The files use plain `key = "value"` syntax with nested `{ }` blocks. The fields you'll actually touch are the readable ones — a person's `name` and `email`, dates like `expiration_date`, or free-text notes. You don't need to understand what's happening under the hood; the validation checks will catch mistakes before they merge either way.

## Field reference: Person

| Field | What it means | Example |
|---|---|---|
| `name` | The person's full name | `"Alice Nguyen"` |
| `email` | Their work email — must be unique across everyone in the system | `"alice@example.com"` |
| `primary_specialization` | Their main area of expertise, free text | `"Backend Engineering"` |
| `secondary_specializations` | Other areas they work in, if any | `["Data Engineering"]` |
| `external_references` | Their ids in other systems, e.g. GitHub username — use the exact key names listed in [external references](./external-references.md) | `{ github_accountname = "anguyen" }` |
| `documentation_url` | Link to their personal profile or similar, if any — leave as `""` if there isn't one | `"https://example.com/people/anguyen"` |
| `positions` | Their job title history — see below | (see worked example) |
| `reviewable.expiration_date` | The date this record should next be double-checked for accuracy | `"2027-01-15"` |
| `reviewable.notes` | Free-text notes for whoever reviews this record | `"Confirmed during Q1 headcount review"` |
| `reviewable.owner` | Who is responsible for keeping this record current — must be a real person already in the system | `"alice-nguyen"` |

**About `positions`:** Each entry in a person's position history has a `type` (a reference to a job title defined in `org-model/common/`, not something you invent per-person), a `title` (the concrete printed title for this person's role), a `start_date`, an optional `end_date` (for when someone leaves or changes roles), and its own `reviewable` block (with the same `expiration_date`, `notes`, and `owner` fields). The naming convention for position titles lives in the schema comments — following it exactly isn't machine-enforced, but "reasonable is good enough."

## Field reference: Team membership

| Field | What it means | Example |
|---|---|---|
| `person` | Who this row is about — must be an existing person's ID | `"alice-nguyen"` |
| `role` | Which defined role they hold on this team — must be an existing role's ID | `"backend-lead"` |
| `title` | The printed title for this membership | `"Backend Lead"` |
| `is_primary_team` | Whether this is their main team (a person can only be primary on one team, ever) | `true` |
| `deputy` | Backup person for this specific row, if any | `"bob-smith"` |

**About IDs:** The lowercase names like `"alice-nguyen"` are short IDs used to link records together across files — you'll see them reused everywhere. If you type one wrong, the checks will tell you exactly which one doesn't exist, so you can fix it.

## Worked example: adding a new person

Here's what you'd add to your file to create a new person entry:

```hcl
"jane-doe" = {
  name                      = "Jane Doe"
  email                     = "jane.doe@example.com"
  primary_specialization    = "Product Design"
  secondary_specializations = []
  external_references       = {}
  documentation_url         = ""
  positions = [{
    type       = "product-designer"
    title      = "Product Designer * Design @ platform-squad"
    start_date = "2026-08-25"
    reviewable = {
      expiration_date = "2027-08-25"
      notes           = ""
      owner           = "jane-doe"
    }
  }]
  extensions = {}
  reviewable = {
    expiration_date = "2027-08-25"
    notes           = ""
    owner           = "jane-doe"
  }
}
```

Copy this block exactly (changing the values to match the real person), indent it to match the rest of your file, and add a comma after the closing `}` if there's another person entry after it.

## Worked example: someone leaving (setting an end date)

When someone leaves, update their most recent position entry by adding an `end_date`:

```hcl
"jane-doe" = {
  name                      = "Jane Doe"
  email                     = "jane.doe@example.com"
  primary_specialization    = "Product Design"
  secondary_specializations = []
  external_references       = {}
  documentation_url         = ""
  positions = [{
    type       = "product-designer"
    title      = "Product Designer * Design @ platform-squad"
    start_date = "2026-08-25"
    end_date   = "2027-08-20"
    reviewable = {
      expiration_date = "2027-08-25"
      notes           = ""
      owner           = "jane-doe"
    }
  }]
  extensions = {}
  reviewable = {
    expiration_date = "2027-08-25"
    notes           = ""
    owner           = "jane-doe"
  }
}
```

The `start_date` must be on or before the `end_date` — the checks will confirm this is correct.

## Opening a pull request and what happens next

1. Edit your file locally with your text editor — add, change, or remove a person or team member entry.
2. Open a pull request (GitHub) or merge request (GitLab).
3. GitHub or GitLab automatically runs `make check` (or you can run it locally yourself by running `make check` from the repo root — see the [`Makefile`](../Makefile)).
4. The checks look for common mistakes: missing fields, typos in IDs that don't exist, dates in the wrong format, or violations of the rules in [`docs/invariants.md`](./invariants.md). If anything fails, the error message will name exactly which rule wasn't met (e.g., `"people[*].email must be unique across all people."`).
5. Once checks pass, GitHub or GitLab automatically asks the right reviewer based on which directory you touched — `.github/CODEOWNERS` (GitHub) or `.gitlab/CODEOWNERS` (GitLab) makes this happen (on GitLab, this only *requires* their approval on Premium+; on Free tier it's still an informational pointer to the right reviewer).
6. Once reviewed and approved, merge your PR/MR — the change is live.

## If something goes wrong

When `make check` or the CI pipeline prints an error, the message is written to be read directly — it names exactly which rule failed (e.g., `"people[*].email must be unique across all people."`). Read the error, find which line of your file it's pointing to, and fix it.

For a friendlier, non-technical rendering of the same failure, run `make check-friendly` locally instead of `make check` — it re-prints just the rule that failed, without the surrounding technical stack trace. It's not part of the CI gate itself, just a clearer local view of it.

If the error message is still unclear, you can also check [`docs/invariants.md`](./invariants.md) for the full list of rules and what they mean.

If you'd rather not edit files by hand, `scripts/orgcanon_cli.py` offers guided scaffolding for the two most common edits — for example: `python3 scripts/orgcanon_cli.py add-person --file org-model/common/org.tf --id jane-doe --name "Jane Doe" --email jane@example.com --primary-specialization "Product Design" --expiration-date 2027-08-25 --owner jane-doe`. It writes a plain entry into the file you point it at and reformats it afterward, so you still end up with a normal, readable diff to review.
