# ADR 0020: Proof Has a Home — Testing Topology, and Tools Adapt to the Architecture

> **Status:** Accepted
> **Date:** 2026-09-13
> **Deciders:** Basel Ghonaim
> **Revised:** 2026-09-16 — Decision 5 states that what the server would send, given at the network boundary, is an answer, and transport-level request mocking is no longer a rejected alternative. Every Decision stands.

## Context

Three frontend capabilities publish their server-facing port through their root barrel. Every external consumer of those ports is a story file or a screen that exists to pass one to a story: **no production call site anywhere in the repository supplies one.** The same holds one layer down — every hook takes an optional gateway that nothing in production passes — and one layer below that, the three published types exist so that a story outside a capability can name a double, because the barrel rule binds story files while [ADR 0018](0018-composition-has-a-home-four-frontend-zones.md) Decision 9 exempts them only from the zone direction.

The dependency arrow points the wrong way. Production carries four layers of declarations that exist to serve a testing tool.

**The cause is not the tool, and not any Work Item.** Every Work Item met the Definition of Done as written, because [Engineering Execution Standard §9](../../development/engineering-execution-standard.md) asks that new behaviour be *"covered by tests"* without naming a lane, so proof in any lane satisfies it literally. There was no rule to violate: **where a behaviour is proven has no owner in this project.** It appears in no category in [Documentation Strategy §5](../documentation-strategy.md), in no row of §6, and nowhere on the map in [`docs/README.md`](../../README.md). [Engineering Principles §8](../../development/engineering-principles.md) is two sentences, both about design.

Two vacuums followed from that absence, and the tool filled them because it was the only lane that could. The unit lane runs without a DOM, so no hook in the repository can be mounted in it — and none has a test. The frontend has no integration lane at all, so nothing automated proves that the wire shapes a gateway expects match what the server returns. Meanwhile the capability to run stories as browser tests arrived fully wired with the tool's own scaffold, before anyone had asked what it should prove. What began correctly — components whose only dependency is their props — was extended to screens whose dependency is a server, and the lane demanded a source of answers that only production could give it.

The result is proof duplicated across lanes. A code normaliser is proven by its own unit test and again through a browser with a fake gateway; an error-to-wording map is proven in its service test and again in two stories; a resend window is proven in three places. The expensive lane re-proves what the cheap one already holds, and the cost of that was paid in production signatures.

## Decision

### 1. Testing topology is an owned fact, and its owner is a document

The owner is a document named for its subject, as every document here is: **Testing Topology**. It owns **the placement of proof** — which lanes exist, what each proves, what each is forbidden, and the rule that assigns a behaviour to one. It does **not** own the *quality* of proof, which remains [Engineering Principles §8](../../development/engineering-principles.md)'s.

The name is narrower than *Testing Strategy* deliberately. The gap found was one of placement — every existing test is well written and several are in the wrong lane — and a document named wider than its gap invites the absorption of responsibilities that already have owners.

### 2. The owner states rules; no role reviews evidence

The document carries the standard `Owner:` line like every other. It creates **no reviewing role**: no one approves where a Work Item proves its behaviour.

An invariant that depends on a reader noticing is an invariant already eroding ([Agent Onboarding §10](../../development/agent-onboarding.md)). Authority is therefore exercised in three places that do not depend on attention — a written rule, a condition in the Definition of Done, and a check that fails — and by a human only at escalation (Decision 8).

### 3. A behaviour is an outcome, and its owner is the unit that decides it

**A behaviour is an outcome, attributed to the single unit that decides it. The lane follows the nature of that unit.**

Without this, *one behaviour, one lane* is a slogan rather than a rule, and each Work Item returns to the judgement that produced the gap.

Its working consequence is that one visible effect is often **two** behaviours with two owners. A refusal a reader sees is *which words are said*, decided by a service, and *that they are announced in an alert region*, decided by the component. Asserting the first in a browser and the second in a unit lane are both misassignments, and the definition says which is which without argument.

### 4. One behaviour, one lane — by ownership, not by exclusion

**A behaviour is owned by exactly one lane.** Another lane may traverse it incidentally; it may not take it as its subject.

The test is: **if this lane's case were deleted, would the behaviour still be proven?** Yes — the case is incidental and permitted. No — this lane owns it, and must be the lane the topology assigns.

