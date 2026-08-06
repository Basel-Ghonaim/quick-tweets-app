# ADR 0001: Constitutional Architecture Reconciliation

> **Status:** Accepted
> **Date:** 2026-06-27
> **Deciders:** Basel Ghonaim

## Context

The project adopted a [constitutional documentation architecture](../documentation-strategy.md) and authored its governing documents incrementally. During that work, the originally-planned single `docs/development/workflow.md` — intended to consolidate Git, AI, and working-principle conventions — was instead finalized as **two** documents, split by concern:

- [`engineering-principles.md`](../../development/engineering-principles.md) — code design (what good code looks like);
- [`engineering-execution-standard.md`](../../development/engineering-execution-standard.md) — process and execution (how work is executed).

The split applies Single Responsibility at the document level: code-design principles and execution process are distinct subjects with distinct reasons to change. Both documents are now authored and merged.

Three consequences were deferred — intentionally — until the Engineering Execution Standard merged, and are reconciled here:

1. **The governing documents still describe the pre-split world.** The [Documentation Strategy](../documentation-strategy.md)'s directory structure (§4) and the [Migration Plan](../../plans/documentation-migration-plan.md) still name a single `workflow.md`; [CLAUDE.md](../../../CLAUDE.md)'s Authoritative Documents still point to the legacy `src/docs/Principles/*` files.
2. **"Constitutional document" has no defining owner.** The Engineering Execution Standard uses the term (§9) as a heightened-review trigger, but no document defines which documents constitute the constitution.
3. **CLAUDE.md's decision-authority summary is stale.** Its non-negotiable "editing authoritative documents are human-only" predates and contradicts the Standard's refined model (§10), under which the AI may *draft* changes to authoritative documents (propose → approve) while only a human authorizes the *merge* that makes them canonical.

## Decision

Finalize and reconcile the constitutional architecture:

1. **The `development/` documentation is split by concern** into `engineering-principles.md` (code design) and `engineering-execution-standard.md` (process), permanently replacing the planned single `workflow.md`. This is the architecture's intended state.

2. **The Constitutional Document set is defined** and owned by the Documentation Strategy. The constitution comprises the small set of governing documents that define how the project's documentation, engineering, and execution work:
   - [`CLAUDE.md`](../../../CLAUDE.md) — the AI session bootstrap and entry pointer;
   - [`documentation-strategy.md`](../documentation-strategy.md) — documentation governance;
   - [`engineering-principles.md`](../../development/engineering-principles.md) — code-design principles;
   - [`engineering-execution-standard.md`](../../development/engineering-execution-standard.md) — execution process.

   The [Migration Plan](../../plans/documentation-migration-plan.md) is a binding *execution plan*, not a governing constitution, and is excluded.

3. **Decision authority follows the Engineering Execution Standard's §10.** Editing an authoritative or constitutional document is an AI-draftable, propose → approve action; only the merge that makes a change canonical is human-authorized. CLAUDE.md's summary is reconciled to this model.

4. **The decision is propagated** into the dependent governing documents (Documentation Strategy, CLAUDE.md, Migration Plan), with the Standard's §9 referencing the constitutional-document definition — all co-versioned with this ADR.

## Alternatives considered

- **Multiple ADRs, one per reconciliation.** Rejected: the items are facets of one decision and edit the same governing files; separate ADRs would produce overlapping, conflicting branches and leave the constitution self-contradictory between merges.
- **Plain documentation corrections, no ADR.** Rejected: the Documentation Strategy (§11.3) requires an ADR for any material change to itself, and defining the constitutional set and reconciling decision authority are material governance decisions, not routine corrections.
- **Including retirement of the legacy `src/docs/Principles/*` files.** Rejected and kept out of scope: physically deleting those files is documentation *migration execution* (Migration Plan steps 1 and 6), with its own ordering and link-repointing. This ADR repoints away from them and corrects the plan's mapping; deletion belongs to that migration Work Item.

## Consequences

- The constitution describes its actual structure, and "constitutional document" has a single owning definition that other documents reference.
- The Documentation Strategy, CLAUDE.md, and the Migration Plan are updated in this change to match.
- The legacy `src/docs/Principles/*` files remain on disk, now orphaned — no authoritative pointer references them — and are therefore non-authoritative pending their migration Work Item.
- This ADR **initializes the ADR register** (`docs/architecture/decisions/`) and establishes the `NNNN-title` file-naming convention.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
