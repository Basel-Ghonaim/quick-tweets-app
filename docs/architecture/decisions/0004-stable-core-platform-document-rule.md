# ADR 0004: The Stable-Core Rule — a Platform Document Is Created Only When Its Subsystem Has a Stable Core

> **Status:** Accepted
> **Date:** 2026-07-14
> **Deciders:** Basel Ghonaim

## Context

The documentation migration (parent [#215](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/215), final Work Item G3 / [#271](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/271)) ran several **working rules** that were deliberately kept on trial — used during execution but not made constitutional. Issue [#273](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/273) is the post-migration governance review that dispositions them. This ADR records the decision on one of the three: the **Stable-Core rule**.

The rule: a subsystem earns its own authoritative **platform document** only when it has a *stable core* — at least one fact that is real, settled, cross-cutting, non-obvious, and not already owned elsewhere. A stable *rule or decision* warrants a document; a volatile *inventory* does not. Absent a stable core, the document is **deferred** — its durable material is captured in an interim source and synthesized later — and the deferral records a re-evaluation trigger expressed as a **code-state condition** (the capability existing in code), not a date.

The rule was applied repeatedly during the migration, not as a passing habit. Most visibly, it caused the migration's **single deliberate deferral** — the frontend `state-and-data.md` document (E2): a maturity review found the RTK Query cache/data layer unrealized in code, so a document authored then would have described a plan, not an implementation. Its authoring was deferred with a code-state re-evaluation trigger, recorded in the [Migration Plan](../../plans/historical/documentation-migration-plan.md) §3 status preamble and §8 (Execution Reconciliation, item 1); its continuity owner [#272](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/272) remains open — the trigger has not fired. The same rule also gated the scope of several other documentation Work Items.

It also remains valid **beyond** the migration: it governs a recurring, non-migration question — *when does any subsystem earn its own platform document?* — and its `state-and-data.md` trigger is still live in #272.

Under the refined ADR threshold ([ADR 0002](0002-refined-adr-threshold.md)), the rule's operative text has a **natural owner**: the [Documentation Strategy](../documentation-strategy.md), which governs *what documentation exists and when it must change* (§5) and already owns the kindred Principles 4 (describe conventions, not inventory) and 5 (document only what exists). It is therefore **not** an owner-less "fact" that a standalone ADR should hold, unlike [ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md). But adopting it **changes which whole documents the project creates** — a *material* change to the constitution, which Strategy §11.3 requires be recorded as an ADR. This is the ADR 0002 pattern (an enacting ADR whose operative rule lives in the Strategy body), not the ADR 0003 pattern (an ADR that owns an owner-less decision) and not the C4 "no ADR" case (a decision an ordinary platform document already owns).

Until now the rule's only homes were the Migration Plan — a binding execution plan, **not** a constitutional document ([ADR 0001](0001-constitutional-architecture-reconciliation.md)), now complete and retained only as history — and non-authoritative AI session memory. A durable, general governance rule should not live only in a retired execution plan.

## Decision

**Constitutionalize the Stable-Core rule.** Its operative text is added to the [Documentation Strategy](../documentation-strategy.md) §3 (Documentation Ownership Model), where it **complements Principles 4 and 5 by introducing a whole-document eligibility criterion**. The Strategy owns the operative rule; this ADR records the decision to adopt it and the rationale for doing so — one fact, one owner.

This ADR dispositions **only** the Stable-Core rule. The other two rules reviewed in #273 are dispositioned in that issue and are **not** constitutionalized here: *Ripeness-based sequencing* is retired (a spent, migration-execution corollary of this rule, with no content of its own), and the *Adaptive maturity caveat* continues on trial pending further evidence. Neither is recorded in the constitution.

## Alternatives considered

- **Leave it on trial / keep it only in the Migration Plan.** Rejected: the rule is durable, general, and still load-bearing (its #272 trigger is unfired), yet its only homes were a now-complete, explicitly non-constitutional execution plan and non-authoritative memory — leaving a live governance rule effectively homeless.
- **Record the adoption as a routine clarification PR, without an ADR.** Rejected: it changes the governance model for which whole documents are created — a *material* change to the Strategy, which §11.3 requires be recorded as an ADR. This is the same reasoning ADR 0002 applied to its own adoption.
- **Mint a standalone ADR that holds the rule text (the ADR 0003 shape).** Rejected: the Strategy is the rule's natural owner, so an ADR holding the rule would split one fact across two homes — the one-owner-per-fact violation ADR 0002 exists to prevent. The ADR records the *decision*; the Strategy holds the *rule*.
- **Retire it (as Ripeness-based sequencing was).** Rejected: unlike Ripeness, Stable-Core adds a whole-document existence gate the constitution does not otherwise state, and its validity outlives the migration.

## Consequences

- [Documentation Strategy](../documentation-strategy.md) §3 carries the operative Stable-Core rule; it is now binding governance for when a platform document is created. §4's section-level rule ("A Description's sections appear only when the code exists") cross-references it as the whole-document analog.
- The rule's disposition is complete: the durable rule lives in the Strategy, this ADR records why, and the Migration Plan §8 (item 1) remains the historical record of its first application. The interim `src/docs/rtk-query-strategy.md` and the open #272 re-evaluation trigger are unaffected.
- **Reference correction:** #272 and #273 cited a non-existent "Migration Plan §8.1." The plan has no §8.1 — the Stable-Core content is in the §3 status preamble and §8 (Execution Reconciliation, item 1). Those dangling references are corrected to §8 (item 1).
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
