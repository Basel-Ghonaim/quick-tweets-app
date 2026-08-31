# Channel Verification Platform Subsystem

> **Status:** Active.
> **Authority:** The authoritative source for the **Channel Verification subsystem's mechanisms and their rationale** — the module anatomy and its published surface, where the subject comes from, custody of the fact, how status is derived, the challenge lifecycle, the code and its digest, the single-failure discipline, the sweep, and the concurrency invariants. It owns the *how* and the *why*.
> It does **not** own: the boundary **decision** itself — recorded in [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md), which this document implements per the Stable-Core rule ([ADR 0004](../architecture/decisions/0004-stable-core-platform-document-rule.md)); the wire contract (endpoints, payloads, status codes, error shapes — the [API contract](../api/api-contract.md)'s); the field-level schema ([`schema.prisma`](../../apps/api/prisma/schema.prisma)) or the relationship, cascade and indexing rationale (the [data model](../architecture/data-model.md)'s); the shared auth-guard and rate-limiting mechanisms (the [Backend Security](security.md)'s); the **outbound mail mechanism** it composes, which is [`mail.md`](mail.md)'s; or hand-verification, which belongs to the [verification harness](../development/verification/README.md).
> **Scope:** The server-side capability (`apps/api/src/modules/channel-verification/`). How a consumer decides what requires a proven endpoint is that consumer's, and is not decided here.
> **Version:** 1.1
> **Last Updated:** 2026-08-31
> **Owner:** Basel Ghonaim

## Purpose & boundary

Channel Verification is a **platform capability, not a business feature**. It answers one question — whether a given account controls a given channel endpoint — and nothing outside it writes that answer. **Email is the only implemented channel.** Precisely which fact it owns, why it alone owns it, and the lifecycle that fact moves through are the decision recorded in [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md); this document owns the mechanisms that implement it.

The **dependency rule** is one-directional and holds in the code: the capability imports shared platform code, middleware and configuration, and **no feature module**; features consume it **only** through its published barrel, never its routes, service, repository or internals. Two imports of its internals exist outside the module — the app mounts its routes, and the server registers its sweep job. Both are composition-root wiring, which is where a module is assembled, not a feature reaching past the barrier.

The capability is **policy-free**, and that is observable rather than asserted: it holds no gating logic, the single feature that consumes it reads status only in order to present it, and registration's path does not reach it at all — so account creation cannot fail on delivery. That this is by decision rather than by accident, and what it means for a holder whose address is not yet proven, is [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md)'s.

## Module anatomy & the published surface

The barrel publishes **only the query surface** — the status interface, its factory, a ready-made singleton for consumers that do not inject, and the two types a caller needs in order to speak about a subject. Everything else is internal: the repository, the service, the challenge code and its digest, the errors, the validator, the controller, the routes and the sweep job.

**The commands are deliberately unpublished.** `issue` and `confirm` have no in-process consumer — the capability drives them from its own HTTP surface — so publishing them would widen the surface ahead of a need. Media publishes no ingest for the same reason. They join the barrel when a consumer genuinely needs them, as a deliberate act rather than by having been reachable all along.

The capability owns its own HTTP routes rather than a feature owning them. A second consumer would otherwise have to route through the users module to reach a platform capability; Media sets the same precedent by owning its own ingest endpoint.

## The subject: supplied, never fetched

The capability is **handed** the endpoint it is asked about. Its service, status unit and repository contain no read of the accounts table and no foreign key to it: the endpoint is a parameter on every entry point.

Resolution happens one layer up, at the **HTTP boundary**. The controller takes a resolver as an injected parameter — defaulting to the shared identity helper that returns an account's current address by id — and passes the result inward. That placement is the point: the composition root knows where a subject comes from, and the capability stays ignorant of it, which is what lets a future consumer supply a different one. An account that has disappeared between authentication and resolution yields a not-found at the boundary; nothing is passed downstream in place of a subject.

The self-view consumer works the same way from the other side, handing over the address from the account row it has already loaded rather than making the capability fetch one.

## Custody: the record, the challenge, and the frozen value

The fact lives **wholly inside the capability**. Two tables hold it: a standing record, one per account-and-endpoint pair, carrying when control was proven and when a challenge was last issued; and a subordinate challenge table. **Nothing about verification is stored on the account row** — the accounts model carries a back-relation and no verification column of any kind.

The endpoint on the record is a **frozen provenance snapshot**, not a pointer to the account's live address. When the account's address changes the two diverge, and the code treats that divergence as the answer rather than as an inconsistency: no reconciliation job exists, nothing outside this capability writes the record, and the prior proof is left in place. Why divergence is the signal — and why a changed address is a change of subject rather than a revocation — is [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md)'s.

Field-level truth is [`schema.prisma`](../../apps/api/prisma/schema.prisma)'s; the relationship, cascade and indexing rationale is the [data model](../architecture/data-model.md)'s.

## Derived status

Status is **resolved on read and never stored**, in a fixed order: no record for that exact subject reads *unproven*; a record carrying a proof reads *proven*; otherwise an open challenge that has not passed its expiry reads *pending*; anything else reads *unproven*.

Nothing on that path writes. That is what lets an expired challenge read as expired **with nobody having touched it** — and it is why the sweep below is hygiene rather than correctness. A stored status column would drift the moment a challenge lapsed with no writer present.

The query surface is **batch-first**: the plural form answers for many subjects **in the order given**, in a fixed number of queries whatever the batch size, and asks about open challenges only for records that are not already proven. The singular form delegates to it.

Derivation lives on the status unit rather than on the service so that **what is published is a query and nothing else**. A status unit that wrapped the service would hand consumers a reference to the object holding `issue` and `confirm` — exactly the coupling a narrow barrel exists to prevent.

## The challenge lifecycle

**Issue** runs its persisted half in a single transaction: upsert the record, take a row lock on it, read the resend cooldown *under* that lock, close any open challenge as superseded, mint a code, persist its digest with an expiry, and stamp the record's last-challenged time. A resend therefore **rotates** — the previous secret stops working, so a message that may have been exposed cannot be used, and the newest message is the one that works. The cooldown is anchored **on the record, not the challenge**, so rotating a challenge cannot reset the throttle.

**Delivery happens after the commit.** A transport failure must not undo a persisted challenge, and no row lock is held across a network call. A refusal is reported rather than raised: the challenge stands and can be resent.

**Confirm** validates the submitted value's shape, finds the record, finds its open challenge, refuses anything past its expiry — a read, writing nothing — and compares in constant time. Only then does it open a transaction to close the challenge and record the proof.

A **wrong value leaves the challenge open**. Closing it on a failed attempt would let one mistyped character deny the holder their own verification.

Only two things close a challenge: **success, and supersession by a resend.** **Expiry closes nothing** — a lapsed challenge is simply one the read no longer accepts, and the sweep removes the row later. That is the same property as derived status, seen from the challenge's side: no writer has to run for a challenge to stop working.

## The code, and the single failure

The code's **format is caller-supplied** — its alphabet and length arrive as a parameter, defaulted from configuration. How strong a code must be is a product decision the module deliberately does not hold; it enforces only a sanity floor, rejecting a format that could not produce a meaningful code at all. The minted value carries a **branded type**, so an unvalidated string cannot reach a comparison by accident.

What is persisted is a **SHA-256 digest, never the plaintext**. A code that travels by mail is more exposed than a token held in an `HttpOnly` cookie, which is what earns hashing here — a precedent the rest of the codebase does not yet follow. SHA-256 rather than a password hash because the input is high-entropy generator output, not a human-chosen secret: there is nothing for a slow KDF to defend against, and a slow KDF on a rate-limited endpoint would make it a CPU amplifier. Comparison is constant-time, and a stored value of another shape is treated as a mismatch rather than an exception.

**Every failed confirmation collapses into one outcome, and it collapses inside the module.** Malformed, unknown subject, none open, expired, closed, superseded, already used, and simply wrong each raise the same single error; the distinguishing detail stays where it was raised and never travels outward. Placing the collapse at the point of failure rather than in a translation layer is what makes it hold — a boundary that mapped several distinct errors onto one response could later be given an exception for a helpful case, whereas here there is no second error to map. Why the wire answer is uniform is the [API contract](../api/api-contract.md)'s to explain.

A **configuration** fault is deliberately excluded from that collapse. An unusable code format raises its own distinct error, so a misconfigured deployment is never diagnosed as a holder mistyping their code; it is not translated at the boundary and surfaces as an unhandled server error, which is the correct visibility for an operator fault. The malformed-value error likewise never escapes: confirm catches it and re-raises the single opaque failure.

The statuses and messages these produce on the wire are the [API contract](../api/api-contract.md)'s.

## Delivery

A challenge reaches its holder through the shared outbound mail mechanism, which this capability **composes and does not own** — the ownership direction [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) Decision 7 fixed. The port, its backends, how one is selected, and why failure is returned rather than raised are [`mail.md`](mail.md)'s.

What belongs here is only what this capability does with it: it **composes the message** — subject and body are the capability's, not the mechanism's — and it **sends after the challenge is committed**, so a delivery failure is reported and never destructive.

## The sweep: hygiene, not correctness

A scheduled job removes challenges that were closed or expired before a retention cutoff, running on the existing background scheduler as a single registration.

It reaches the database **through the repository** — the module's one data-access path — and adds no query of its own. Because status is derived, **disabling it changes no answer the system gives**; it changes only how long the diagnostic trail survives. Correctness never waits on it, and it may lag or fail without producing a wrong answer.

It removes **challenges only**. The proof lives on the record and must outlive every challenge that produced it, and a record left moot by a changed address is evidence rather than garbage.

## Concurrency & transaction invariants

Every repository method accepts an **optional client**, so a caller may run it inside an interactive transaction; without one it uses the repository's own. That is what lets the service compose multi-step writes atomically without the repository knowing anything about transactions.

**The lock precedes the throttle read.** The record is locked with a row-level `FOR UPDATE` — raw SQL, since the ORM has no builder for it, with the id bound as a parameter — before the cooldown is read. Read *around* the lock the cooldown would be advisory, and two simultaneous requests would both pass it and send two messages. One row is locked per transaction, so there is no lock ordering to observe.

**The unique constraints stay authoritative** for any path that forgets the lock. A concurrent first-ever request can still lose the record's uniqueness, or lose the partial index that permits one open challenge per record; the service catches that conflict and retries once. The retry takes the lock the winner has since released and reads the throttle it set, so the loser receives a cooldown answer rather than a race error.

**Single use is decided by the write, not by the read.** Closing a challenge is conditional — it closes by id *only while that challenge is still open*, and reports how many rows matched. Zero means another caller verified it, or a resend superseded it, between the read and the write; the transaction then raises **before** the proof is recorded, so a lost race can never leave a proof behind. Retained rather than deleted, a closed challenge keeps a replay distinguishable from a value that never existed.

## Responsibility boundary

Channel Verification owns **the fact and its lifecycle**, and is its sole authority — nothing else may move an endpoint into or out of proven. **User owns the endpoint value**, live and mutable, and the capability never reads it. **Delivery is a separate shared mechanism** the capability composes and must never absorb. **Gating policy belongs to the consumer**: whether any action requires a proven endpoint is decided where that action lives, never here — which is why the capability can produce the fact without any feature yet consuming it.

---

> This document owns the Channel Verification subsystem's mechanisms and their rationale. The boundary decision is [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md)'s, endpoints and error shapes are the [API contract](../api/api-contract.md)'s, field-level schema is [`schema.prisma`](../../apps/api/prisma/schema.prisma)'s, relationship, cascade and indexing rationale is the [data model](../architecture/data-model.md)'s, shared auth guards and rate limiting are [Backend Security](security.md)'s, and hand-verification is the [verification harness](../development/verification/README.md)'s — linked here, never duplicated.