This is *one owner per fact*, which has governed documentation here since [ADR 0001](0001-constitutional-architecture-reconciliation.md), applied to proof. Applying it will **delete** cases whose subject belongs elsewhere rather than rewrite them, because a case stripped of its subject has nothing left to assert. Test counts will fall, and a falling count under this rule is not a regression — but it is a consequence a Work Item must declare rather than discover.

### 5. A browser lane proves only what cannot be true without a browser

A browser lane proves what cannot be established outside a real browser — rendered layout, visual state, responsive behaviour, the accessibility tree as computed, contrast, focus as painted. Anything a renderer without a browser could establish belongs to the cheaper lane.

Governing it: **a story is given the answer, never the answerer.** An *answerer* is anything supplied to a story that decides an outcome — a gateway, a client, a promise whose resolution the story controls to manufacture timing, or an error thrown to stand in for a server's refusal. Values, callbacks that only receive, and presentation settings are answers and remain permitted. **So is what the server would send, given at the network boundary** — a response, a refusal carried by its status, or a response withheld, which is a server that has not yet replied. Production's own transport and capability run against it and decide the outcome; an answerer is what is supplied to a story *inside* that boundary in their place.

It follows that a story knows nothing of a capability's `gateway/` layer, manages no state machine and implements none, and is never the source of proof for a service's or a gateway's behaviour.

This criterion is **tighter than "what the reader sees"**, and deliberately: the looser form leaves in the most expensive lane everything the cheapest could prove. Until the component lane of Decision 7 exists, the browser lane continues to hold interaction proof **by necessity and by disclosure**, not by right.

### 6. Four clauses bind every testing tool to the architecture

A testing tool is external. Production adapts to nothing it needs.

1. **If the tool were deleted, the production architecture would remain complete and correct.**
2. **No production declaration exists whose only consumer is a test.**
3. **A dependency seam sits at the unit that owns the dependency, and is never threaded upward through units that merely pass it.**
4. **Where a lane cannot prove something without a change to production, ask whether that change improves production independently of the test.** If **no**, the behaviour is in the wrong lane. If **yes**, production has a design problem and is corrected as one ([Engineering Principles §8](../../development/engineering-principles.md)) — never by opening a seam.

Clause 1 alone does not bite: every optional parameter added for a test survives it, because an optional parameter leaves a tree that still compiles and still behaves. Clause 2 is what detects them. Clause 3 is what distinguishes them from real inversion — **[Engineering Principles §5](../../development/engineering-principles.md)'s injectable factory defaults are unaffected, because a factory owns the dependency it injects**; what the clause forbids is a seam carried upward by a hook and a screen that own nothing. Clause 4 is the only one that prevents recurrence, by reversing the inference that produced this ADR: *the tool needs a gateway* is evidence about the lane, never about the architecture.

### 7. The topology is complete on the day it is decided

Two lanes are adopted now, though neither is built: a **component lane** with a renderer, owning lifecycle — when a capability is asked, how often, what it waits for — and a **frontend integration lane**, owning whether the wire shapes a gateway expects match what the server returns.

A topology with a hole in it reproduces the gap it was written to close: a behaviour with nowhere assigned goes wherever a lane can run it, which is the mechanism this ADR exists to stop.

This is not machinery built ahead of need. The need is demonstrated, not anticipated — no hook in the repository has a unit test, because the unit lane runs without a DOM and cannot mount one. Refusing to establish something grounded because it has no consumer yet is named as a mistake in [Agent Onboarding §6](../../development/agent-onboarding.md), and the condition-stating pattern of [ADR 0018](0018-composition-has-a-home-four-frontend-zones.md) Decision 8 governs the case where no need has been shown. That is not this case.

**Building them is a Work Item; deciding they exist is this ADR.**

### 8. What has no lane yet is recorded, bounded, and never added to

A behaviour whose lane is adopted but not yet built stays where it is, **named in the document as being outside its lane**, on a list that is closed the day it is written.

The list is a **record of debt, not an exemption from a check** — no check runs against it, and nothing is excused by appearing on it. Nothing joins it: a behaviour that arrives later and finds no lane is a **stop**, and the Work Item raises it rather than placing it in the nearest lane that can run it. The distinction matters because an exemption list that accepts new members is how a temporary state becomes the architecture, which is what happened here.

## Alternatives considered

