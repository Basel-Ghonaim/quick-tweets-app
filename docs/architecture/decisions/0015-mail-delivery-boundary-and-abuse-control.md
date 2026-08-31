# ADR 0015: Mail Delivery — Real Transport, Production Posture, and Owned Abuse Control

> **Status:** Accepted
> **Date:** 2026-08-31
> **Deciders:** Basel Ghonaim

## Context

An outbound mail mechanism exists in code, and [`backend/mail.md`](../../backend/mail.md) — created alongside this record — describes it and the extent of what it can do. **Neither of its backends delivers.**

The consequence is that Channel Verification is complete as a capability and unusable as a feature: a holder can be issued a code that nothing can carry to them. [ADR 0009](0009-channel-verification-platform-capability.md) Decision 7 anticipated this exactly — it fixed the ownership direction, declared delivery's design out of its own scope, and deferred it to "when the first proof act is implemented." That is now.

**The need is grounded in decisions already taken, not in a consumer list assembled for the occasion.** ADR 0009 Decision 7 is itself such a decision, and **account recovery** is committed product scope ([overview](../../project/overview.md)) — a capability that cannot exist without a way to reach a person who has lost access.

Most of what a real transport involves has a natural owner in `mail.md`, and [ADR 0002](0002-refined-adr-threshold.md) forbids an ADR for a decision a document owns. **One thing has no other home:** giving delivery a durable security control of its own gives it persisted state, which changes what "composed, not owned" means in Decision 7. That must survive independently of whichever provider is eventually wired in — ADR 0002 criterion 2, the ground ADR 0009 stood on for itself.

## Decision

**1. Transport is provider-neutral SMTP.** Not a provider SDK. A provider is then a host and a credential rather than a dependency, and development and production run **one code path** differing only in configuration. A local SMTP catcher is a host under this rule, not a third backend.

**2. Real delivery is required in development, not only in production.** A developer must be able to reach a real inbox, with a local catcher remaining available for local testing. This is a deliberate cost: development traffic consumes real spend and real sender reputation, which is why Decision 4's ceiling binds every environment rather than production alone.

**3. Production refuses a mode that cannot deliver.** Stated positively — the requirement is delivery capability, so a future non-delivering backend is refused by construction rather than by remembering to extend a list. Outside production the existing fail-safe stands unchanged.

This narrows a trade currently recorded in the code, and the reason it may be narrowed **here and not elsewhere** is precise. The project has two fail-soft mode resolvers, not one: media reclamation resolves an unrecognised value to `report`, and mail resolves one to `inert`. They are not equivalent. **`report` does nothing and says it did nothing; `inert` does nothing and reports success.** A fail-safe default is safe only while it does not manufacture a false claim — and the moment a backend can deliver, a misconfigured deployment would send nothing while telling every caller it had. That asymmetry justifies changing one resolver and leaving the other untouched.

Enforcement belongs to the mail mode resolver, which already owns the production distinction and already refuses the capture backend there; the new rule is that refusal's twin, and keeping them together means the whole production posture reads in one place.

**4. Delivery owns durable abuse control — two controls, keyed on what it can actually see.**

- a **per-recipient cap**, keyed on the address already present in every message; and
- a **global outbound ceiling**, keyed on nothing at all — the mechanism's own total volume.

Two controls because the threat has two halves. A recipient key answers **inbox bombing**. It cannot answer **spend and sender reputation**, which are measured against the sender: one origin spraying many addresses passes a per-recipient cap entirely.

**The ceiling is a circuit breaker, not a silent cap** — operator-visible, alarmed, and provisioned with headroom, and its trip is reported as a definite refusal, distinguishable from a transport failure.

**Its trade is stated rather than discovered:** a ceiling is shared-fate. One runaway consumer trips it and *all* mail stops, account recovery included. Headroom and alarming are what make that acceptable; a silent ceiling would not be.

**5. The cap keeps independent durable state**, never derived from a consumer's rows. Channel Verification's challenges are pruned on a retention setting; deriving a security control from them would let lowering retention silently weaken it. Independent state carries its own pruning obligation.

**6. The cap is not partitioned by purpose.** A per-purpose partition is a **per-case configuration surface**, which [Engineering Principles §3](../../development/engineering-principles.md) names among the generalization machinery to be built only "when a second instance exists to shape it." One consumer exists.

The residual is stated rather than hidden: with a single shared cap, a high-volume consumer can exhaust a quota a lower-volume one needs for the same address. **The second consumer is what earns the partition**, and nothing about deferring it defers the mechanism.

