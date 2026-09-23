# Channel Verification — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-02
> **Parent Issue:** [#403](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/403)
> **Supersedes:** —

**Implementation status: Complete** · **Engineering work: Complete** · **Closure status: Pending Human Gate** · **Human Postman Gate: Deferred — Not Run**

All ten Work Items are merged and every engineering criterion this plan set is met or explicitly retired — recorded criterion by criterion in [§8](#8-reconciliation). The plan stays `Active` for **one** reason: the human Postman gate is a completion criterion, it is deferred, and it has not been run. It is **not** marked passed, and an automated pass of folder 10 is not a substitute for it. When that gate is performed, the plan transitions to `Historical`; nothing else is outstanding.

This plan sequences the implementation of the **Channel Verification** platform capability into ten independently reviewable Work Items. Its architecture is **closed** — recorded in [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) (Accepted), which owns the boundary, the single owned fact, custody, and the lifecycle, and which this plan never reopens.

It is a **strategy document**: it owns the effort's **execution order, boundaries, invariants, and the rationale for that order**. Each Work Item's granular acceptance criteria, live status, and progress belong to its Issue (created when that Work Item begins), which this plan links and never mirrors — per [Documentation Strategy §5](../architecture/documentation-strategy.md) and [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

**Why the sequence is justified, not just listed.** Each Work Item below states **why it precedes the next**, **which architectural boundary or assumption it validates**, and **which invariant it protects**. That is deliberate: the ADR explains *why the capability exists*; this plan must explain *why it is built in this order*, so the sequence can be executed without rediscovering the design.

## 1. Purpose & goals

- Deliver the capability that owns **proof of control over a communication channel endpoint**, with **email as the first and only implemented channel**.
- Prove the **custody model** end-to-end: the fact lives wholly inside the capability, **nothing about verification is stored on the User row**, and consumers read a **boundary-resolved projection**.
- Establish the **delivery boundary** — an outbound-delivery mechanism the capability *composes* and never owns — as the codebase's first, built so later consumers (password reset) compose the same mechanism.
- Keep the capability **policy-free and decoupled from registration**: an account is created and authenticated with its endpoint **Unproven**, and the holder operates untrusted until some future consumer requires trust.

## 2. Boundary declaration

**Covers:** the capability module (its record, challenge, service, published surface, HTTP surface), the delivery port with an inert adapter **and a local capture backend**, the schema and its additive migration, the challenge-expiry sweep job, the self-view projection, the API-contract and manual-verification documentation, and the platform document that owns the subsystem.

**Does not cover (out of scope; unchanged):** any **gating policy** (no feature requires verification); a **real mail provider** (no SMTP, no provider SDK, no credentials — a backend that writes a message to a local file is none of those, and adding one does not narrow this exclusion); **multi-channel machinery** (no channel registry, strategy layer, or phone support); **staleness/re-verification policy**; **frontend UI** of any kind; bounce/suppression/deliverability handling; mail templating sophistication and i18n of mail content; and admin/revocation surfaces.

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

Behavioural decisions taken during analysis and binding on implementation. Identifiers are allocated in the order decisions were taken, not in document order — **D7–D9** were catalogued separately in §3.3 before **D10–D11** were added by amendment:

- **D1 — One active challenge per subject.** At most one open challenge per `(account, endpoint)` record, enforced in the service **and** by a partial unique index on the record `WHERE` the challenge is not closed. Multiple live secrets widen the attack surface (materially so for a short code) for no user benefit.
- **D2 — Resend rotates.** A resend **closes the previous challenge and creates a new one**; the old secret never works again. This rotates a possibly-exposed secret and matches the user's expectation that the newest message is the one that works. The **resend cooldown is anchored on the record, not the challenge**, so it survives rotation (otherwise each new challenge resets the throttle).
- **D3 — Success closes, it does not delete.** A verified challenge is marked closed and **retained for a bounded window**, then removed by the sweep job. Immediate deletion would make a replayed token indistinguishable from one that never existed, forfeiting replay detection. **The proof outlives the challenge** — this is why the challenge is subordinate, not the centre.
- **D4 — Status is derived, never stored.** Resolution order: a proof matching the **current** endpoint → **Proven**; else an open, unexpired challenge → **Pending**; else **Unproven**. A stored status column would drift the moment a challenge expired with no writer present. Consequence: **expiry requires no write to be correct** — the sweep job is hygiene, not correctness, and may lag or fail without producing a wrong answer.
- **D5 — Replay protection.** A challenge is single-use. Closed, expired, superseded, wrong-value, and never-existed all return the **same opaque failure** (no distinction leaked, mirroring the generic `401` in login and Media's opaque attach errors); the distinction is retained **internally** for diagnostics only. Secret comparison is constant-time; **confirm is rate-limited** as well as issue. **Idempotent replay of a successful challenge is deliberately deferred** — revisit if a link affordance is adopted or real double-submit friction is observed.
- **D6 — Active is the absence of `closedAt`.** No separate challenge state column: `closedAt IS NULL` plus `expiresAt` fully determines open / expired / closed, and makes the D1 index trivially expressible. A `closedReason` may exist for **diagnostics only** and must **never** be branched on for an authorization decision — `closedAt` remains the single source of truth for state. (This is I8 applied to the challenge.)

- **D10 — Capture is reachable only by exact opt-in, and never in production.** The capture backend writes a **single-use secret to disk**, so selecting it by accident is not a cosmetic failure. It therefore inherits the mechanism's existing fail-safe shape rather than inventing a second one: an unrecognised `MAIL_MODE` warns and resolves to `inert`. `inert` stays the default and stays the target every fallback resolves to: **no path ever makes `capture` the fallback.**

  > **Amended 2026-09-02 — the decision stands; how production enforces it is no longer stated here.** When this was taken, nothing else owned production's behaviour: neither [`backend/mail.md`](../backend/mail.md) nor [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md) existed, so this plan was the fact's only home. **ADR 0015 Decision 3** now makes production refuse any mode that cannot deliver, so `capture` is refused there **by construction rather than by falling back to `inert`** — superseding this decision's original reasoning that a startup crash over a mail setting is the worse failure. Outside production the fail-safe is unchanged. `mail.md` owns the resolution rule.
- **D11 — No new configuration surface.** `MAIL_MODE=capture` is the **only** switch. The destination is a **convention**, not a setting, and it is gitignored. A second environment variable would be a second thing to misconfigure on a tool whose whole purpose is local manual verification — and this is pinned so the implementer does not reach for one mid-branch, since adding an environment variable is otherwise a stop.

### 3.3 Recommendations pending ratification

Proposed with rationale; **ratified when this plan is approved** (they are not decided unilaterally):

- **D7 — Hash the challenge secret at rest** (digest + constant-time comparison). An emailed secret is more exposed than an `HttpOnly` cookie. Note this **sets a precedent**: nothing in the codebase is hashed at rest today (refresh tokens are stored raw), and Auth may later adopt it.
- **D8 — Code affordance, not a link.** A code is channel-portable (a future phone channel cannot use a link) and is not consumed by email scanners or link prefetchers, which silently burn link-based challenges. D1 and D5 are tuned for a code (hence rate-limited confirm).
- **D9 — No separate mailer ADR yet.** The port is small and its first adapter is inert; an ADR is warranted when a real provider and its operational concerns land.

## 4. Strategy & sequencing

**Order:** **1 → 2 → 3 → 4 → 5 → 6**, with **7** and **7A** following, then **8** (7 may run in parallel once 3 lands; 7A any time after 1).

```
1 (delivery port + inert adapter)  ─┐
                                    ├─▶ 4 (service: issue/confirm) ─▶ 5 (HTTP) ─▶ 6 (published surface + projection)
2 (schema + migration) ─▶ 3 (types + repository) ─┘
                              3 ─▶ 7 (expiry sweep job)
                              1 ─▶ 7A (capture delivery backend) ─┐
                                                    6 ────────────┴─▶ 8 (docs + verification harness) ─▶ WI-Docs
```

- **1 → 4** *(hard)*: `issue` cannot complete without something to deliver through. The port is also the **cheapest possible proof of the delivery boundary** — it lands before any schema is committed to.
- **2 → 3 → 4** *(hard)*: the repository needs the tables; the service needs the repository.
- **4 → 5** *(hard)*: the HTTP surface is a thin translation of an already-tested service.
- **5 → 6** *(sequencing)*: the projection is most meaningful once the fact can actually be produced end-to-end.
- **3 → 7** *(hard)*: the sweep reaches the database through the **repository**, never Prisma directly — the project's layering rule, and the shape of the refresh-token cleanup job this one is cloned from. Its bulk delete is therefore a repository method (WI-3), not a second data-access path. Beyond that it needs nothing, so it can land any time after 3.
- **1 → 7A** *(hard)*: the capture backend is a **second implementation behind the port WI-1 established**, so it needs nothing else and can land any time after 1.
- **6 → 8** *(hard)*: the harness verifies behaviour that must already exist.
- **7A → 8** *(hard)*: without an inbox the harness cannot reach the successful-confirm leg at all. Delivery discards the message and the secret is stored as a digest, so the plaintext code exists only in process memory — **successful confirm, `proven` on the self-view, and replay refusal after success are unreachable by hand** until a backend retains the message.
- **8 → WI-Docs** *(hard)*: a subsystem document describes what is true, and the harness is where a divergence between intent and behaviour surfaces. Writing it earlier would document belief.

**Why this order and not another.** The riskiest *architectural* claims are validated earliest and most cheaply: the **delivery boundary** in WI-1 (~30 lines, no schema), and the **custody model** in WI-6. The riskiest *implementation* surface — the challenge lifecycle — is unit-tested in WI-4 before any HTTP exists, because the real CI gate is `typecheck` + unit tests. Documentation and the manual harness come last because they must describe behaviour that is already true.

**Why WI-7A exists at all.** It was not in the original sequence; WI-8's preparation added it. The harness gap it closes is **not** a defect in the capability — a code that no observer can recover is exactly the property that makes the capability trustworthy. The missing thing is an **inbox**, which is a **delivery** concern, so it is fixed in the delivery layer rather than by seeding state into the harness or by weakening the capability. It also earns its place independently: WI-1 asserted that delivery composes as a domain-ignorant port on the strength of a **single** adapter, and a seam with one implementation is an untested seam. WI-7A is the first second implementation, which is why a required change to the port type is one of its stop conditions rather than a detail.

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
- **Scope:** the module's types (DTOs, the internal repository interface, a branded challenge-token type with mint + validate-before-lookup in the shape of Media's token module) and the repository implementation with the `db = prisma` default parameter; every method accepting an optional transaction client. The interface also carries the **sweep's bulk delete** (WI-7's data access), because the sweep reaches the database through the repository like every other caller — see **3 → 7** in §4.
- **Non-goals:** no business rules; no HTTP; nothing exported from the module barrel yet; no job registration (that is WI-7).
- **Dependencies:** **WI-2** (hard).
- **Boundary validated:** that all persistence detail stays internal — the repository is never published — and that it is the **single** data-access path, with no caller reaching Prisma around it.
- **Invariants protected:** **I7** (internals stay unexported), **I4** (the endpoint is a parameter, never a join to `users`).
- **Verification:** typecheck; unit tests over a fake client cover mint/validate, the row → domain mapping, and the bulk delete.
- **DoD:** types and repository exist behind an interface; nothing is exported from the barrel; typecheck + unit green.
- **Commit/PR boundary:** one PR, kept separate from WI-4. The repository is genuinely unit-testable against a fake client (the Media precedent), so it is not a compiles-but-unused unit; and WI-4 is the effort's riskiest surface, which deserves an undiluted review rather than sharing a PR with mechanical type and repository work.
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
- **Goal & rationale:** hygiene for closed and expired challenges. It is **deliberately late and low-risk** because **D4** makes it non-load-bearing: correctness never depends on it. It needs the repository and nothing more, so it may run in parallel after WI-3.
- **Scope:** a job definition cloned from the existing refresh-token cleanup job — which reaches the database through a repository, never Prisma directly — calling the bulk delete WI-3 declared (closed/expired rows past the retention window per **D3**), registered on the existing scheduler; interval and retention as configuration.
- **Non-goals:** no new scheduler substrate (it already exists, with Postgres advisory-lock single-run safety); no reclamation semantics; **no second data-access path** — the job adds no Prisma call of its own.
- **Dependencies:** **WI-3** (hard) — the repository, not merely the tables.
- **Boundary validated:** that the existing background-execution substrate hosts this job **unchanged** — one registration line.
- **Invariants protected:** **I8** (the sweep removes rows; it never writes a status).
- **Verification:** unit test with a stubbed repository and injected clock; the job is registered at composition.
- **DoD:** the job runs on the existing scheduler; disabling it changes no answer the system gives; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if the substrate needs modification to host it → **stop and reassess**; that would contradict the assumption that it is generic.

### WI-7A — Capture delivery backend
- **Goal & rationale:** give manual verification a **real inbox**. **It follows WI-1** because it is a second backend behind the port WI-1 established — and it is the **first genuine test of that seam**, which until now rested on a single implementation. **It precedes WI-8** because the harness cannot reach the successful-confirm leg before an inbox exists. The gap it closes lives in **delivery**, so it is fixed there rather than by seeding state into the harness or by weakening the capability.
- **Scope:** a `capture` backend that writes the **full** message to a local file, registered alongside `inert` in the existing mode registry; the destination gitignored; `.env.example` documenting the mode.
- **Non-goals:** **no change to `inert`**, which stays exactly as it is and stays the default; no change to the **port type**; no change to the **capability** — zero lines inside `modules/channel-verification`; no real provider, SMTP, SDK or credentials (§2 unchanged); no new environment variable (**D11**); no templating, queueing, retry, or bounce handling.
- **Dependencies:** **WI-1** (hard).
- **Boundary validated:** that the delivery port genuinely supports **more than one** backend — the claim WI-1 could only assert — and that nothing above the mechanism observes which backend is selected.
- **Invariants protected:** **I5** — and it *demonstrates* I5 rather than asserting it, since a capability that notices a delivery change was never behind the port.
- **Verification:** unit tests over the capture backend (it writes the full message; it creates its destination). The mode resolution is proven at its edges: `capture` is selected **only** on exact opt-in outside production, and both an unrecognised value and `capture` under `NODE_ENV=production` warn and resolve to `inert` (**D10**). *(That production assertion is what WI-7A verified and is left as the record of it; ADR 0015 Decision 3 later replaced the fallback with a refusal, so the test now asserts a throw — see D10's amendment.)* Two proofs that bite: **zero lines change inside `modules/channel-verification`** — diff-verifiable — and **the existing inert tests pass unchanged**, which is what "inert is untouched" means in evidence rather than in prose.
- **DoD:** the capture backend exists and is selectable; `inert` unchanged and still the default and still every fallback's target; the destination is gitignored; `.env.example` documents the mode; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if the capture backend **cannot be added without changing the port type**, → **stop**: that would confirm the wrong-abstraction risk §6 already names — a port shaped around its only implementation — and reshaping it is an architectural decision, not a detail of this Work Item. If `capture` cannot be made unreachable by accident, → **stop** rather than ship a mode that writes single-use secrets to disk on a stray environment value.

### WI-8 — Documentation + manual verification harness
- **Goal & rationale:** co-version the contract and make the capability **hand-verifiable against a running system**. **It comes last** because it must describe behaviour that already exists.
- **Scope:** the API contract entries (issue/confirm, the self-view projection field, the opaque failure shape); and the harness — a new Postman folder, a scenarios-catalogue section with stable IDs, a new lettered runbook **DB checkpoint**, a workflow-phase row, and a README paragraph. With the capture backend in place the harness covers the **full** path, including successful confirm, `proven` on the self-view, and replay refusal after success. The harness is **self-isolated** (mints its own user with a per-run unique identity) and non-destructive, per the folder-09 precedent.
- **Non-goals:** no behaviour change; no new endpoints; **no test runner** — `newman` is not a dependency and is not added, because installing a runner to automate a *manual* harness is a different effort with a different justification.
- **Dependencies:** **WI-6** (hard), **WI-7A** (hard).
- **Boundary validated:** that every guarantee is observable from outside — API-observable behaviour via the collection, and the custody invariant (**no verification data on `users`**) via the DB checkpoint.
- **Invariants protected:** **I1** (checkpoint-verified), **I8** (status derives correctly after expiry with no writer).
- **Verification:** every scenario is executed against a running system on the isolated database, and every checkpoint passes. **The execution claim is split by what each party can actually prove.** The implementer drives the scenarios with `curl` and runs the checkpoint SQL — which proves the scenarios are achievable and the expectations correct — and reports that in exactly those terms, never as "the harness passes". The **Postman collection itself is run by the human**, because the collection *is* the deliverable and validating it by another mechanism would leave the shipped artifact the one thing never exercised.
- **DoD:** the API contract is co-versioned; the harness folder, scenarios, checkpoint, workflow row, and README paragraph all land; every scenario is executed and green by the method above, with the method **stated explicitly** rather than implied.
- **Commit/PR boundary:** one PR (docs + harness).
- **Stop-risks:** if a scenario cannot be expressed without exposing internals → record a finding rather than widening the public surface. Two shapes are **not** acceptable answers to that: seeding state directly into the database to satisfy a precondition — which proves a state the system cannot itself produce and copies persistence facts into a document that will drift — and relaxing a deliberate secrecy property to make observation easier.

### WI-Docs — The platform document
- **Goal & rationale:** give the capability an **owner in the documentation**. [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) owns why it exists and what it decided; the [API contract](../api/api-contract.md) owns the wire shapes; the harness owns hand-verification. Nothing owns **the subsystem** — its module layout, its published surface, the derived-status resolution order, custody, the delivery port and its two backends, the sweep job's hygiene-not-correctness property, hashing at rest, and the opaque-failure discipline. Those are precisely the facts [`media.md`](../backend/media.md) owns for Media, and **ADR 0004**'s Stable-Core rule says a subsystem earns that document once it exists in code — which, as of WI-7A, it does. **It comes last** because a subsystem document describes what is true, and WI-8 is where any remaining gap between what is believed and what behaves surfaces.
- **Scope:** `docs/backend/channel-verification.md`, following the shape `media.md` established, and its entry in the backend section of [`docs/README.md`](../README.md). §7 and §8 already name it — this Work Item creates what they point to. It also carries the forward link from [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md), whose consequence anticipates this document, and the correction below.
- **Non-goals:** no code and no behaviour change; **no new decisions** — one discovered while writing is *recorded, not taken*, which is what "descriptive" means; **no duplication** of ADR 0009, the API contract, or the harness, each of which is linked and never restated; no repair of the harness documents' **pre-existing** hygiene issues — the hardcoded paths, database and port stay out, and are tracked separately. A **factual error in what folder 10's own checkpoint asserts** is not one of those: it was introduced with folder 10, and a document written against a checkpoint that expects an unproducible state would describe belief rather than behaviour, which is the failure this Work Item exists to prevent. It is corrected here, as a commit of its own, before the document is written.
- **Dependencies:** **WI-8** (hard).
- **Boundary validated:** **single ownership** — that the capability has one authoritative home for what it is and how it works, distinct from the ADR that decided it and the contract that exposes it.
- **Invariants protected:** none directly — it is the **record** of all eight.
- **Verification:** every claim traced to **code**, not to this plan and not to the ADR; no fact stated here is also stated in ADR 0009 or the API contract; `docs/README.md` lists it; §7 and §8 name it.
- **DoD:** the document exists and is co-versioned; the documentation map lists it; the plan's completion criteria and Reconciliation reference it; no code changed.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if writing the document surfaces a divergence between the intended design and the code, **record it** — a finding if architectural, an Issue if a routine bug — and describe **what the code does**. Documenting intent as though it were behaviour is the exact failure this document exists to prevent. If a fact seems to want restating from ADR 0009, that is the boundary between them blurring: link it instead.

## 6. Risks & mitigations (effort-wide)

- **The delivery port is designed from a single consumer** — the classic wrong-abstraction trap. Mitigation: keep it minimal (recipient + payload); no templating, queueing, or retry policy until a second consumer exists. **WI-7A is the first evidence either way**: a second backend that fits without touching the port supports the shape, and one that does not is the trap having sprung.
- **Capture writes a single-use secret to disk.** That is the point of it, and it is also the hazard. Mitigation: **D10** — exact opt-in only, never in production, `inert` as every fallback's target — plus a gitignored destination. The residual risk is a developer with capture enabled locally, which is accepted knowingly.
- **Abuse control on issuance.** The existing limiters are **per-IP and in-memory**, so they do not stop an IP-rotating attacker mail-bombing one address. Mitigation: the **record-anchored cooldown (D2)** is the durable control; the limiter is only the cheap outer layer. This matters little while delivery is inert and becomes load-bearing the moment a real provider lands.
- **The lazy-comparison contract.** A caller passing a *stale* endpoint value receives a stale answer. Mitigation: the User self-view is the authoritative caller; the contract is stated on the published method.
- **Hashing at rest sets a precedent (D7)** that Auth does not yet follow. Mitigation: scope it to this capability; do not retrofit Auth in this effort.
- **Integration tests are not in CI.** The real gate is typecheck + unit, so custody and lifecycle proofs must also exist as unit tests where possible, and the integration suite must be run locally before each PR.
- **No out-of-scope creep** — gating, real providers, multi-channel, and frontend stay out; discoveries are recorded, not absorbed.

## 7. Completion criteria (whole effort)

- All ten Work Items merged to `main`, each green (typecheck + unit; integration verified locally), each leaving a coherent state.
- An authenticated holder can request verification of their own email and confirm it; the endpoint becomes **Proven**; the self-view reflects it **as a projection**.
- **All eight invariants hold**, and the grep-verifiable ones (**I1**, **I4**, **I5**, **I7**) are demonstrably true.
- Changing the endpoint yields **Unproven with no write** to the capability; disabling the sweep job changes no answer.
- ~~Delivery remains credential-free and **inert by default**~~ — **retired 2026-09-02: not met, and not failed.** A later approved effort deliberately crossed the boundary this one excluded (§2: *"a **real mail provider** … no SMTP … no credentials"*). Under [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md), credential-free now holds of the **non-delivering backends only**, and `inert` is the default **outside production**, which refuses any mode that cannot deliver. [`backend/mail.md`](../backend/mail.md) owns the accurate statement. **The rest of this criterion stands:** the capture backend is selectable only by exact opt-in and never resolves as a fallback, and no gating policy exists anywhere.
- The API contract is co-versioned and the manual harness passes a full run — **including the successful-confirm leg**, with the execution method stated rather than implied.
- **The capability has a platform document** — `docs/backend/channel-verification.md` exists, is listed in the documentation map, and owns the subsystem's mechanisms without restating ADR 0009 or the API contract.

## 8. Reconciliation

### Where the durable knowledge landed

| What | Now owned by |
|---|---|
| The boundary, the single owned fact, custody, and the lifecycle | [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) — which, since the platform document exists, retains only the boundary and rationale |
| The subsystem's mechanisms — published surface, subject resolution, derived status, the challenge lifecycle, the digest, the single failure, the sweep, the concurrency invariants | [`backend/channel-verification.md`](../backend/channel-verification.md), created by **WI-Docs** under the Stable-Core rule ([ADR 0004](../architecture/decisions/0004-stable-core-platform-document-rule.md)) |
| Endpoints, payloads, the opaque failure shape, the self-view projection | [API contract](../api/api-contract.md) |
| Relationship, cascade and indexing rationale | [data model](../architecture/data-model.md) |
| Hand-verification | the [verification harness](../development/verification/README.md), folder **10** |
| **Delivery** — the port, its backends, their selection, the abuse controls and their sweep | [`backend/mail.md`](../backend/mail.md), under [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md). This effort built the boundary; a later one built the mechanism behind it |

### Completion criteria, as they actually stand

- **Met.** All ten Work Items merged · issue and confirm reach *Proven* and the self-view exposes it as a projection · all eight invariants hold, the grep-verifiable ones demonstrably · a changed endpoint yields *Unproven* with no write, and disabling the sweep changes no answer · the capability has its platform document, listed in the map and restating neither ADR 0009 nor the contract · the API contract is co-versioned.
- **Retired, not met.** *"Delivery remains credential-free"* — see §7, superseded by [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md). The rest of that criterion stands.
- **Outstanding.** The **human Postman gate is deferred and has not been run.** What has been run is an automated pass of folder 10 (see below), which is not the same act and does not stand in for it.

### The harness run

Folder 10 was executed under **Newman**, against the collection and the ordering this plan's WI-8 defined: **12 requests, 19 assertions, 0 failed**, including the successful-confirm leg (`204` → `proven` → replay refused identically) and the post-cooldown rotation. Newman is not a repository dependency; it was invoked transiently, so WI-8's non-goal stands.

**What that run does not cover, stated so the gap is not mistaken for coverage:** CHV-11 and CHV-12 are runbook steps and are not requests in the collection, so no automated run reaches them; CHV-13 sends its single request **once**, where the scenario is eleven attempts, so the limiter leg was not exercised. Two steps the collection documents as manual were performed by the driver rather than by hand — reading the code from the capture file, and waiting out the resend cooldown.

**The human Postman gate remains `Deferred — Not Run`.** It is tracked in [#450](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/450), whose original WI-8 criterion is **retired rather than met** under the [mail-delivery plan](historical/mail-delivery.md)'s D11, and it is the one act still standing between this plan and `Historical`.

### Findings and follow-ups recorded

[#578](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/578) (a `ChallengeCloseReason` variant with no producer, still open) · [#348](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/348) and [#449](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/449) (harness hygiene, deliberately untouched by WI-Docs and still untouched) · gating policy, which [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md) assigns to each consuming endpoint and which no consumer has yet needed.

### Status

This plan stays **`Active`** until the human gate above is run. Everything else it set out to do is done and recorded here; archiving it now would assert a completion one criterion does not have.
