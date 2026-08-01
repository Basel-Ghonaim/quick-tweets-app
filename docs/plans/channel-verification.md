# Channel Verification — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-01
> **Parent Issue:** [#403](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/403)
> **Supersedes:** —

This plan sequences the implementation of the **Channel Verification** platform capability into eight independently reviewable Work Items. Its architecture is **closed** — recorded in [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) (Accepted), which owns the boundary, the single owned fact, custody, and the lifecycle, and which this plan never reopens.

It is a **strategy document**: it owns the effort's **execution order, boundaries, invariants, and the rationale for that order**. Each Work Item's granular acceptance criteria, live status, and progress belong to its Issue (created when that Work Item begins), which this plan links and never mirrors — per [Documentation Strategy §5](../architecture/documentation-strategy.md) and [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

**Why the sequence is justified, not just listed.** Each Work Item below states **why it precedes the next**, **which architectural boundary or assumption it validates**, and **which invariant it protects**. That is deliberate: the ADR explains *why the capability exists*; this plan must explain *why it is built in this order*, so the sequence can be executed without rediscovering the design.

## 1. Purpose & goals

- Deliver the capability that owns **proof of control over a communication channel endpoint**, with **email as the first and only implemented channel**.
- Prove the **custody model** end-to-end: the fact lives wholly inside the capability, **nothing about verification is stored on the User row**, and consumers read a **boundary-resolved projection**.
- Establish the **delivery boundary** — an outbound-delivery mechanism the capability *composes* and never owns — as the codebase's first, built so later consumers (password reset, notifications) compose the same mechanism.
- Keep the capability **policy-free and decoupled from registration**: an account is created and authenticated with its endpoint **Unproven**, and the holder operates untrusted until some future consumer requires trust.

## 2. Boundary declaration

**Covers:** the capability module (its record, challenge, service, published surface, HTTP surface), the delivery port and an inert adapter, the schema and its additive migration, the challenge-expiry sweep job, the self-view projection, and the API-contract and manual-verification documentation.

**Does not cover (out of scope; unchanged):** any **gating policy** (no feature requires verification); a **real mail provider** (no SMTP, no provider SDK, no credentials); **multi-channel machinery** (no channel registry, strategy layer, or phone support); **staleness/re-verification policy**; **frontend UI** of any kind; bounce/suppression/deliverability handling; mail templating sophistication and i18n of mail content; and admin/revocation surfaces.

## 3. Pinned constraints (binding on every Work Item)

### 3.1 Architectural invariants

Each Work Item cites the invariants it protects by identifier. Most are mechanically verifiable.

- **I1 — No verification state on `User`.** The `users` table gains **zero** verification columns. *(grep-verifiable)*
- **I2 — Sole authority.** Only this capability transitions a fact into or out of **Proven**.
- **I3 — Policy-free.** The capability contains no gating logic; whether an action requires proof is always the consumer's decision.
- **I4 — Caller-supplied subject.** The endpoint value enters only as a parameter. The capability **never reads from, nor foreign-keys to, the mutable `users.email`**. *(grep-verifiable)*
- **I5 — Delivery behind the port.** No transport or provider code inside the capability; delivery is an injected port. *(grep-verifiable)*
- **I6 — Registration independence.** Account creation never depends on this capability and can never fail on delivery.
- **I7 — Dependency direction.** The capability **imports no feature module**; features consume it **only** through its published barrel. *(grep-verifiable)*
- **I8 — Derived status.** Verification status is **resolved at read time**, never stored as a denormalized flag.

### 3.2 Settled design decisions

Behavioural decisions taken during analysis and binding on implementation:

- **D1 — One active challenge per subject.** At most one open challenge per `(account, endpoint)` record, enforced in the service **and** by a partial unique index on the record `WHERE` the challenge is not closed. Multiple live secrets widen the attack surface (materially so for a short code) for no user benefit.
- **D2 — Resend rotates.** A resend **closes the previous challenge and creates a new one**; the old secret never works again. This rotates a possibly-exposed secret and matches the user's expectation that the newest message is the one that works. The **resend cooldown is anchored on the record, not the challenge**, so it survives rotation (otherwise each new challenge resets the throttle).
- **D3 — Success closes, it does not delete.** A verified challenge is marked closed and **retained for a bounded window**, then removed by the sweep job. Immediate deletion would make a replayed token indistinguishable from one that never existed, forfeiting replay detection. **The proof outlives the challenge** — this is why the challenge is subordinate, not the centre.
- **D4 — Status is derived, never stored.** Resolution order: a proof matching the **current** endpoint → **Proven**; else an open, unexpired challenge → **Pending**; else **Unproven**. A stored status column would drift the moment a challenge expired with no writer present. Consequence: **expiry requires no write to be correct** — the sweep job is hygiene, not correctness, and may lag or fail without producing a wrong answer.
- **D5 — Replay protection.** A challenge is single-use. Closed, expired, superseded, wrong-value, and never-existed all return the **same opaque failure** (no distinction leaked, mirroring the generic `401` in login and Media's opaque attach errors); the distinction is retained **internally** for diagnostics only. Secret comparison is constant-time; **confirm is rate-limited** as well as issue. **Idempotent replay of a successful challenge is deliberately deferred** — revisit if a link affordance is adopted or real double-submit friction is observed.
- **D6 — Active is the absence of `closedAt`.** No separate challenge state column: `closedAt IS NULL` plus `expiresAt` fully determines open / expired / closed, and makes the D1 index trivially expressible. A `closedReason` may exist for **diagnostics only** and must **never** be branched on for an authorization decision — `closedAt` remains the single source of truth for state. (This is I8 applied to the challenge.)

### 3.3 Recommendations pending ratification

Proposed with rationale; **ratified when this plan is approved** (they are not decided unilaterally):

- **D7 — Hash the challenge secret at rest** (digest + constant-time comparison). An emailed secret is more exposed than an `HttpOnly` cookie. Note this **sets a precedent**: nothing in the codebase is hashed at rest today (refresh tokens are stored raw), and Auth may later adopt it.
- **D8 — Code affordance, not a link.** A code is channel-portable (a future phone channel cannot use a link) and is not consumed by email scanners or link prefetchers, which silently burn link-based challenges. D1 and D5 are tuned for a code (hence rate-limited confirm).
- **D9 — No separate mailer ADR yet.** The port is small and its first adapter is inert; an ADR is warranted when a real provider and its operational concerns land.

## 4. Strategy & sequencing

**Order:** **1 → 2 → 3 → 4 → 5 → 6**, with **7** and **8** following (7 may run in parallel once 2 lands).

```
1 (delivery port + inert adapter)  ─┐
                                    ├─▶ 4 (service: issue/confirm) ─▶ 5 (HTTP) ─▶ 6 (published surface + projection)
2 (schema + migration) ─▶ 3 (types + repository) ─┘
2 ─▶ 7 (expiry sweep job)
6 ─▶ 8 (docs + verification harness)
```

- **1 → 4** *(hard)*: `issue` cannot complete without something to deliver through. The port is also the **cheapest possible proof of the delivery boundary** — it lands before any schema is committed to.
- **2 → 3 → 4** *(hard)*: the repository needs the tables; the service needs the repository.
- **4 → 5** *(hard)*: the HTTP surface is a thin translation of an already-tested service.
- **5 → 6** *(sequencing)*: the projection is most meaningful once the fact can actually be produced end-to-end.
- **2 → 7** *(hard)*: the sweep needs the tables, but nothing else — so it can land any time after 2.
- **6 → 8** *(hard)*: the harness verifies behaviour that must already exist.

**Why this order and not another.** The riskiest *architectural* claims are validated earliest and most cheaply: the **delivery boundary** in WI-1 (~30 lines, no schema), and the **custody model** in WI-6. The riskiest *implementation* surface — the challenge lifecycle — is unit-tested in WI-4 before any HTTP exists, because the real CI gate is `typecheck` + unit tests. Documentation and the manual harness come last because they must describe behaviour that is already true.

## 5. Execution structure

Each Work Item is a separate, atomic unit with its own Issue and PR, and each leaves `main` green under the real CI gate (`typecheck` + unit tests; integration tests are a local gate).

### WI-1 — Delivery port + inert adapter + config gate
- **Goal & rationale:** establish the boundary between this capability and the future delivery/mailer platform, with a working but inert adapter. **It comes first** because `issue` is blocked without it, and because it is the cheapest possible validation of the effort's least-certain boundary — proving the seam before any schema exists to constrain it.
- **Scope:** the delivery **port type** (recipient + payload; domain-ignorant, in the shape of Media's `StorageAdapter`), an inert log/no-op adapter, and a config gate defaulting to inert (the ratified fail-safe pattern of `MEDIA_RECLAMATION_MODE`, whose real behaviour requires an exact opt-in value); `.env.example` documented.
- **Non-goals:** no provider, no SMTP, no templating engine, no queue, no retry policy, no bounce handling.
- **Dependencies:** none (first).
- **Boundary validated:** that delivery can be composed as a domain-ignorant port — and that the first slice needs **no credentials and no change to the test environment**.
- **Invariants protected:** **I5**.
- **Verification:** unit tests over the inert adapter; the config gate resolves to inert for any missing/unexpected value.
- **DoD:** the port type and inert adapter exist and are injectable; the capability-facing contract is minimal; typecheck + unit green; no credentials required anywhere.
- **Commit/PR boundary:** one PR (port + adapter + config + `.env.example`).
- **Stop-risks:** if the port cannot stay domain-ignorant without knowing verification specifics → **stop**; that would mean the boundary is drawn wrong.

### WI-2 — Schema + migration
- **Goal & rationale:** persist the standing record and its subordinate challenge. **It precedes WI-3** because the repository is data access over these tables. Concrete model/table identifiers are **proposed here** (the ADR defers them), channel-neutral per the ADR's naming discipline.
- **Scope:** the standing `(account, endpoint)` record (status-bearing, inward account FK with cascade, the record-anchored resend anchor per **D2**) and the challenge (secret, `expiresAt`, `closedAt`, diagnostic `closedReason`); a hand-authored `migration.sql` in a timestamped directory with the house prose header stating the **safety class** (additive; no change to existing tables; no backfill); the **partial unique index** implementing **D1**; and an **index on the expiry column** (a gap the `refresh_tokens` precedent left).
- **Non-goals:** no change to `users`; no backfill; no repository or service code.
- **Dependencies:** none.
- **Boundary validated:** that the fact can be persisted **entirely inside the capability** with only an inward account reference — the custody model at the schema level.
- **Invariants protected:** **I1**, **I4**, **I6** (nothing is added to registration's path), **I8** (no stored status column — **D6**).
- **Verification:** `db:generate` + `typecheck`; the migration applies cleanly to a populated database; the partial unique index rejects a second open challenge.
- **DoD:** schema and migration land; `users` is untouched; no status column exists; typecheck green.
- **Commit/PR boundary:** one PR (schema + migration).
- **Stop-risks:** if the partial unique index cannot express **D1** → **stop** and re-decide the enforcement mechanism before building on it.

### WI-3 — Types + repository
- **Goal & rationale:** the internal data-access contract. **It precedes WI-4** because the service depends on a repository *interface*, never on Prisma — the project's standing layering rule.
- **Scope:** the module's types (DTOs, the internal repository interface, a branded challenge-token type with mint + validate-before-lookup in the shape of Media's token module) and the repository implementation with the `db = prisma` default parameter; every method accepting an optional transaction client.
- **Non-goals:** no business rules; no HTTP; nothing exported from the module barrel yet.
- **Dependencies:** **WI-2** (hard).
- **Boundary validated:** that all persistence detail stays internal — the repository is never published.
- **Invariants protected:** **I7** (internals stay unexported), **I4** (the endpoint is a parameter, never a join to `users`).
- **Verification:** typecheck; the repository compiles against the generated client.
- **DoD:** types and repository exist behind an interface; nothing is exported from the barrel; typecheck green.
- **Commit/PR boundary:** one PR. *(May be combined with WI-4 if landing a compiles-but-unused unit is undesirable — the boundary is a review-ergonomics choice, not an architectural one.)*
- **Stop-risks:** none material.

### WI-4 — Verification service (issue / confirm)
- **Goal & rationale:** the capability's core — the challenge lifecycle and the status resolution. **It precedes WI-5** because the HTTP layer must be a thin translation of already-tested rules, and because unit tests are the **real CI gate**, so the risk concentrates here.
- **Scope:** `issue` (close any open challenge per **D1/D2**, mint, persist, hand off to the delivery port, honour the record-anchored cooldown) and `confirm` (validate, constant-time compare, expiry and closure checks, close on success, record the proof); **derived** status resolution per **D4**; transport-agnostic errors the consumer translates; the service factory with all dependencies injected (repository, delivery port, transaction runner, clock).
- **Non-goals:** no HTTP; no gating policy; no published barrel yet; no idempotent replay (**D5**).
- **Dependencies:** **WI-1** and **WI-3** (both hard).
- **Boundary validated:** the whole lifecycle — including that **status is derivable without a stored flag**, and that **delivery is reachable only through the injected port**.
- **Invariants protected:** **I2**, **I3**, **I5**, **I8**.
- **Verification:** unit tests over plain-object fakes and an injected clock: issue → confirm succeeds; a second open challenge is refused; resend closes the prior and the old secret fails; expired, closed, superseded, and wrong-value confirms all fail **identically**; status derives correctly in all three states; a changed endpoint resolves Unproven **with no write**.
- **DoD:** the lifecycle is complete and unit-covered; no status is persisted; delivery is only ever called through the port; typecheck + unit green.
- **Commit/PR boundary:** one PR (service + tests).
- **Stop-risks:** if derived status cannot answer correctly without a stored flag → **stop**; that would contradict **I8/D4** and require re-deciding the persistence strategy.

### WI-5 — HTTP surface
- **Goal & rationale:** make the capability reachable by its first consumer — the account holder. **It precedes WI-6** because the projection is only meaningful once the fact can be produced end-to-end.
- **Scope:** validator, controller, routes (authenticated), the `app.ts` mount, and **per-route rate limiting on both issue and confirm** (confirm is brute-forceable under **D8**).
- **Non-goals:** no gating; no admin or revocation endpoints; no frontend.
- **Dependencies:** **WI-4** (hard).
- **Boundary validated:** that the capability's own surface — not a feature's — owns issue/confirm, and that the account holder is its intrinsic first consumer.
- **Invariants protected:** **I3**, **I6**.
- **Verification:** integration tests (TAG-scoped, reachability-gated) covering issue → confirm end-to-end and the failure paths; opaque failures confirmed at the HTTP boundary.
- **DoD:** the endpoints are live and authenticated; both are rate-limited; registration is untouched; typecheck + unit green, integration green locally.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if abuse control proves insufficient once a real provider is contemplated → record a finding; the durable per-address cooldown (**D2**) is the intended control, the limiter only an outer layer.

### WI-6 — Published surface + self-view projection
- **Goal & rationale:** the **custody proof** — a consumer reading a fact it does not own. **It is the effort's architectural climax**: everything before it produces the fact; this proves the ownership model works from the outside.
- **Scope:** the module barrel publishing **only the status/query surface** (interface + factory + default singleton, each method taking an optional transaction client — the Media triple), batch-first with a singular form delegating to it; and the User self-view consuming it as a projection. **Commands stay unpublished** — Media publishes no ingest either, and there is no in-process consumer of issue/confirm yet; they join the barrel when one appears.
- **Non-goals:** no publishing of issue/confirm; no public exposure of another user's status; no gating.
- **Dependencies:** **WI-5** (sequencing).
- **Boundary validated:** **custody** — that the User surface can present verified state while storing none of it, and that the capability never reads `users.email`.
- **Invariants protected:** **I1**, **I4**, **I7**.
- **Verification:** integration test proving the self-view reflects the status with **zero verification columns on `users`**; changing the email flips the projection to Unproven **with no write to the capability**; a grep check that no feature reaches past the barrel.
- **DoD:** the barrel is narrow and documented; the self-view projects status; the custody invariants hold and are demonstrated by test; typecheck + unit green.
- **Commit/PR boundary:** one PR (barrel + surface + self-view integration).
- **Stop-risks:** if the projection cannot be resolved without denormalizing onto `users` → **stop**; that would invalidate the ADR's custody decision and require a superseding ADR.

### WI-7 — Challenge expiry sweep job
- **Goal & rationale:** hygiene for closed and expired challenges. It is **deliberately late and low-risk** because **D4** makes it non-load-bearing: correctness never depends on it. It needs only the tables, so it may run in parallel after WI-2.
- **Scope:** a job definition cloned from the existing refresh-token cleanup job (bulk delete of closed/expired rows past the retention window per **D3**), registered on the existing scheduler; interval and retention as configuration.
- **Non-goals:** no new scheduler substrate (it already exists, with Postgres advisory-lock single-run safety); no reclamation semantics.
- **Dependencies:** **WI-2** (hard).
- **Boundary validated:** that the existing background-execution substrate hosts this job **unchanged** — one registration line.
- **Invariants protected:** **I8** (the sweep removes rows; it never writes a status).
- **Verification:** unit test with a stubbed repository and injected clock; the job is registered at composition.
- **DoD:** the job runs on the existing scheduler; disabling it changes no answer the system gives; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if the substrate needs modification to host it → **stop and reassess**; that would contradict the assumption that it is generic.

### WI-8 — Documentation + manual verification harness
- **Goal & rationale:** co-version the contract and make the capability **hand-verifiable against a running system**. **It comes last** because it must describe behaviour that already exists.
- **Scope:** the API contract entries (issue/confirm, the self-view projection field, the opaque failure shape); and the harness — a new Postman folder, a scenarios-catalogue section with stable IDs, a new lettered runbook **DB checkpoint**, a workflow-phase row, and a README paragraph. The harness is **self-isolated** (mints its own user with a per-run unique identity) and non-destructive, per the folder-09 precedent.
- **Non-goals:** no behaviour change; no new endpoints.
- **Dependencies:** **WI-6** (hard).
- **Boundary validated:** that every guarantee is observable from outside — API-observable behaviour via the collection, and the custody invariant (**no verification data on `users`**) via the DB checkpoint.
- **Invariants protected:** **I1** (checkpoint-verified), **I8** (status derives correctly after expiry with no writer).
- **Verification:** the harness is executed against a running system; every scenario and checkpoint passes.
- **DoD:** the API contract is co-versioned; the harness folder, scenarios, checkpoint, workflow row, and README paragraph all land; a full manual pass is green.
- **Commit/PR boundary:** one PR (docs + harness).
- **Stop-risks:** if a scenario cannot be expressed without exposing internals → record a finding rather than widening the public surface.

## 6. Risks & mitigations (effort-wide)

- **The delivery port is designed from a single consumer** — the classic wrong-abstraction trap. Mitigation: keep it minimal (recipient + payload); no templating, queueing, or retry policy until a second consumer exists.
- **Abuse control on issuance.** The existing limiters are **per-IP and in-memory**, so they do not stop an IP-rotating attacker mail-bombing one address. Mitigation: the **record-anchored cooldown (D2)** is the durable control; the limiter is only the cheap outer layer. This matters little while delivery is inert and becomes load-bearing the moment a real provider lands.
- **The lazy-comparison contract.** A caller passing a *stale* endpoint value receives a stale answer. Mitigation: the User self-view is the authoritative caller; the contract is stated on the published method.
- **Hashing at rest sets a precedent (D7)** that Auth does not yet follow. Mitigation: scope it to this capability; do not retrofit Auth in this effort.
- **Integration tests are not in CI.** The real gate is typecheck + unit, so custody and lifecycle proofs must also exist as unit tests where possible, and the integration suite must be run locally before each PR.
- **No out-of-scope creep** — gating, real providers, multi-channel, and frontend stay out; discoveries are recorded, not absorbed.

## 7. Completion criteria (whole effort)

- All eight Work Items merged to `main`, each green (typecheck + unit; integration verified locally), each leaving a coherent state.
- An authenticated holder can request verification of their own email and confirm it; the endpoint becomes **Proven**; the self-view reflects it **as a projection**.
- **All eight invariants hold**, and the grep-verifiable ones (**I1**, **I4**, **I5**, **I7**) are demonstrably true.
- Changing the endpoint yields **Unproven with no write** to the capability; disabling the sweep job changes no answer.
- Delivery remains inert and credential-free; no gating policy exists anywhere.
- The API contract is co-versioned and the manual harness passes a full run.

## 8. Reconciliation

*Added as this plan approaches `Historical`: where each Work Item's durable facts landed in the permanent documents, which findings were recorded, and the forward links. The capability's platform document is created when its subsystem exists in code (the Stable-Core rule, [ADR 0004](../architecture/decisions/0004-stable-core-platform-document-rule.md)); on its creation, ADR 0009 retains only the boundary and rationale.*
