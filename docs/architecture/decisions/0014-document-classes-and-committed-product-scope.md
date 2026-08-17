# ADR 0014: Documents Are Classified by What They Claim, and Committed Product Scope Has an Owner

> **Status:** Proposed
> **Date:** 2026-08-17
> **Deciders:** Basel Ghonaim
> **Amends:** [Documentation Strategy](../documentation-strategy.md) §2 (Principles 5 and 6) and §3

## Context

Documentation Principle 5 read *"Document only what exists. A section is written only when the code it describes exists."* It governed a document's **tense** where it should have governed its **claim**, and the project had already outgrown it twice.

[ADR 0006](0006-execution-plans-home-and-lifecycle.md) hit the tension first — execution plans are forward-looking — and resolved it correctly: not with an exception, but by naming a distinct artifact class, *"clarifying the scope of Principles 5–6"* rather than weakening them. [ADR 0012](0012-foundation-contract-independent-of-consumer-adoption.md) hit it again and named the underlying error precisely — the discipline *"inverts when applied to a foundation whose whole purpose is to be adopted later"* — but fixed it only for the Design System's own documents. The generalisation was never made, so the next case had nowhere to go.

That next case was the product's known shape. The consequences were not theoretical:

- **The Design System's component set was orphaned.** [ADR 0010](0010-design-system-platform-reestablishment.md) deferred *"which components exist"* to an execution plan; that plan is now `Historical`, and ADR 0006 holds that permanent documents own the resulting *what*. No permanent document received it.
- **ADR 0010's own grounding criterion became uncheckable.** It admits a concept named in *"a decision or roadmap already taken"* — and no active document held that roadmap.
- **A rule survived only in a retired plan.** That the auth module is a prototype and not a source of the design language was recorded in the same `Historical` plan, which also records an agent proposing to derive type roles from it.

The pattern is one failure, not three: an operative rule with nowhere legitimate to live ends up in a plan or a finding, and leaves governance when that artifact retires.

## Decision

**A document is governed by what it claims, not by whether its subject exists yet.**

1. **Principle 5 states the invariant directly: a document never claims that something exists when it does not.** This binds every class. What a document may say beyond that follows from its class, not from its tense.

2. **Five document classes, four of which name what the project already had.** *Description* (this exists), *Contract* (this is the rule, for whoever adopts it), *Record* (this happened), *Plan* (this is how committed work is sequenced), and **Commitment** — this is part of the product, decided, built or not. Commitment is the one addition.

3. **Three rules keep the model from becoming a loophole.** A declared class must be **true** — a document is the class its content asserts, so relabelling a header cannot launder prose that describes a system. **No class licenses a false claim of existence.** And a class other than Description **declares itself in the header**, because Description is the reading a document gets by default.

4. **A Commitment names; it never specifies.** It carries what the product is committed to and why, and never an API, a value, a mechanism, a structure, or live status. It is **evidence, never authority** — it settles that a concept is named, which is one way a need is grounded, and decides nothing about how the thing is designed or which layer owns it.

5. **A commitment is made by a decision, not by being written down.** Recording one reports a decision already taken. Without this, an author could record a commitment and then cite it as the grounding that authorised the work.

6. **The product's committed scope has one owner — the [project overview](../../project/overview.md)** — which already claimed the product's scope and could previously hold only the half that existed.

The operative text lives in the [Documentation Strategy](../documentation-strategy.md) §2 and §3. This ADR holds the decision and the reasoning; it is not the rule's home.

## Why this is an ADR

Under [ADR 0002](0002-refined-adr-threshold.md) most documentation changes are **not** ADRs — a document that naturally owns a fact owns its rationale too, and no record is minted. This one qualifies on **criterion 2**: it changes what a document class is for and assigns ownership of a fact that had none, which [Documentation Strategy §11.3](../documentation-strategy.md) names as an architectural decision, and its rationale must outlive any single document. It is the [ADR 0004](0004-stable-core-platform-document-rule.md) shape — an enacting ADR whose operative rule lives in the Strategy body.

**It sets no precedent for smaller changes.** A new token, a new component, a new Foundation member, or a wording change remains owned by its document and mints no ADR.

## Alternatives considered

- **A third exception inside Principle 6.** Rejected: the principle already carried one for plans, and enumerating exceptions does not scale — the next forward-looking need would be the third patch on one rule, with no test for whether a fourth was legitimate.
- **Record committed scope in the issue tracker only.** Rejected: the tracker owns live status, which is what Principle 6 was really protecting. Committed scope is durable, must be citable by a contract, and an ADR criterion cannot rest on evidence that closes.
- **A separate product-scope document.** Rejected: the overview already owns product scope, and splitting one responsibility across two documents is the one-owner violation this project exists to prevent.
- **Leave the component set with the Design System.** Rejected: enumerating members is what [ADR 0012](0012-foundation-contract-independent-of-consumer-adoption.md) Decision 3 forbids a contract to do, and which components the *product* needs is not the language's decision.

## Consequences

- **A forward-looking need now has a legitimate home**, so the failure that stranded three rules in retired artifacts has a route that does not depend on an artifact's lifecycle.
- **Accepted:** the class of a document is a review judgement. A check can see whether a header declares one; only a reader can tell whether the declaration is true.
- **Accepted:** declaration is not retroactive. Documents predating this ADR declare their class the next time they are materially changed, so the corpus is briefly mixed rather than swept.
- ADR 0010 Decision 2(ii) and ADR 0012 Decision 5 are revised in place; both remain `Accepted`.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
