# ADR 0006: A Home and Lifecycle for Execution Plans

> **Status:** Accepted
> **Date:** 2026-07-14
> **Deciders:** Basel Ghonaim
> **Revised:** 2026-08-05 — the `Draft` stage gains a location: a plan is drafted outside the tracked tree and enters `docs/plans/` on approval. Lifecycle and home otherwise unchanged.

## Context

The project produces **execution-oriented plans** — migration plans, execution plans, refactoring plans, release plans: multi-Work-Item efforts that need a durable, shared reference for their strategy and sequencing. The project already **recognizes** this artifact class — the [Engineering Execution Standard](../../development/engineering-execution-standard.md) §12 routes "a strategy or migration plan … [to be] authored as **Documentation**," §1 defines a Planning task class, and [ADR 0001](0001-constitutional-architecture-reconciliation.md) classified the Documentation Migration Plan as "a binding execution plan, not a constitutional document."

What is missing is a **home** and a **lifecycle**:

- the Migration Plan sits in `docs/architecture/`, which owns system topology, ADRs, and findings — **not** execution plans — and improvised its own status line ("Complete … retained as a historical reference");
- ephemeral planning has been lost: a gitignored local roadmap, retired in the migration's final phase, was the **only** home of two working rules that [#273](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/273) had to recover.

Execution plans are **forward-looking**, which puts them in tension with Documentation Principles 5 (document only what exists) and 6 (future work lives in the issue tracker). They must therefore be a **distinct, lifecycle-governed artifact class** with a clear **artifact boundary** from the permanent reference documentation — not folded into it.

Establishing this category is a **material change to the documentation structure** (a new top-level category and a clarified principle boundary), which [Documentation Strategy](../documentation-strategy.md) §11.3 requires be recorded as an ADR — the same route as [ADR 0002](0002-refined-adr-threshold.md) and [ADR 0004](0004-stable-core-platform-document-rule.md). We deliberately do **not** create a Planning or Execution *Strategy* document: the practice has **no Stable Core yet** (ADR 0004 — one completed instance), and the Execution Standard (§1, §12) together with the Documentation Strategy already own the governance.

## Decision

Introduce a formal home and lifecycle for execution plans, without a new governance subsystem.

1. **Home — `docs/plans/`.** Execution plans live in a **top-level** documentation category, because they are **project-level** artifacts (migration, execution, refactoring, release plans), not development-only. The category's operative convention (lifecycle, plan-header template, and boundary) lives in `docs/plans/README.md`.

2. **Lifecycle — `Draft → Active → Historical`.**
   - **Draft** — authored and under review; not yet governing, and **not yet project documentation**. A draft lives in the architect's working area outside the tracked tree; it enters `docs/plans/` on approval, in the first branch of its first Work Item.
   - **Active** — approved and governing an in-flight effort; the live reference, maintained for the effort's *strategy and shape* (not per-Work-Item status).
   - **Historical** — archived and read-only; the effort has concluded and the durable knowledge is now owned by the permanent documents, to which the plan links forward.

   **One effort → at most one Active plan.** At any point in time an effort has at most one execution plan in the `Active` state; if it is replaced, the superseding plan becomes `Active` and the prior one moves to `Historical`.

   The `Active → Historical` transition is **gated by reconciliation**: the durable knowledge is migrated into the permanent documents (architecture docs, ADRs) and any findings are recorded **before** the plan is archived. "Completed" is that reconciliation transition, **not** a first-class state — just as an ADR has no "accepting" state between `Proposed` and `Accepted`. The *reason* for archival (completed, or superseded/abandoned) is recorded inside the plan, not modeled as a state.

   **Why `Historical` is retained.** An archived plan is kept — never deleted — as the project's **provenance and audit trail**: the durable record of *how* an effort was reasoned about, sequenced, and executed. The permanent documents own the resulting *what*; the Historical plan preserves the *why, and how the project got there*. This is the antidote to the knowledge loss this decision exists to prevent — a retired, gitignored roadmap that took the only record of two working rules with it ([#273](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/273)).

3. **Ownership boundary — no duplication.** An execution plan owns the **strategy, sequencing, rationale, risk management, and execution structure** of a multi-Work-Item effort. **Issues** (and the tracker) own the **implementation, status, progress, and acceptance criteria** of each Work Item. A plan **links** its Parent Issue and never mirrors Work-Item status.

4. **Artifact boundary — plans are not permanent reference documentation.** Documentation Principles 5 and 6 govern the **permanent reference documentation** (which must describe only what exists). Execution plans are a **separate, lifecycle-governed class** that captures forward-looking strategy; they are governed by this ADR and the Documentation Strategy, and are kept out of `architecture/` and the other permanent categories. This **clarifies the scope** of Principles 5–6; it does not weaken them.

5. **Governance placement — extend existing owners, add no new one.** Governance lives in this ADR and the [Documentation Strategy](../documentation-strategy.md): the Strategy records the **category** (location, responsibility, and the artifact boundary), and this ADR records the **decision, the lifecycle, and the rules**. `docs/plans/README.md` owns only the **template, layout, and authoring conventions** for a plan — not governance. The Execution Standard §12 **points** to the home. One fact, one owner.

## Alternatives considered

- **A dedicated Planning / Execution Strategy document.** Rejected: the practice has no Stable Core (ADR 0004 — a single completed instance), and such a document would duplicate the governance the Execution Standard (§1, §12) and the Documentation Strategy already own.
- **`docs/development/plans/`.** Rejected: execution plans are project-level (migration, execution, refactoring, release), broader than `development/`'s "how the team works," and a governing document need not sit beside its instances (ADRs are governed by the Strategy yet live in `decisions/`).
- **A first-class `Completed` state.** Rejected: completion is the reconciliation transition into `Historical`, not a durable resting state — mirroring `Proposed → Accepted` having no intermediate state.
- **Issue-tracker only (no plan documents).** Rejected: it loses the durable strategy and rationale that must outlive closed issues — the exact knowledge loss #273 had to recover from a retired scaffold.
- **Leaving execution plans in `architecture/`.** Rejected: wrong owner; the anomaly this decision resolves.

## Consequences

- A new top-level category `docs/plans/` exists, governed lightly: a home README convention, a Documentation Strategy category entry with the artifact boundary, and this ADR. No new governance subsystem.
- The Documentation Migration Plan is the category's first inhabitant; **relocating it into `docs/plans/` and marking it `Historical` is a separate follow-up Work Item** (it repoints links in ADR 0001, the Strategy, and the README — link-integrity maintenance per Strategy §11.5, not a decision change). This ADR does not move it.
- Documentation Principles 5 and 6 are **clarified in scope** (permanent reference documentation), not weakened.
- The Execution Standard and the Documentation Strategy retain governance ownership; this ADR adds only the pointers that wire the category in.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
