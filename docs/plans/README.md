# Execution Plans

This directory is the home for the project's **execution-oriented plans** — migration plans, execution plans, refactoring plans, release plans, and the like: multi-Work-Item efforts that need a durable, shared reference for their strategy and sequencing.

Execution plans are a **distinct artifact class** — deliberately *not* permanent reference documentation. Their **governance** (the lifecycle, the artifact boundary, and the ownership rules) is owned by [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) and the [Documentation Strategy](../architecture/documentation-strategy.md). **This document owns only the template, layout, and authoring conventions** for a plan.

## Lifecycle at a glance

Authoritatively defined in [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md); summarized here for authors:

- **Draft → Active → Historical.** Draft (under review, not governing) → Active (approved, the live reference) → Historical (archived, read-only).
- **One effort → at most one Active plan.** An effort has at most one plan in the `Active` state at a time; a superseding plan takes over and the prior one moves to `Historical`.
- **`Historical` plans are retained, never deleted** — they are the project's **provenance and audit trail** (the *why and how* an effort was reasoned about and sequenced). The permanent documents own the resulting *what*; the archived plan preserves how the project got there.

## Plan header

Each plan opens with a status block:

```
> **Status:** Draft | Active | Historical
> **Type:** Migration | Execution | Refactoring | Release
> **Owner:** <name>
> **Last Updated:** <YYYY-MM-DD>
> **Parent Issue:** #<n>
> **Supersedes:** <prior plan, or —>
```

A `Historical` plan adds a one-line archival note (completed / superseded, plus a forward link to the documents that now own its durable facts).

## Layout

A plan is organized around its *strategy and structure*, not a task list. The usual sections:

1. **Purpose & goals** — what the effort achieves and why.
2. **Strategy & sequencing** — the ordered approach, phases, and any ordering invariants.
3. **Execution structure** — how the effort decomposes into Work Items, **linking** their Issues (never restating their status).
4. **Risks & mitigations** — what could go wrong and how it is managed.
5. **Reconciliation** — added as the plan approaches `Historical`: where the durable knowledge landed in the permanent docs, which findings were recorded, and the forward links.

## Naming

`docs/plans/<short-kebab-name>.md` — named for the plan's subject, not its lifecycle state (state lives in the header).

## Updating a Plan

A plan is a living document while `Active`: it evolves across pull requests (Documentation Work Items) as the effort's **strategy, sequencing, or risks** change. It does **not** track per-Work-Item progress or status — that belongs to the Issues, which the plan links and never mirrors (an execution plan owns the strategy, sequencing, rationale, risk, and structure; Issues own implementation, status, progress, and acceptance criteria — see [Documentation Strategy §5](../architecture/documentation-strategy.md)). Update `Last Updated` on each change.

## Plan Index

| Plan | Type | Status | Parent Issue |
|---|---|---|---|
| [media-implementation.md](media-implementation.md) | Execution | Active | [#305](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/305) |
| [auth-first-grant-retirement.md](auth-first-grant-retirement.md) | Migration | Active | [#357](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/357) |
| [documentation-migration-plan.md](documentation-migration-plan.md) | Migration | Historical | [#215](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/215) |