**7. A per-actor cap belongs to each consumer that has an actor, never to Delivery.** Delivery has no actor concept — a message is a recipient, a subject and a body — and acquiring one would import the vocabulary its boundary exists to exclude. Channel Verification's per-address cooldown is the precedent for a consumer holding such a control.

**Account recovery is unauthenticated and has no actor to key on at all**, which is precisely why the recipient cap must live in Delivery rather than be pushed down to consumers.

This is not gating policy. ADR 0009 Decision 3 reserves "policy" for *whether an action requires a proven channel*; an abuse control is a different thing, and the capability already owns one.

**8. Delivery moves to a module.** Once it owns a table, a migration and a repository it belongs where owned state lives. **No module under `shared/` owns a model**, while the two platform capabilities that do — Media and Channel Verification — are both modules. The criterion is schema ownership, not statelessness: `shared/` is not stateless, since the scheduler holds a dedicated connection and identity queries the database.

**9. A send reports three outcomes, not two — accepted, refused, unknown.** A timeout is **ignorance rather than failure**: the relay may already have accepted the message. Folding it into failure makes the mechanism assert something it cannot know, and a discriminated result is the project's stated preference for exactly this ([Engineering Principles §6](../../development/engineering-principles.md)).

**The third state does not exist so a consumer can undo committed work.** Channel Verification stamps its cooldown inside the transaction that persists the challenge, before any send; reversing it would require a compensating write that is both racy and a bypass — anyone able to induce a timeout could clear their own cooldown, which is the route back to the harm Decision 4 exists to prevent. It exists so the report is **truthful and the failure observable**.

The wire field reporting this today asserts *delivery*, which no backend can promise: it is redefined to state what is known, co-versioned with the implementation.

## What this ADR does not decide

Deliberately deferred, each to a named home:

- **The provider, its host and credentials, and how they are provisioned per environment** — configuration, and an operational question sharpened by Decision 2.
- **The cap's limits, the ceiling's headroom, and where its alarm goes** — operational tunables, which this project keeps in the environment schema with defaults.
- **Retries, queueing, and bounce, complaint or suppression handling** — none exist, and none are required to send.
- **Message content, templating and language** — the composing consumer's, not the mechanism's.
- **Multi-channel machinery** — no second channel exists.
- **Gating policy** — the consumer's, per ADR 0009 Decision 3.

## Alternatives considered

- **A provider SDK.** *Rejected:* vendor lock-in and a dependency carrying features nothing needs, where SMTP keeps development and production on one path.
- **Leaving the fail-safe untouched.** *Rejected:* once a backend delivers, it manufactures a false claim — a misconfigured production sends nothing and reports success, with a single startup warning as the only signal.
- **A per-recipient cap alone.** *Rejected as incomplete:* it protects the victim and leaves spend and reputation unbounded.
- **Partitioning the cap by purpose now.** *Deferred:* a configuration surface shaped by a single case is the machinery Engineering Principles §3 defers.
- **An actor cap inside Delivery.** *Rejected:* it requires a concept the port does not have, and the consumer that most needs protecting has no actor.
- **Keeping delivery under `shared/`.** *Rejected:* it would make `shared/` the first location owning a model, erasing the only distinction separating it from `modules/`.
- **A binary result with documented semantics.** *Rejected:* the shape would stay while the meaning changed, which is the failure that makes a contract untrustworthy.

## Consequences

- **[`backend/mail.md`](../../backend/mail.md) owns the mechanism** and is co-versioned by the implementation; this ADR keeps only the boundary and rationale.
- **[Backend Security](../../backend/security.md) claims rate limiting** and must cede the outbound cap to `mail.md` **by name** — the same cession it already makes for Media's read-side posture.
- **The [API contract](../../api/api-contract.md) is co-versioned** when the reported outcome changes ([Documentation Strategy §10](../documentation-strategy.md)).
- **Development gains real sending credentials and real reputation exposure.** That is configuration and secrets handling, not a boundary — decided outside this record, but before credentials are issued.
- **The cap's independent state carries its own pruning**, a second scheduled concern beside the challenge sweep.
- **[ADR 0009](0009-channel-verification-platform-capability.md) is unchanged.** Nothing here reopens it: Decision 7 constrained ownership direction, and owning durable state is not the absorption it forbade.
- Status moves from `Proposed` to `Accepted` **on merge**; its lifecycle thereafter is the [Documentation Strategy](../documentation-strategy.md)'s.
