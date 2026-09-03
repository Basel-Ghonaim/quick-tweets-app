# Password Reset — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-03
> **Parent Issue:** [#632](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/632)
> **Supersedes:** —

This plan sequences the implementation of **Password Reset** into four independently reviewable Work Items. Its architecture is **closed** — recorded in [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) (Accepted), which owns the boundary — a dedicated Auth capability, not an extension of Channel Verification — the single owned fact, the ownership split from Channel Verification and Mail Delivery, and the approved configuration defaults. **This plan never reopens it.**

Two further decisions were resolved in review before this plan was drafted and are equally **closed** here: the timing-neutrality mechanism (§3.2 D3) and the reserved-recovery-floor shape (§3.2 D4). Both are implementation-level choices ADR 0016 deliberately deferred; neither is an architectural decision this plan may revisit.

**Why the sequence is justified, not just listed.** The riskiest architectural claim — that a reserved floor can be expressed as a composition-time parameter, with no schema change and no purpose vocabulary crossing into Delivery — is validated **first**, cheaply, before any Auth-side code exists to depend on it. Everything else follows the shape Channel Verification and Mail Delivery already established, which is why it does not need to be rediscovered here.

---

## 1. Purpose & goals

- Give **Password Reset** a working backend: request → confirm → apply, ending at Login with every session revoked, exactly as [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decisions 1, 6 and 8 require.
- Prove the **credential lifecycle** end-to-end inside Auth: mint, digest at rest, constant-time compare, single use, one opaque failure, a sweep — the pattern Channel Verification established, copied rather than shared (Decision 4).
- Close **Mail Delivery's stated residual** ([ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md) Decision 6): give recovery a reserved floor within the existing per-recipient budget, **before** any reset mail is sent, so the second consumer cannot starve the first the moment it arrives.
- Keep the reset response **neutral in every case and honest about what it knows** — never confirming account existence, and never claiming delivery it cannot promise.

## 2. Boundary declaration

**Covers:** the reserved-floor composition change in `mail-delivery`'s consumer wiring (no change to `mail-delivery`'s own code); the reset credential's schema and migration, inside Auth; the credential unit, repository, and service (request / confirm / apply); the HTTP surface, its validators, and its rate limiting; the sweep job; the API-contract entries and their harness coverage.

**Does not cover (out of scope; unchanged):**
- **The emailed-link path.** [ADR 0016 §"What this ADR does not decide"](../architecture/decisions/0016-password-reset-credential-change-authority.md) and the UX brief's `D3` both ratify it for Reset Password; this plan builds the **code path only**, first, without foreclosing the link. The unresolved objection from Channel Verification's own `D8` — that a link is silently burned by scanners and prefetchers — is **recorded, not decided**, and meets the link path when it is built, not before.
- **Frontend UI** of any kind.
- **Channel Verification's architecture or state.** Reset never reads, writes, or depends on `emailVerification` ([ADR 0016 Decision 7](../architecture/decisions/0016-password-reset-credential-change-authority.md)).
- **Mail Delivery's port and enforcement logic.** The reserved floor is a composition-time argument; `mail.types.ts` and `capped.adapter.ts`'s locking/counting are untouched. The one line that does change inside `modules/mail-delivery/` is additive and non-behavioural for existing callers — see WI-1.
- **Gating policy** of any kind — this remains, as everywhere else, the consumer's decision and no consumer requires one here.
- **The Human Postman Gate's outstanding state.** Both platform plans remain `Active`, `Human Postman Gate: Deferred — Not Run`. Recorded as a risk (§6); **not a blocker** to this effort.

## 3. Pinned constraints (binding on every Work Item)

### 3.1 Architectural invariants

Each Work Item cites the invariants it protects by identifier.

- **I1 — No shared state with Channel Verification.** The reset credential table has no foreign key to, and no read of, any `channel_verifications*` table. *(grep-verifiable)*
- **I2 — Sole authority over its own fact.** Only this capability transitions a reset credential's state; nothing external writes it.
- **I3 — Unauthenticated by design.** Every endpoint in this effort requires **no** Bearer token; the actor is the bearer of the credential itself, never a session.
- **I4 — No consumer vocabulary crosses the Delivery port.** `MailMessage` (`to`, `subject`, `body`) is untouched; the reserved floor is expressed as a parameter at composition, never as a field the port carries. *(grep-verifiable against `mail.port-guardrail.test.ts`'s existing word list)*
- **I5 — Neutral response, always.** The request endpoint's status, body and shape are identical whether or not the address belongs to an account. *(integration-test-verifiable: assert byte-identical bodies for a real and an unknown address)*
- **I6 — No verification-state read or write.** Nothing in this effort imports from, or writes to, `modules/channel-verification/`. *(grep-verifiable)*
- **I7 — Session revocation is unconditional on success.** A confirmed reset revokes **every** session for the account before the flow can be considered complete.
- **I8 — Derived, not stored, wherever Channel Verification's own precedent applies.** The credential's spent/expired state is decided by `usedAt IS NULL` and `expiresAt`, the same shape as `ChannelVerificationChallenge`'s `closedAt` — no separate status column.

### 3.2 Settled design decisions

Decisions already taken — in ADR 0016 (**D1–D2**) or in the review that followed it (**D3–D5**) — and binding on implementation:

- **D1 — Configuration is Reset's own** ([ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 9). `RESET_CODE_TTL_MS` defaults to **10 minutes**, `RESET_RESEND_COOLDOWN_MS` to **60 seconds**, `RESET_CODE_ALPHABET` to Crockford Base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), `RESET_CODE_LENGTH` to **12**. None of these read from, default from, or fall back to any `CHANNEL_VERIFICATION_*` variable.
- **D2 — Session revocation on success, no auto-login** ([ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decisions 6 and 8). A confirmed reset calls Auth's existing per-user `deleteMany` and returns the caller to Login — never an authenticated response.
- **D3 — Timing neutrality by deferred dispatch, not by symmetric work.** The credential is persisted synchronously inside the request transaction; the response is returned **without awaiting the mail send**; the send is dispatched on `res.on("finish")` with its own error handling, never surfaced to the caller. A **~250 ms response floor**, measured from request start, absorbs the residual asymmetry of the credential write itself (a locked insert, materially faster than a network round trip) — it is not standing in for the send, which is no longer inside the timed path at all. The response never carries a delivery outcome of any kind, unlike Channel Verification's `delivery` field: reporting one here would itself be the leak. A send lost to a shutdown or a crash in the deferred window is recovered the same way Channel Verification already recovers a reported delivery failure — the credential still exists, and a fresh request supersedes it.
- **D4 — The reserved recovery floor is a composition-time parameter, not a schema or port change.** `reserveForRecipient`'s `limit` argument is already caller-supplied. Password Reset's adapter is composed with `limit = 20` (the existing `MAIL_RECIPIENT_CAP` default, unchanged); every other consumer's is composed with `limit = 15`. This reserves **5** slots of the unchanged 20-per-address total that only Reset can claim, while letting Reset use spare capacity up to 20 when other traffic is idle. No table, column, or index is added to enforce it. **This is the effort's first Work Item**, because Delivery's own code does not change and it can be validated in complete isolation from everything Auth-side.
- **D5 — The asymmetric limits are validated at startup, refused rather than clamped**, mirroring the existing `MAIL_ATTEMPT_RETENTION_MS` guard (`env.ts`'s second `superRefine`): if the reset-side limit is not strictly greater than the general limit, the reserved floor does not exist and the server does not start. Same posture, same file, same pattern — a misconfigured reserve is a startup failure, never a silent zero.

### 3.3 Recommendations pending ratification

None. Every open question this plan depends on was resolved in the review that preceded it (ADR 0016, and the timing-neutrality / reserved-floor analysis).

---

## 4. Strategy & sequencing

**Order: 1 → 2 → 3 → 4.**

```
1 (reserved recovery floor, mail-delivery composition)
        │
        ▼
2 (credential schema + lifecycle service, inside Auth)
        │
        ▼
3 (HTTP surface: request / confirm / apply)
        │
        ▼
4 (sweep + API contract + verification harness)
```

- **1 → 2** *(soft, but ordered on purpose)*: nothing in WI-2 calls Delivery, so there is no hard dependency — but WI-2's service composes the reset adapter with `limit = 20`, and validating the floor first means that composition is never built against an unreserved cap, even briefly.
- **2 → 3** *(hard)*: the HTTP surface is a thin translation of an already-tested service — the same reasoning Channel Verification's own plan used for its WI-4 → WI-5 boundary.
- **3 → 4** *(hard)*: the harness verifies behaviour that must already exist; the API contract describes endpoints that must already respond.

**Why four, not more.** Channel Verification needed ten Work Items because it was proving an unprecedented boundary — custody, derived status, a delivery port with no prior implementation. None of that is being proven again here: the pattern, the port, and the sweep substrate all exist and are being **copied**, not invented (ADR 0016 Decision 4). What remains genuinely separable is the Delivery-side composition change (touches a different module, reviewable by someone who need not read Auth's service logic at all), the credential's lifecycle (the effort's real risk, exactly as Channel Verification's challenge lifecycle was its own plan's riskiest Work Item), the HTTP translation, and the closing triad of sweep/contract/harness — which land together because none of the three is independently risky and each is small.

---

## 5. Execution structure

Each Work Item is a separate, atomic unit with its own Issue and PR, and each leaves `main` green under the real CI gate (`typecheck` + unit tests; integration tests are a local gate, per existing convention).

### WI-1 — The reserved recovery floor
- **Goal & rationale:** discharge [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md) Decision 6's stated condition — *"the second consumer is what earns the partition"* — before that consumer exists to depend on it. It is first because it is the cheapest possible proof that D4 (§3.2) holds: that a purpose-aware reserve is expressible as one additive parameter on the already-published `createMailAdapter`, with the port type and the locking/counting logic in `capped.adapter.ts` untouched.
- **Scope:** `createMailAdapter` (`modules/mail-delivery/index.ts`) gains one additive, optional `recipientCap` parameter, **defaulting to the new general limit** — the restrictive choice, matching every other fail-safe default this codebase already has (`inert`, `report`, `capture`-by-exact-opt-in): a future caller that forgets to specify one gets the smaller budget, never the reserved one, by construction. The config surface gains `MAIL_RECIPIENT_CAP_GENERAL`, defaulting to **15**; `MAIL_RECIPIENT_CAP` (20) is untouched in value and becomes, by this Work Item, the *reserved* limit — a privilege a consumer must name explicitly to receive, never one it falls into. Channel Verification's own composition is updated to pass the general limit explicitly (matching its new default, so this is documentation of intent rather than a behaviour change forced by the default). **The reduction of Channel Verification's own effective cap, from today's implicit 20 to 15, is the reserve mechanism** — the gap between the two (5) is what only Password Reset can claim. The D5 startup guard (§3.2) is added to `env.ts` alongside the existing retention `superRefine`.
- **Non-goals:** no change to `mail_send_attempts`' schema; no change to `MailMessage` or any type in `mail.types.ts`; no new caller yet — Password Reset's own composition arrives in WI-2.
- **Dependencies:** none (first).
- **Boundary validated:** that Delivery's port stays domain-ignorant under a second consumer with a materially different actor model (unauthenticated), which is the concrete test of ADR 0016 Decision 5 and ADR 0015 Decision 7 working together.
- **Invariants protected:** **I4**.
- **Verification:** the existing `mail.port-guardrail.test.ts` passes unmodified (zero new vocabulary); a unit test proves the general limit is enforced under the general limit and the reserved limit is enforced under the reserved limit, from the same underlying `reserveForRecipient`; the D5 startup guard is proven the same way the retention guard already is — a configuration where the reserved limit is not strictly greater than the general one refuses to boot.
- **DoD:** two named limits exist in configuration; every current consumer composes explicitly; the startup guard is in place and tested; typecheck + unit green; the only diff inside `modules/mail-delivery/` is `createMailAdapter`'s new optional parameter — `mail.types.ts` and `capped.adapter.ts` are unchanged.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if expressing the reserve requires touching `mail.types.ts` or `capped.adapter.ts`'s enforcement logic → **stop**; that would mean D4's premise (a pure composition-time change) was wrong, and the shape needs re-deciding, not silently building around it.

### WI-2 — The reset credential: schema, lifecycle, service
- **Goal & rationale:** the effort's core, mirroring why Channel Verification's own challenge lifecycle was its plan's riskiest Work Item. Establishes the fact ADR 0016 Decision 1 names, entirely inside Auth, reusing the mint → digest → compare → single-use → sweep pattern by copying it (Decision 4) rather than importing Channel Verification's implementation.
- **Scope:** a standing credential table (account reference, secret digest, `expiresAt`, `usedAt`, mirroring `ChannelVerificationChallenge`'s shape per **I8**) and its additive migration, entirely within Auth's schema ownership; the mint/digest/compare unit, copied from Channel Verification's construction and re-parented under Auth's own configuration (D1); the repository behind Auth's existing layering convention; the service implementing **request** (find-by-email using the existing `findByEmail`, mint if found, **do nothing observable to the caller if not** — I5), **confirm** (validate the submitted code, single-use, opaque failure on any invalid state), and **apply** (accept the new password under registration's existing strength rules, hash it, revoke every session — **D2/I7**); the deferred-dispatch send and the response floor (**D3**).
- **Non-goals:** no HTTP layer yet; no rate limiting (owned by WI-3, which sits in front of this service); no sweep registration (WI-4).
- **Dependencies:** **WI-1** (soft — see §4).
- **Boundary validated:** that the credential pattern transfers to a genuinely different actor model (unauthenticated, momentary) without importing Channel Verification's module, and that neutrality (**I5**) and the deferred send (**D3**) compose correctly around one transaction.
- **Invariants protected:** **I1, I2, I3, I5, I6, I7, I8**.
- **Verification:** unit tests over the service with an injected clock and a fake mail adapter. **The neutrality requirement is on the externally observable response, not on internal execution** — the known-address path legitimately does more (mints a credential, persists it, dispatches a send) and the unknown-address path does none of it; what the tests assert is that the two produce the **same status, the same body shape, and the same values** the caller can observe, and that only the known-address path ever calls the mail adapter at all. Confirm rejects a wrong, expired, reused, or never-issued code identically; apply revokes every session and the new password authenticates while the old one does not; a grep proving no import from `modules/channel-verification/` exists anywhere in the new code (**I6**).
- **DoD:** the lifecycle is complete and unit-covered; nothing is exported beyond what WI-3 will need; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if neutrality (**I5**) cannot be achieved without the response depending on whether the account exists in any observable way (timing, headers, or body) → **stop**; that is D3's premise failing, not a detail to patch around.

### WI-3 — HTTP surface: request / confirm / apply
- **Goal & rationale:** make the capability reachable, translating WI-2's already-tested service into three unauthenticated endpoints. Follows immediately because, per Channel Verification's own precedent, this layer should be thin enough that its risk is fully retired by WI-2's tests.
- **Scope:** three routes — request, confirm, apply — **all unauthenticated (I3)**; validators for each payload (email format; code format matching D1's alphabet and length; the new password under the existing policy); per-route rate limiting on all three, sized for an anonymous, higher-abuse surface than Channel Verification's authenticated equivalents; the `app.ts` mount.
- **Non-goals:** no gating; no admin surface; no frontend.
- **Dependencies:** **WI-2** (hard).
- **Boundary validated:** that an anonymous actor can drive the whole flow to completion — request, confirm, apply, ending at a state with no valid session — with the neutral response (**I5**) holding at the actual HTTP boundary, not merely inside the service's unit tests.
- **Invariants protected:** **I3, I5**.
- **Verification:** integration tests covering the full path (request → confirm → apply → old password rejected, old sessions revoked) and the failure paths (unknown address, wrong/expired/reused code, weak new password), with the neutral-response assertion run at the HTTP layer against both a real and an unknown address.
- **DoD:** the three endpoints are live, unauthenticated, and rate-limited; typecheck + unit green, integration green locally.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if the rate-limit sizing for an anonymous surface reveals a gap the durable per-address controls (WI-1's reserved floor, D2's record-anchored throttle inherited from the copied pattern) don't already cover → record a finding; the limiter is the outer layer, not the control this effort's abuse posture rests on.

### WI-4 — Sweep, API contract, verification harness
- **Goal & rationale:** closes the effort the way both prior platform efforts closed theirs — hygiene, the wire contract, and hand-verifiable proof, landing last because each describes behaviour that must already be true.
- **Scope:** a sweep job cloned from `refreshTokenCleanup.job.ts`'s shape (interval + a `deleteExpired`-equivalent on the repository, registered on the existing scheduler — no new substrate); the API contract entries for all three endpoints, including the **absence** of a `delivery`-shaped field on the request response (D3) and an explicit note on the Pre-release Contract Exceptions table if any shape choice here would otherwise read as inconsistent with Channel Verification's; a new Postman folder with stable scenario IDs, run under `MAIL_MODE=capture` exactly as Channel Verification's folder 10 is, covering the neutral-response assertion, the full happy path, and the reserved-floor's observable effect (a burst of general-consumer sends does not exhaust Reset's reserved capacity) to the extent it can be driven without seeding state the system cannot itself produce.
- **Non-goals:** no behaviour change; no new endpoints; **no test runner** — consistent with the Channel Verification plan's own non-goal, `newman` is not added as a dependency here either. *(A prior effort ran folder 10 through Newman transiently, on explicit instruction, without adding it as a dependency — that is a precedent for **how** to run one if ever asked, not a standing exception to this non-goal.)*
- **Dependencies:** **WI-3** (hard).
- **Boundary validated:** that every guarantee this effort claims is observable from outside — the API contract describes exactly what ships, and the harness proves it against a running system.
- **Invariants protected:** **I7** (checkpoint-verified: all sessions gone after a confirmed reset), **I8** (an expired, unswept credential still reads correctly).
- **Verification:** the harness is executed against a running system on the isolated worktree database, with the execution method **stated explicitly** — implementer-driven via `curl` plus checkpoint SQL proves the scenarios are achievable; the Postman collection itself, per the precedent both platform plans already set, is the artefact a **human** runs for the gate that actually closes the effort.
- **DoD:** the sweep runs on the existing scheduler; the API contract is co-versioned; the harness folder, scenarios, and a DB checkpoint all land; typecheck + unit green, integration green locally.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if a scenario cannot be expressed without seeding a precondition the system cannot itself produce → record a finding rather than widening the harness's exposed surface, per Channel Verification's own precedent for this exact situation.

---

## 6. Risks & mitigations (effort-wide)

- **The Human Postman Gate for Mail Delivery is `Deferred — Not Run`.** Password Reset becomes the second production consumer of a mechanism whose hand-verification has not happened. **Not a blocker**: Mail Delivery is code-complete, CI-green, and integration-tested locally; the gate's absence is a documentation-closure gap on that effort, not evidence of a defect in the mechanism this effort depends on. Recorded so it is not silently forgotten, not to reopen either platform plan.
- **The response-floor value (D3, ~250 ms) is a guess pending real measurement.** Mitigation: it is configuration, not a schema commitment; WI-2's DoD includes confirming the floor comfortably exceeds the measured credential-write latency in the actual environment before the value is finalized.
- **The reserved floor's split (20 / 15) assumes Channel Verification is the only "general" consumer today.** If a third mail consumer arrives before this effort completes, WI-1's two-limit shape (reserved vs. general) already accommodates it without further schema change — the residual is stated, not hidden, exactly as ADR 0015's own Decision 6 stated its residual before this plan existed.
- **The emailed-link path stays deferred with an unresolved objection attached** (`D8` vs. the UX brief's `D3` for Reset Password specifically). Not this plan's to resolve; carried forward for whoever picks up the link path.
- **No out-of-scope creep** — gating, the link path, and any change to Channel Verification's or Mail Delivery's own modules stay out; discoveries are recorded, not absorbed.

## 7. Completion criteria (whole effort)

- All four Work Items merged to `main`, each green (typecheck + unit; integration verified locally).
- An anonymous requester can recover access to an account they own end-to-end: request → confirm → apply → every prior session invalid → sign in with the new password.
- **All eight invariants hold**, and the grep-verifiable ones (**I1, I4, I6**) are demonstrably true.
- A request for a real address and a request for an unknown one are **provably indistinguishable** at the HTTP boundary — status, body, and shape.
- The reserved recovery floor exists, is startup-validated, and Delivery's port type and enforcement logic carry zero lines of new consumer vocabulary.
- The API contract is co-versioned and the manual harness passes a full run, with the execution method stated rather than implied — matching, not exceeding, what Mail Delivery and Channel Verification each already closed with.
- No line inside `modules/channel-verification/` or `modules/mail-delivery/` changes for a reason other than WI-1's explicit, minimal composition update.

## 8. Reconciliation

*Added as this plan approaches `Historical`.*
