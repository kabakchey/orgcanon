# OrgCanon for leaders and stakeholders

<!-- self-review checklist (Step 5): zero occurrences of "Terraform", "HCL",
     "JSON", "validation block", "module", "provider" anywhere past this comment. -->

## What this is

Your organization's structure — the people, the teams, who leads what, who owns what — is modeled as a single reviewed, versioned source of truth instead of scattered across HR systems, spreadsheets, and wiki pages that drift out of sync with each other and with reality.

This project is experimental, pre-1.0 — expect it to keep changing.

## Why it exists

Today, questions like "who's the backup for this role" or "what does this team actually own" get answered by manually cross-referencing an HR system, a handful of spreadsheets, and old wiki pages — with no way to tell if any of them are actually up to date. Every one of those sources is maintained separately, so they drift apart from each other and from reality over time.

This project replaces that scattered picture with one reviewed, versioned record that everyone — HR, engineering, security, finance, legal — reads from and trusts. Every change goes through the same kind of review and automatic checking used for other important company records, so mistakes get caught before they become the answer someone relies on. The result is that ownership, reporting lines, and responsibility can be answered reliably, on demand, instead of chased down by hand.

## How to read the org chart (orgviewer)

The orgviewer is a browser-based chart that shows you the structure of your organization at a glance: who reports to whom, which teams own which components, and who holds various leadership or influence roles. When you look at the chart, you'll see two kinds of leadership:

- **Formal management** (Team Heads): these are the people with actual decision-making authority over hiring, performance, and team structure — shown as solid lines of reporting.
- **Advisory or functional leadership roles** (Tech Leads, Mentors, Scrum Masters, and similar): these are tracked separately from formal management and show up as a different kind of relationship on the chart, representing people who guide or influence work without formal employment authority.

This separation keeps the org chart clear about who can make which kinds of decisions.

<!-- TODO: add a screenshot of the orgviewer once one is available -->

## What guarantees does this data have?

Every piece of data here passes a set of automatic checks before it's allowed to merge — no dangling references, no duplicate emails, no impossible dates. The full list of guarantees is in [`docs/invariants.md`](./invariants.md).

## Asking questions about the org

There's also a read-only way to ask questions like "who leads Team X" or "which components does Team Y own" without needing to read the chart yourself, by connecting an AI assistant to the org data directly. Setup instructions are in [`docs/asking-questions-via-mcp.md`](./asking-questions-via-mcp.md).
