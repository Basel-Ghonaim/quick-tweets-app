# ADR 0018: Composition Has a Home — Four Frontend Zones and What Each Owns

> **Status:** Accepted
> **Date:** 2026-09-09
> **Deciders:** Basel Ghonaim
> **Amends:** [Frontend Architecture](../../frontend/architecture.md) — the zones, the dependency rule, and the module contract

## Context

The frontend has three zones and a rule that `modules/` never import each other, met by *"promoting the shared piece to the platform."* That answer holds only while the shared piece is domain-agnostic, because `shared/` is required to hold zero feature knowledge and `app/` is required to hold no business logic.

**A flow that spans two capabilities therefore has nowhere legal to live.** It cannot sit in a feature, because it belongs to no single one; it cannot sit in `shared/`, which may not know a feature; and it cannot sit in `app/`, which holds no business logic. What happens instead is that it is **absorbed by whichever feature met it first** — which is how profile completion, which belongs to a capability the product has not built, came to live inside authentication.

A second defect compounds it. The module contract's public surface is *"the feature's route subtree"*, which only a route-owning thing can satisfy. A capability that owns no route — liking, following, editing a profile — can never be a module under that contract, so modules drift toward being page-shaped and capabilities are pushed into `shared/` by the wording rather than by a decision.

The two are one problem seen twice: **there is no zone whose job is composition**, and the rule that should have identified one was attached to the wrong layer.

Two further inputs bear on the answer. The frontend will run **RTK Query** alongside the existing Redux Toolkit flows, which decides where server state lives and therefore what a shared domain layer would be left to do. And the product is committed to **Arabic and to right-to-left**, which decides that user-facing text is content rather than something a module owns.

## Decision

### 1. Four zones, one direction

`app → pages → features → shared`. Each zone may import the zones below it and never a zone above. **A slice never imports a sibling in its own zone** — one feature never imports another, and one page group never imports another.

### 2. The route subtree belongs to a page group, not to a feature

A **page group** publishes a route subtree; a feature publishes none. The guarantee the previous rule protected is unchanged — the composition root decides *whether and where* a subtree is mounted and never learns which screens exist inside it — but it now sits on the thing that actually owns routes.

### 3. A feature is a capability

A feature **owns a fact and the operations on it**. It may own the UI that *is* its interaction. It owns no route, no layout, and no other feature. A capability may legitimately have no UI at all; nothing here obliges one to invent some.

### 4. A page composes, and owns no fact

A page arranges capabilities, holds the route and the layout, and owns the loading, error and empty states of the arrangement. It is **the only zone permitted to import several features**. It may not reach transport directly, and it may not own state. Where a sequence of steps runs inside one capability, that capability owns the sequence; where it spans capabilities, the page does.

### 5. `shared/` is feature-agnostic, not domain-agnostic

`shared/` may know the product's nouns and its words. It may never know a **feature**. It admits platform mechanisms, shared domain vocabulary, cross-tier deterministic definitions, and product content — and nothing that is a feature's.

### 6. Copy is content, passed inward; validation rules are cross-tier definitions

User-facing text is **content addressed by key**, namespaced by surface. It travels *into* the code that renders it and is never imported outward by a platform capability, so adopting a translation layer replaces the catalogue without reshaping any consumer. Validation **rules** are a different kind of thing: a deterministic definition the server also states, mirrored on this tier and reconciled by hand. Neither belongs to a feature. The two are separated because one is data and the other is content, and only the second is translated.

### 7. RTK Query owns server cache state; it does not own domain logic

The cache is where server state lives. It makes no claim on domain logic, so it is never a reason to refuse a domain layer.

### 8. `entities/` is not created now, and the condition that would admit one is stated

No need has been demonstrated: server state is held by the cache, and shared wire vocabulary is served from `shared/`. A separate domain layer becomes **admissible when domain logic must exist independently of the cache** — client-side derivation shared across features, an optimistic graph, offline state, or a second data source the cache cannot hold. That is a code-state condition, not a date, and this decision is not a prohibition ([Documentation Strategy §8](../documentation-strategy.md)).

### 9. Story files may compose across zones

A story renders a thing in the composition a reader actually meets, and that composition is a page. Story files are therefore exempt from the zone direction; **production code is not.** The exemption is bounded to rendering and evidence, and buys the rendered-accessibility proof the layer depends on ([Finding 0022](../findings/0022-subtle-fills-are-composites-no-token-check-measures.md)).

## Alternatives considered

- **Keep three zones and compose inside `app/`.** Rejected: it spends the composition root's thinness, which is a good invariant defended repeatedly. Page composition is business-shaped — it decides which capabilities appear together — so admitting it to `app/` abandons that zone's charter rather than extending it.
- **Adopt Feature-Sliced Design in full.** Rejected: six layers for an application with one feature built, and its own authors have since de-emphasised entity-first decomposition on the grounds that identifying entities needs judgement and produces inconsistency. Its vocabulary also collides with this project's — an FSD "feature" is a single interaction, not a capability — so the layer names would import a second meaning for a word already in use.
- **Feature-to-feature contracts as the general answer.** Rejected as the *general* answer: injecting a contract wherever two features meet is machinery ahead of the need, and most of what motivated it is composition, which now has a home. It remains the answer for the narrow case — one feature needing behaviour another owns and must keep owning, where composition cannot reach.
- **Features hold logic only, with all UI above them.** Rejected: it splits one reason to change across two zones, so a change to how a capability behaves touches its logic in one place and its control in another. It also rebuilds, under new names, the technical-layer split this project has been dismantling. Its real driver is multi-platform reuse, which does not apply here.
- **Leave the route-subtree rule on the feature.** Rejected: it is what pushes routeless capabilities into `shared/` by wording rather than by decision, and it is the reason the current module is page-shaped.

## Consequences

- **[Frontend Architecture](../../frontend/architecture.md) is superseded on the outer architecture** — the zones, the dependency rule, and the module contract. It states the operative rules in their new form as the structure lands; this ADR holds the decision and the reasoning, and the two are not duplicated ([ADR 0012](0012-foundation-contract-independent-of-consumer-adoption.md) Decision 5).
- **Authentication ceases to be a feature.** It is a URL space and a layout — a page group — and the capabilities it currently contains are separate. That follows from Decision 3 rather than being decided separately here.
- **A page group is a routing and layout unit, never a domain claim.** One may hold routes with opposite access modes, so an access guard belongs visibly at each route and is never inherited from the group.
- **The two rules a page must not break are mechanically checkable** — no transport import, no state ownership — and nothing enforces the zone direction today. An unenforced boundary is what produced this ADR's context.
- **`shared/` becomes a judgement call where it was a bright line.** This cost is accepted and named: what it admits is enumerated in Decision 5 rather than left to be inferred, and the zone is expected to be revisited on its own terms.
- **[#623](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/623) narrows rather than closes.** Its motivating case is composition and is answered here; the mechanism it proposes survives for the case composition cannot reach — most likely the current user's identity, which many features want and none owns.
- **Nothing about the Users capability is decided.** Where profile behaviour finally lives is that capability's question, and any placement made before it exists is temporary by construction.
- **No file moves and no behaviour changes** because of this ADR. Sequencing is an execution plan's, and the placements it implies are Work Items' — neither is recorded here.

Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
