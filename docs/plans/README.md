# Execution Plans

This directory is the home for the project's **execution-oriented plans** — migration plans, execution plans, refactoring plans, release plans, and the like: multi-Work-Item efforts that need a durable, shared reference for their strategy and sequencing.

Execution plans are a **distinct artifact class** — deliberately *not* permanent reference documentation. Their **governance** (the lifecycle, the artifact boundary, and the ownership rules) is owned by [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) and the [Documentation Strategy](../architecture/documentation-strategy.md). **This document owns only the template, layout, and authoring conventions** for a plan.

## Lifecycle at a glance

Authoritatively defined in [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md); summarized here for authors:

- **Draft → Active → Historical.** Draft (under review, not governing) → Active (approved, the live reference) → Historical (archived, read-only).
- **At most one Active plan per track.** An effort is planned as one track or as several, each track with its own parent Issue and at most one plan in the `Active` state; a superseding plan takes over and the prior one moves to `Historical`.
- **Most work has no plan at all.** A plan is for a multi-Work-Item effort that needs a durable reference; everything on this page applies only where an approved plan exists. A Work Item without one is governed by its Issue ([Engineering Execution Standard](../development/engineering-execution-standard.md) §12).
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

A `Historical` plan adds a one-line archival note (completed / superseded, plus a forward link to the documents that now own its durable facts), and moves to `historical/` (see *Naming*).

## Layout

A plan is organized around its *strategy and structure*, not a task list. **A plan is decomposed up front, or it is not.** Where the Work Items are known when it is written, it carries the sections below. Where they are not, it states the **capabilities or outcomes** its track must deliver, says that decomposition belongs to Execution Preparation, and records each Work Item in its execution log as that item lands — sections 3 and 5 below then have no up-front content. Either way the plan owns strategy and rationale, and never implementation.

The usual sections:

1. **Purpose & goals** — what the effort achieves and why.
2. **Strategy & sequencing** — the ordered approach, phases, and any ordering invariants.
3. **Execution structure** — how the effort decomposes into Work Items, **linking** their Issues (never restating their status).
4. **Risks & mitigations** — what could go wrong and how it is managed.
5. **Reconciliation** — added as the plan approaches `Historical`: where the durable knowledge landed in the permanent docs, which findings were recorded, and the forward links.

## Naming

`docs/plans/<short-kebab-name>.md` — named for the plan's subject, not its lifecycle state. State lives in the header; the one place it also shows is the folder of a `Historical` plan, below.

**A `Historical` plan lives in `docs/plans/historical/`**, under the same name. It moves there in the change that archives it, and every link to it is repointed in that change. A `Draft` never enters the directory; an `Active` plan stays at the top level.

## Updating a Plan

A plan is a living document while `Active`: it evolves as the effort's **strategy, sequencing, or risks** change. **It is never updated in a branch of its own.** A plan change is committed in the branch where the need for it was discovered; if no branch is open at the time, the next implementation branch carries it as its **first commit**, before implementation begins. Plan-only branches add documentation noise to the history without producing implementation value — a plan evolves with the work that justifies the change. It does **not** track per-Work-Item progress or status — that belongs to the Issues, which the plan links and never mirrors (an execution plan owns the strategy, sequencing, rationale, risk, and structure; Issues own implementation, status, progress, and acceptance criteria — see [Documentation Strategy §5](../architecture/documentation-strategy.md)). Update `Last Updated` on each change.

## Authoring a Plan

A new plan is drafted outside the tracked tree — under `.project/`, or wherever the analysis is being done — while it is still a **working document rather than project documentation**. Drafting belongs to whoever holds the analysis, commonly a Worker together with the human; drafting is not authority, and a plan governs only once approved. On approval the plan moves into `docs/plans/` **in the first branch of its first Work Item**, and from that commit it is project documentation. A branch is never created solely to *author* a plan. **Where an effort adopts several plans at once** — one per track — they enter together in a **Documentation Work Item of its own**, with its Issue and its review, because no single implementation branch owns them all ([ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 2).

**A new plan, and a full refactor of an existing one, are reviewed and approved before implementation begins.** They are not amendments and do not ride into a branch mid-effort — the approved plan is what the first Work Item is cut against. Every other plan change *is* an amendment and follows *Updating a Plan* above.

## The execution log

A plan **may** carry an execution log as its last section — the one section a worker appends to while the track runs. It exists so that the plan, read on its own, tells a newcomer what the track has settled, without the plan becoming a second tracker.

- **An entry is written when a Work Item's pull request merges** — never while it is open, so the log records what happened rather than what is planned.
- **An entry holds** its Work Item's Issue and pull request, what it **settled** that outlives it, which sections of the plan it **amended**, and what it **recorded** (a finding, or an Issue raised). Three to six lines.
- **It carries no live status.** Nothing is in progress, next, blocked or scheduled here, and acceptance criteria are not restated: that is the tracker's, and the plan links it rather than mirroring it ([ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 3).
- **The plan's other sections change only by amendment**, per *Updating a Plan*, and the entry names the amendment in one line.
- **A pointer near the top of the plan names the log's section** — a pointer only, never a position marker, which would be the same fact kept in two places.
- **At `Historical`,** the log is what Reconciliation is written from.

This convention is new: it is reviewed when the first track carrying a log reaches `Historical`.

## Plan Index

| Plan | Type | Status | Parent Issue |
|---|---|---|---|
| [arabic-rtl-support.md](historical/arabic-rtl-support.md) | Execution | Historical | [#754](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/754) |
| [channel-verification.md](channel-verification.md) | Execution | Active | [#403](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/403) |
| [component-architecture-unification.md](historical/component-architecture-unification.md) | Execution | Historical | [#465](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/465) |
| [design-system-components.md](historical/design-system-components.md) | Execution | Historical | [#522](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/522) |
| [design-system-reestablishment.md](historical/design-system-reestablishment.md) | Execution | Historical | [#414](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/414) |
| [login-registration-refinements.md](historical/login-registration-refinements.md) | Execution | Historical | [#384](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/384) |
| [mail-delivery.md](historical/mail-delivery.md) | Execution | Historical | [#598](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/598) |
| [password-reset.md](historical/password-reset.md) | Execution | Historical | [#632](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/632) |
| [media-implementation.md](media-implementation.md) | Execution | Active | [#305](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/305) |
| [backend-plan.md](backend-plan.md) | Execution | Active | [#791](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/791) |
| [design-system-plan.md](design-system-plan.md) | Execution | Active | [#792](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/792) |
| [shared-platform-plan.md](shared-platform-plan.md) | Execution | Active | [#793](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/793) |
| [frontend-features-plan.md](frontend-features-plan.md) | Execution | Active | [#794](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/794) |
| [pages-plan.md](pages-plan.md) | Execution | Active | [#795](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/795) |
| [auth-first-grant-retirement.md](historical/auth-first-grant-retirement.md) | Migration | Historical | [#357](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/357) |
| [documentation-migration-plan.md](historical/documentation-migration-plan.md) | Migration | Historical | [#215](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/215) |
| [frontend-zone-migration.md](historical/frontend-zone-migration.md) | Migration | Historical | [#678](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/678) |
| [frontend-capability-structure.md](historical/frontend-capability-structure.md) | Refactoring | Historical | [#678](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/678) |
