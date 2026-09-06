# Password Reset Subsystem

> **Status:** Active.
> **Authority:** The authoritative source for the **Password Reset subsystem's mechanisms and their rationale** — the module anatomy and why it publishes nothing, custody of the credential, the request/confirm/apply lifecycle, how neutrality is achieved and where it is only mitigated, the code and its digest, the single-failure discipline, session revocation, the sweep, and the concurrency invariants. It owns the *how* and the *why*.
> It does **not** own: the boundary **decision** itself — recorded in [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md), which this document implements per the Stable-Core rule ([ADR 0004](../architecture/decisions/0004-stable-core-platform-document-rule.md)); the wire contract (endpoints, payloads, status codes, error shapes — the [API contract](../api/api-contract.md)'s); the field-level schema ([`schema.prisma`](../../apps/api/prisma/schema.prisma)) or the relationship, cascade and indexing rationale (the [data model](../architecture/data-model.md)'s); the shared password hashing, session model and HTTP-edge rate limiting ([Backend Security](security.md)'s); the **outbound mail mechanism** it composes, which is [`mail.md`](mail.md)'s; or hand-verification, which belongs to the [verification harness](../development/verification/README.md).
> **Scope:** The server-side capability at `apps/api/src/modules/auth/password-reset/`. Frontend behaviour is not described here; no frontend consumes it yet.
> **Version:** 1.1
> **Last Updated:** 2026-09-06
> **Owner:** Basel Ghonaim

## Purpose & boundary

Password Reset answers one question — **whether the bearer of a code is currently authorized to set a new password for an account** — and it is the only thing that may answer it. Why that fact needs an owner, why the owner is not Channel Verification, and why it lives inside Auth rather than in a module of its own are [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md)'s; this document owns the mechanisms that implement them.

**It is not a platform capability, and the code says so by publishing nothing.** Media, Channel Verification and Mail Delivery each expose a barrel because something *else* reads their fact. Nothing reads recovery's: it is produced and spent inside one flow, so there is no surface to publish and no consumer to publish it to. The directory contains no `index.ts`, and no file outside `modules/auth/` imports from it.

The dependency direction is one-way and holds in the code: the capability imports Auth's own repository and hashing cost, shared database and configuration, and the mail mechanism's published surface — and **nothing from `modules/channel-verification/`**. That is asserted mechanically rather than reviewed: a guard test reads every production file in the directory and fails if any mentions channel verification, with its own assertion that it found files to scan, so a guard that silently scanned nothing would fail too.

## Module anatomy

Ten production files beside their tests, in one directory under Auth:

- **types** — the repository and service interfaces, the branded code type, and what `request` hands back.
- **errors** — three transport-agnostic codes; the boundary decides their statuses.
- **codes** — minting, format validation, and the digest. Copied from Channel Verification's construction rather than shared with it ([ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 4), and the two have since diverged: this module carries **no comparison**, for the reason given below.
- **repository** — the module's single data-access path, including the sweep's bulk delete.
- **service** — the lifecycle.
- **validator, controller, routes** — the HTTP boundary.
- **sweep job** — hygiene, registered at the composition root.

The directory exists because `modules/auth/` holds two independently-layered stacks and the repository's convention is one subject per directory level — the same reason `media/` subdivides while single-subject modules stay flat.

## The credential and its custody

**One table, no standing record.** Channel Verification keeps a standing account↔endpoint record with its challenges subordinate to it, because the fact it owns *outlives* any challenge. Recovery's fact does not: it exists to be spent. The credential is therefore the whole of the state, and the resend cooldown anchors on **the most recent row for the account** rather than on a separate per-user record.

**The lookup is by digest, not by subject.** `code_hash` is unique, and `confirm` and `apply` resolve the account *from* the row the code identifies — the reverse of Channel Verification's subject-first lookup. That follows from the flow: the screen that submits the code does not re-collect the email, so there is no subject to resolve first.

**What is stored is a SHA-256 digest, never the plaintext.** The code exists in process memory for one request and in whatever the mail mechanism did with the message; nothing else can recover it. Relationship, cascade and indexing rationale are the [data model](../architecture/data-model.md)'s; field-level truth is [`schema.prisma`](../../apps/api/prisma/schema.prisma)'s.

**Spent and expired are derived, never stored.** `usedAt IS NULL` together with `expiresAt` fully determines whether a credential is usable, so a lapsed one stops working with nobody having written anything — which is what makes the sweep hygiene rather than correctness.

## The lifecycle

### `request` — and the property the capability is shaped around

The endpoint answers **identically** in all three cases it can be in: the address belongs to no account, it belongs to an account eligible for a fresh code, or it belongs to an account still inside its resend cooldown. Same status, same body, same headers, byte for byte.

The third case is where this is hardest and where it differs from its sibling. Channel Verification answers a cooldown with a distinct `429` carrying `Retry-After`, which is safe **because that endpoint is authenticated** — the caller has already proved who they are. This one is anonymous, so a distinct cooldown answer would itself disclose that the address belongs to an account. The cooldown is therefore enforced **silently**: no code is minted, no message is sent, and the caller cannot tell.

Internally the three branches do different work, and that is fine — neutrality is a property of what the caller can observe, not of what the process does. What holds it:

- **The credential is persisted synchronously; the mail send is not awaited.** `request` returns an *uninvoked* thunk, present only when a code was actually minted. Nothing in this module calls it. The HTTP boundary hands it to `res.on("finish")`, so the send begins only after the last byte of the response has left. A branch with nothing to send registers no listener at all.
- **A response floor is applied uniformly**, measured from the start of the request, across every branch. It absorbs the credential write's own latency — a locked insert, materially faster than a network round trip, which is no longer in the timed path at all.
- **The response carries no delivery outcome of any kind.** Unlike Channel Verification's `delivery` field, reporting one here would be the leak.

**The residual is stated rather than hidden.** A request for a real address still does work an unknown one does not, so timing remains an imperfect oracle even with a constant body and a floor. The floor mitigates it; it does not close it. [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 6 names this as an implementation obligation rather than a boundary question, and this is how far it is currently discharged.

A send that fails is swallowed inside the thunk. There is nothing in it for a caller to learn — the response is long gone — and a fresh request supersedes a lost code.

### `confirm` — checks, consumes nothing, and binds

`confirm` reports whether a submitted code is currently usable and spends nothing: the same code confirms twice from one position. What it does change is the **position** — a usable code is bound to it, and that binding is the whole of the step derivation.

**A usable code with no position is refused**, identically to every other failure. A position is where a confirmed credential is held, so without one a success has nowhere to go.

### `apply` — re-validates, then consumes

`apply` takes **no code**. It reads the credential from the caller's position, which is what stops a client holding a password-change credential past the moment one is confirmed; a request carrying a code is refused rather than having it ignored, because a caller able to supply one silently would be a second source for a fact the position owns.

It hashes the new password **before opening any transaction**, mirroring registration's own reasoning: bcrypt at the configured cost must not hold a database connection open for its duration. It then, in one transaction, re-validates the credential the position holds, marks it used, writes the hash, and revokes every session.

The ordering has a consequence worth naming: a submission with an invalid code still pays for a hash. The per-route limiter in front of `apply` is sized accordingly — it is the tightest of the three.

**Single use is decided by the write, not the read.** The update that marks a credential used is conditional on it still being unused and reports how many rows matched; zero means another caller won the race, and the transaction raises **before** any password is written. Two callers racing on one code can never both succeed, and a lost race can never leave a changed password behind.

**Session revocation is unconditional on success**, in the same transaction ([ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 8). The flow returns the caller to Login and establishes no session of its own: the sessions being revoked may be the attacker's, and signing anyone in here would defeat the point.

## The position, and what carries it

Recovery is three steps, and where a reader stands is held here rather than by the client ([ADR 0017](../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)). A URL per step would make the position reader-editable, client-readable storage would hold a live credential, and component state does not survive a reload — so the position is a row, addressed by a key the browser keeps and JavaScript cannot read.

**A position is opened for every request alike.** One opened only for a real account would answer, by its presence, the question this capability is shaped around — so it is created before the account is looked up, on every branch, and the key is written to the response before the body is.

**It stores no step.** An absent challenge means the reader is still entering a code; a present one means they may set a password. The step is therefore correct with nobody having written it — the property the credential's own usability already has.

**Its lifetime is the credential's.** One clock: a position outliving what it authorizes would be a step a reader could reach and not leave.

**A second request supersedes the first, by deletion.** The old key stops working immediately rather than merely being overwritten in the browser, which keeps the position and the credential from disagreeing about which recovery is live.

**The address it carries is stored already masked.** The mask is produced where the address is held, so the unmasked value never reaches a response — and a stale key on a shared machine discloses a mask rather than an address.

## The code, and the single failure

The code's **format is caller-supplied** — alphabet and length arrive as a parameter, defaulted from this capability's own configuration, never from Channel Verification's. The module enforces only a sanity floor, rejecting a format that could not produce a meaningful code at all. A minted value carries a **branded type**, so an unvalidated string cannot reach a lookup by accident.

**There is deliberately no constant-time comparison**, and its absence is a design position rather than an omission. Channel Verification resolves a subject first and then compares one submitted secret against that record's stored digest, where a byte-by-byte timing difference could leak how close a guess was. This module looks up **by digest**: an attacker has already computed the exact digest their own guess produces, and SHA-256's avalanche property means an index hit or miss carries nothing about which plaintext bytes were close. The only bit the lookup can reveal is *usable or not*, which the opaque failure discloses by design.

**Every unusable code collapses into one outcome, and it collapses inside the module.** Never issued, expired, already spent, malformed, and simply wrong all raise the same error; the distinguishing detail stays where it was raised. The boundary has a single branch translating it, so there is no second mapping for a carve-out to be added to later. Why the shape of the submitted code is checked *inside* rather than at the validator — and why a malformed value must not answer differently from a wrong one — is the [API contract](../api/api-contract.md)'s to explain on the wire.

A **configuration** fault is excluded from that collapse on purpose. An unusable code format raises its own error, is not translated at the boundary, and surfaces as an unhandled server error — the correct visibility for an operator fault, and the reason a misconfigured deployment is never diagnosed as a holder mistyping.

## Delivery

The message reaches its holder through the shared outbound mail mechanism, which this capability **composes and does not own**. The port, its backends, how one is selected, and why failure is returned rather than raised are [`mail.md`](mail.md)'s.

What belongs here is only what this capability does with it. It **composes the message** — subject and body are its own — and it composes the adapter with the **reserved recipient limit** rather than the general one. That reservation is the whole reason the reserve exists: recovery is the consumer [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md) Decision 6 named, and the limit is passed explicitly at the one call site entitled to it rather than left to a default.

## The sweep

A scheduled job removes credentials whose retention window has passed, running on the existing background scheduler as a single registration and reaching the database through the module's repository — no second data-access path.

**It is hygiene, not correctness.** Usable is derived, so an expired credential is refused whether or not anything removed it; disabling the job changes no answer the system gives, only how long the diagnostic trail survives.

**That relaxed posture is earned by one guarantee, and it is enforced elsewhere: retention can never fall below the resend cooldown.** Because this capability's cooldown reads the table's *own most recent row*, a sweep that outran the cooldown would delete a row the next request still needs to see, and a resend arriving in that gap would misread as a first-ever request — the cooldown silently defeated by an unrelated setting. The environment schema refuses that configuration at startup rather than clamping it, which is why the job itself never has to defend against it. Channel Verification needs no equivalent guard, because its cooldown lives on a standing record the sweep never touches.

Positions are bounded by their own expiry rather than by retention: one holds no secret worth keeping for a diagnostic trail, and a lapsed one already answers nothing.

## Concurrency

**A user's requests are serialised by a Postgres advisory lock keyed on the account id**, under this module's own namespace — distinct from the mail mechanism's recipient lock and the scheduler's job lock. The lock is taken **before** the cooldown is read: read around it and the cooldown would be advisory, and two simultaneous requests would both pass it and mint two codes.

Every repository method accepts an optional client, so the service composes multi-step writes atomically without the repository knowing anything about transactions.

## Operational expectations

**Configuration is this capability's own** ([ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 9): the credential's lifetime, the resend cooldown, the code's alphabet and length, and the sweep's interval and retention. None of them reads from, defaults from, or falls back to any `CHANNEL_VERIFICATION_*` setting — a shared value would let one flow's operational retuning move the other's security properties with neither owner seeing it happen. The names, defaults and the retention guard live in the environment schema; the approved initial values and the reasoning behind each are ADR 0016's.

**Sending requires a delivering mail mode.** With the default non-delivering backend the flow works end to end and nothing reaches an inbox, which is correct for development and useless for verification — the code exists only as a digest, so nobody can recover it. Hand-verification therefore runs under the capture backend, and the [verification harness](../development/verification/README.md) owns that procedure: folder 11, scenarios `PWR-01…PWR-15`, and Checkpoint J.

**The abuse posture is layered, and the durable controls are not the limiters.** Three per-route per-IP limiters sit at the edge; beneath them are the per-account resend cooldown this capability enforces and the per-recipient cap with its reserved floor that Mail Delivery enforces. The limiters are in-memory and per-IP, so they cannot stop one address being targeted from rotating IPs — which is precisely why they are the outer layer rather than the control the posture rests on. The limiter figures are the [API contract](../api/api-contract.md)'s; the edge mechanism is [Backend Security](security.md)'s.

## Responsibility boundary

Password Reset owns **the credential and its lifecycle**, and is its sole authority — nothing else mints, spends or invalidates one. **Auth owns the password value**, its hashing cost and the session model; this capability calls into them and defines neither. **Delivery is a separate shared mechanism** it composes and must never absorb. **Channel Verification is untouched**: a password changing is not an endpoint changing, so no verification state is read or written, and requiring a proven address is refused as circular — it would lock out precisely the people recovery exists for.

---

> This document owns the Password Reset subsystem's mechanisms and their rationale. The boundary decision is [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md)'s, endpoints and error shapes are the [API contract](../api/api-contract.md)'s, field-level schema is [`schema.prisma`](../../apps/api/prisma/schema.prisma)'s, relationship, cascade and indexing rationale is the [data model](../architecture/data-model.md)'s, password hashing, sessions and HTTP-edge rate limiting are [Backend Security](security.md)'s, the outbound mail mechanism is [`mail.md`](mail.md)'s, and hand-verification is the [verification harness](../development/verification/README.md)'s — linked here, never duplicated.
