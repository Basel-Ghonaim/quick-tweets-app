# ADR 0002: Refined ADR Threshold — ADRs Only for Owner-less or Independently-Preserved Decisions

> **Status:** Accepted
> **Date:** 2026-06-28
> **Deciders:** Basel Ghonaim

## Context

During the documentation migration (Phase C, Work Item C4), the legacy decision logs — `setup-log.md`, `Gaps-and-shortcomings-map.md`, and the `schema-form` decision log — were surveyed for ADR extraction. Applying the existing ADR bar ([§8](../documentation-strategy.md): long-term architectural impact, hard to reverse, affects multiple parts, explains a choice), several decisions appeared ADR-worthy: hybrid token storage, the custom schema-driven form engine, the flat-route reform, and the dual pagination strategy.

But each of those decisions has a **natural authoritative owner** among the project's documents — the backend security and frontend platform docs, and the API contract. The existing §8 rule, *"ADRs are the single owner of architectural rationale; other documents link to ADRs,"* would create an ADR for each, with the platform doc linking to it. That splits a single decision's rationale across two homes — the ADR and the owning document — which **violates one-owner-per-fact** ([Documentation Strategy §2](../documentation-strategy.md)).

The gap: the architectural bar alone does not distinguish a decision that *needs a standalone record* from one whose rationale a platform document will naturally own.

## Decision

Refine the ADR threshold. **An ADR is created only when a decision:**

1. has **no natural authoritative owner** among the project's documents — it is not a platform, contract, or feature mechanism that some document already owns; **or**
2. **must be preserved independently** of its implementation and future documentation — a repository-wide or constitutional decision whose rationale outlives any single document. [ADR 0001](0001-constitutional-architecture-reconciliation.md) is the archetype.

When a decision has a natural platform, contract, or feature document as its owner, **that document owns both the mechanism and its rationale, and no ADR is created.** This **narrows** §8's prior claim that "ADRs are the single owner of architectural rationale": ADRs own architectural rationale that *no other document owns*.

The four decisions surveyed in C4 all have natural owners and therefore receive **no ADR**; their rationale is captured by the platform docs as those documents are authored (Phases D/E).

## Alternatives considered

- **Keep the existing bar — create ADRs for the four C4 decisions.** Rejected: it duplicates each decision's rationale across the ADR and its owning platform document — the one-owner violation this project exists to prevent.
- **Record this refinement as a clarification PR, without an ADR.** Rejected: it changes the ownership model for a whole class of architectural rationale, and changes which artifacts are created — a *material* change to the Strategy, which §11.3 requires be recorded as an ADR. (It is also, by the refined rule's own criterion 2, exactly the kind of decision that must be preserved independently.)

## Consequences

- [Documentation Strategy §8](../documentation-strategy.md) is updated to carry the refined rule; its "single owner of architectural rationale" wording is narrowed accordingly.
- The [Documentation Migration Plan](../../plans/documentation-migration-plan.md)'s ADR-routing language — its inventory rows, single-owner table, migration steps, ordering invariants, risk controls, and summary — is reconciled to route durable decision rationale to its natural-owner documents, with ADRs reserved for owner-less or independently-preserved decisions.
- The ADR register stays deliberately small; platform, contract, and feature documents own their own decisions' rationale.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