- **Ratify the gateway prop and give it a name matching its type.** Rejected: it would write a migration artefact into the capability structure as a rule, and preserve a parameter that no production path has ever supplied. It treats the visible end of the problem as the problem.
- **Exempt story files from the barrel rule, as [ADR 0018](0018-composition-has-a-home-four-frontend-zones.md) Decision 9 exempts them from the zone direction.** Rejected as the answer, though it is sound as far as it goes: it unpublishes the ports, but leaves the dead parameter with no pressure on it at all, and leaves production still shaped by a tool. The barrel rule was only ever an oblique detector of a misplacement; the remedy is to state the rule directly, not to keep a poor detector for its side effects.
- **Transport-level request mocking.** Rejected when this ADR was decided, and no longer rejected on revision: none of the three objections survived the work that removed the seam. The dependency never enters the application's bundle, so Decision 6's first clause holds. It exercises more of the capability, not less: the gateway, the transport and the error normaliser all run where a double used to stand in for them. And varying it per case configures what the server answers, which Decision 5 counts as an answer. It is also a boundary the component and browser lanes share and the application does not own, which is what lets both put a screen whose whole input is a hook in a state without changing production.
- **A context provider per capability, read by the hook.** Rejected on cost rather than principle. [ADR 0019](0019-authentication-is-a-feature-and-the-session-is-platform.md) rejected a React context over the store for two reasons that do not reach here — a second read path over state the store already holds, and callers that are not React — but the provider remains a test-only affordance moved from a prop to a context, which is machinery the case does not need.
- **Give each capability a store, so a story seeds state as the one feature with a slice already does.** Rejected on the capability structure's own terms: a `store/` is present when state outlives the component that reads it, and none of these does.
- **Name the document *Testing Strategy*, absorbing Engineering Principles §8.** Rejected as wider than the gap, and recorded because it remains the consistent choice if the line between quality and placement later proves to be a seam rather than a boundary.
- **Make it a section of the [Engineering Execution Standard](../../development/engineering-execution-standard.md).** Rejected: that document's declared scope is process and execution, and where proof lives is closer to *what proof exists* than to *how work flows*.
- **State the two missing lanes as conditions rather than adopting them.** Rejected: the condition-stating pattern serves a need that has not been shown, and this need has been. A topology with a hole reproduces the gap.

## Consequences

- **[Engineering Principles §8](../../development/engineering-principles.md) is amended, not merely pointed at.** Its second sentence — *"Pure functions and dependency injection make logic testable without infrastructure"* — is a **placement** rule living in a quality document, and it is what quietly assigned proof to pure functions and left hooks unowned. It moves to the new document or is re-scoped to design; leaving it creates two owners for one fact on the day this ADR claims to give it one.
- **§8's first sentence will be raised against Decision 7's component lane**, because *the position is asked for once* looks like an assertion about implementation. It is not: how many times a capability asks a server is observable **at its boundary**, by the gateway, and is therefore behaviour. Stated here so the new lane's charter is not arguable from its first day.
- **[Engineering Execution Standard §9](../../development/engineering-execution-standard.md)'s Definition of Done gains a qualifier.** *"New behavior covered by tests"* is unqualified today, which is why no Work Item violated a rule. Coverage must name the lane the topology assigns.
- **[§11](../../development/engineering-execution-standard.md) gains a Stop Rule.** *No lane fits* joins the routing table. It is the only mechanism that catches an **unknown** gap; a check and a Definition of Done catch known violations only.
- **The [Documentation Strategy](../documentation-strategy.md) gains a row in §5 and §6, and [`docs/README.md`](../../README.md) gains a map entry**, without which the fact this ADR assigns an owner remains unfindable (§11.6).
- **The check that would hold Decision 5 does not land with this ADR.** Four story files import a capability's gateway today, so a check written now would need an exemption list — which the [capability structure plan](../../plans/historical/frontend-capability-structure.md)'s fifth ordering invariant forbids. The rule is recorded here; enforcement follows the cleanup.
- **The [Frontend Capability Structure plan](../../plans/historical/frontend-capability-structure.md)'s question D is retired rather than answered.** It asks whether a screen's signature may name a gateway; Decisions 5 and 6 establish that no production signature should carry one, so the question's premise does not survive. Its row is marked retired by this ADR, with the correction made by the Work Item that next touches the plan.
- **This is a decision, not a migration.** No test moves, no signature changes and no lane is built because of this ADR. What each of those costs is a Work Item's to measure and declare.

Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
