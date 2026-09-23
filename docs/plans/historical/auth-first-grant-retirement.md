# Auth-First Onboarding & Pre-auth Grant Retirement — Execution Plan

> **Status:** Historical
> **Type:** Migration
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-14
> **Parent Issue:** [#357](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/357)
> **Supersedes:** —
> **Archived:** 2026-08-11 — completed. Its durable facts now live in [ADR 0008](../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md), [`schema.prisma`](../../../apps/api/prisma/schema.prisma), the [API contract](../../api/api-contract.md), the [data model](../../architecture/data-model.md), and [`backend/media.md`](../../backend/media.md); this plan is retained as provenance.

This plan translates **[ADR 0008 — Auth-First Onboarding and Retirement of the Pre-auth Upload Grant](../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)** into an ordered set of independently reviewable Work Items. ADR 0008 is **settled**: this plan **sequences its implementation and never reopens its boundaries, ownership, contracts, or invariants.** It owns the effort's strategy, sequence, ordering invariants, gates, and risks; each Work Item's acceptance criteria, status, and progress belong to that Work Item's Issue (created when it begins), which this plan links and never mirrors.

## 1. Purpose & goals

- Move registration to **auth-first**: `POST /auth/register` creates the account + session only; the avatar becomes an optional, authenticated, User-owned Media producer.
- **Retire the pre-auth upload grant completely** — issuance, verification, secret, adoption, pre-auth ingest, and the abandoned-grant reclamation class — leaving **authenticated-only Media uploads and one ownership/provenance model** (`uploaderId NOT NULL`).
- Simplify the Media lifecycle to a **single reclamation class** (unreferenced-owned), so M11's later destructive verification is built against the final, intended lifecycle.
- Do all of the above under the **migration safety invariants** of ADR 0008 Decision 11, with a **bounded, gated legacy-data cleanup** (Decision 12), and with `MEDIA_RECLAMATION_MODE=report` held throughout.

## 2. Boundary declaration

**Covers**
- The auth-first account/profile surface (`PATCH /users/me`, `GET /users/me`) and the avatar as a single-cardinality full-replacement producer (ADR 0008 D5–D8), including the profile-read avatar resolution (the fold-in of #335, D10).
- The Media attach surface exposing authoritative metadata (D6); authenticated-only ingest (D4/D5); complete grant/adoption removal (D3).
- The `uploaderId NOT NULL` constraint and grant-column drops (D4), gated behind the **legacy-data cleanup** (D12).
- Reconciling **M11 to the single unreferenced-owned class** (D8/D14) — the effort's terminal Work Item.
- Co-versioned contract/schema/data-model/`.env.example`/ADR-amendment updates.

**Deliberately excludes**
- **M11 destructive verification, rehearsal, and enablement** — the separately-approved controlled-verification effort ([#354](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/354), [#356](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/356)), which now builds its oracle against *this* plan's final lifecycle. This plan hands off to it; it does not perform it.
- **Enforced per-user quota + registration anti-abuse** (email verification / captcha) — recorded by ADR 0008 as a **pre-production** follow-up, not a blocker for retirement.
- The broader **`AuthorEmbed`-in-feed** avatar resolution — the remainder of #335, beyond the profile-read fold-in.
- The compose/tweet media frontend (unrelated; the deferred M9b).
- **Acceptance criteria, per-Work-Item status, checklists** — owned by each Work Item's Issue.

## 3. Strategy & sequencing

**The migration is additive → cutover → subtractive.** New paths land first, the client is cut over, and only then is the grant removed — so there is never a runtime window in which the frontend speaks a protocol the backend has dropped, and never a moment a `NULL`-owner object can be created after the constraint is in sight.

**Hard ordering invariants (ADR 0008 Decision 11 — must hold throughout):**

1. **No `NULL`-owner object may be creatable before the constraint lands** — every grant/`uploaderId IS NULL` creation path is removed before the legacy cleanup and `NOT NULL`.
2. **Frontend cutover precedes grant-path removal.** The additive phase intentionally lets the new authenticated paths coexist with the still-live grant path until cutover; the invariant is that the **frontend is cut over before the grant path is removed** — there must be **no window in which the frontend depends on a protocol the backend has already removed**, and **no intentional grant-compatibility period maintained after cutover** (per ADR 0008's rejection of a dual-protocol compatibility window).
3. **Code-before-columns** — all grant-referencing code (adoption, mint/verify, provenance, *and M11's abandoned class*) is removed **before** `grantId`/`grantExpiresAt` are dropped.
4. **Legacy gate before constraint** — `NOT NULL` + column drops apply **only after** the cleanup drives `COUNT(uploaderId IS NULL) = 0`.

**Two steps are irreversible and human-gated:** the **legacy-data cleanup** (WI-5, in this plan) and — out of this plan's scope — **M11 destructive enablement**. Neither proceeds without explicit approval.

| Phase | Goal | Work Items |
|---|---|---|
| **1 — Additive auth-first** | The authenticated avatar/profile surface, grant still live. | WI-1, WI-2 |
| **2 — Frontend cutover** | The signup UI stops speaking grant. | WI-3 |
| **3 — Stop NULL owners** | Authenticated-only ingest; register de-avatared. | WI-4 |
| **4 — Legacy safety gate** | Prove + remove legacy `NULL`-owner objects. | WI-5 |
| **5 — Remove code, then schema** | Grant code out; final constraints in. | WI-6, WI-7 |
| **6 — M11 reconciliation** | Single unreferenced-owned class; hand off to M11 verification. | WI-8 |

## 4. Execution structure — Work Items

*Each item is one independently reviewable change; its Issue is created when it begins. IDs (WI-1…WI-8) are plan-local handles, not Issue numbers.*

**Phase 1 — Additive auth-first**

- **WI-1 · Media attach surface returns authoritative metadata.** *(ADR 0008 D6; deps: —)* Evolve `authorizeAttach` / `authorizeAttachMany` to return the object's authoritative `contentType` and `size` alongside `{ referenceId, token }`. **Purely additive** — existing tweet/comment callers ignore the new fields; the grant path is untouched. *Why:* the seam consumer-specific policy evaluates over, without Media learning product concepts.
- **WI-2 · User/Profile avatar lifecycle + policy.** *(D5, D6, D7, D8, D10; deps: WI-1)* Add `PATCH /users/me` (`name?`, `bio?`, `avatar?`) with **atomic, single-transaction** semantics and full-replacement avatar (`omit`=unchanged, `{token}`=set/replace, `null`=remove), coordinated as one unit under the M11 attach lock (D8); the avatar **policy** (`{jpeg,png}`, ≤ 1 MiB — D7) is owned and evaluated by the User domain over WI-1's metadata. Add `GET /users/me`, and resolve the avatar on `GET /users/:username` + `GET /users/me` (**folds in #335's profile-read side** — D10). Register still accepts the grant-based avatar at this point (removed in WI-4). *Why:* the avatar becomes an ordinary authenticated producer with a full lifecycle it never had.

**Phase 2 — Frontend cutover**

- **WI-3 · Auth-first signup cutover.** *(D1, D2, F; deps: WI-2)* **Registration is account creation only** (ADR 0008 D1): remove the avatar input from the signup form, remove **all** frontend grant usage (`uploadAvatar` mint + `X-Upload-Grant`, and the `avatar` field on the register request), register with `{ username, name, email, password }`, and establish the session normally — with **no** post-registration avatar upload, wizard, or profile step. Avatar/profile **editing** is a separate future frontend surface ([#362](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/362)); avatar **display** migration + `profileImage` retirement is [#335](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/335). **Gate:** after this WI, **no client consumes the grant path** (proven by grep). *Why:* invariant 2 — the frontend must stop speaking grant before the backend drops it; scoping signup to account-only is also the most faithful reading of D1 (no avatar coupled to registration).

**Phase 3 — Stop producing NULL owners**

- **WI-4 · Authenticated-only ingest + de-avatared registration.** *(D3, D4, D5; deps: WI-3)* `POST /media` requires authentication (drop the `X-Upload-Grant` / grant-evidence branch and `optionalAuth`); remove `POST /media/grants`; remove `avatar` from `POST /auth/register`, `RegisterInput`, its validator, and the register adoption branch. **Gate (invariant 1):** prove **no path can create a `uploaderId IS NULL` object.** *Why:* closes the only sources of grant-provenance / null-owner objects.

**Phase 4 — Legacy-data safety gate**

- **WI-5 · Bounded legacy-cleanup tool + supervised run.** *(D12; deps: WI-4)* Build the **one-time** tool (never M11 destructive, never inside a schema migration): **report** all `uploaderId IS NULL` objects → **prove** each is genuine legacy garbage (no `MediaReference`; unreferenced by `tweet_media`/`comments.media_id`/`users.avatar_media_id`; legacy grant provenance present; `status ∈ {ready,deleted}`; storage state recorded) → **explicit human approval** → **hard-delete** (bytes-then-row, idempotent/retryable, FK-backstop-loud, never force-delete an anomaly) → **verify `COUNT(uploaderId IS NULL) = 0`**. **Irreversible; gated** exactly like the destructive M11 switch. *Why:* invariant 4 — the constraint may land only over a clean table.

**Phase 5 — Remove code, then schema (code-before-columns)**

- **WI-6 · Remove grant-column-dependent executable code.** *(D3, D5, D8, D10; deps: WI-4)* Delete every executable path that reads `grantId`/`grantExpiresAt` or the grant primitives, so no code references a column about to be dropped: grant mint/verify, adoption (`IMediaAdoption`, `adoptById`), grant provenance handling (`MediaProvenance`/repo/types), the Auth→Media `adoption`/`references` ports (Auth becomes **Media-free**; avatar resolution lives in User, WI-2), and **M11's `findAbandoned` selection and its orchestrator call** (it reads `grantExpiresAt`) — together with the **direct tests of that removed code**, so the branch stays green with reclamation selecting only the unreferenced-owned class. WI-6 does **not** touch the `ReclaimReason` type variant, audit/reason terminology, verification scenarios, or the final single-class verification — those carry no grant-column dependency and belong to WI-8. Must land **before** WI-7. *Why:* invariant 3 (code-before-columns) — nothing may reference a column about to be dropped.
- **WI-7 · Final schema migration + config.** *(D4; deps: WI-5 ∧ WI-6)* `uploaderId NOT NULL`; drop `grantId`, `grantExpiresAt`, `@@unique([grantId])`; remove `MEDIA_GRANT_SECRET` from the env schema + `.env.example` (+ the `!== JWT_SECRET` refine). **Gate:** WI-5 count = 0 **and** WI-6 leaves no code referencing the dropped columns. *Why:* enforces the single-provenance invariant at the database.

**Phase 6 — M11 reconciliation**

- **WI-8 · Reconcile M11's *semantics* to the single unreferenced-owned model.** *(D8, D13, D14; deps: WI-6 ∧ WI-7)* With the executable abandoned path already removed (WI-6), this WI owns only the semantic/documentation reconciliation — it has **no grant-column dependency**: remove the now-inert `abandoned` `ReclaimReason` variant and reconcile reason/audit terminology to the single class; retire the abandoned scenarios in the [verification catalogue](../../development/verification/verification-scenarios.md) and reconcile the [Media execution plan](../media-implementation.md) (M11 description) + api-contract/data-model wording; run the **final report-only, single-class verification**. **Hands off** to the M11 destructive-verification effort (#354/#356 + the controlled oracle), which builds against this final lifecycle and is **out of this plan's scope**. *Why:* leaves the Media lifecycle in its final, verifiable form. *(Boundary with WI-6: WI-6 removes column-reading executable code and its direct tests to keep the build green; WI-8 removes the vestigial type/terminology and updates scenarios/docs — no responsibility is shared.)*

### ADR 0008 coverage

| ADR 0008 Decision | Work Item(s) |
|---|---|
| 1–2 auth-first / no onboarding state | WI-3, WI-4 |
| 3 complete grant retirement | WI-4, WI-6, WI-7 |
| 4 authenticated-only ownership (`NOT NULL`) | WI-4, WI-5, WI-7 |
| 5 avatar as normal producer | WI-2 |
| 6 metadata-over-attach boundary | WI-1, WI-2 |
| 7 avatar product policy | WI-2 |
| 8 avatar mutation transaction invariant | WI-2 |
| 9 unreferenced-owned abandonment | WI-4, WI-8 |
| 10 responsibility boundary | WI-2, WI-6 |
| 11 migration invariants | all (ordering) |
| 12 legacy-data safety gate | WI-5 |
| 13 M11 relationship | WI-8 (+ out-of-scope hand-off) |
| 14 ADR 0005 amendments | WI-6, WI-8 |

## 5. Deferred decisions — *values/choices, not boundaries*

The boundaries are settled by ADR 0008; these are contained Work-Item choices, each resolved in its Issue:

- **Location of avatar policy constants** (allow-list, max size) within the User domain (validator vs service).
- **`GET /users/me` shape** and whether Auth retains a minimal Media-free identity `/me` — an implementation choice (ADR 0008 D10 fixes only that Auth is Media/Profile-free).
- **Legacy-cleanup tool form** (script vs guarded command) and its report format — bounded by ADR 0008 D12's gate + recovery semantics.
- **Quota policy value + enforcement point** — remains deferred (pre-production follow-up), not part of this plan.

## 6. Risks & mitigations

- **Cutover window (frontend speaks a removed protocol).** *Mitigation:* additive → cutover → subtractive; WI-3 before WI-4 (invariant 2).
- **Irreversible legacy deletion of a mis-classified object.** *Mitigation:* WI-5's report → prove-per-candidate → explicit approval → idempotent tool with the `Restrict` FK backstop; an anomaly halts, never auto-deletes (ADR 0008 D12).
- **Dropping columns still referenced by code.** *Mitigation:* code-before-columns; WI-6 before WI-7 (invariant 3).
- **Irreversible deletion under a lifecycle mid-removal.** *Mitigation:* M11 stays report-only; destructive is a separate post-plan effort built against the final lifecycle (ADR 0008 D13).
- **Upload abuse via mass registration.** *Mitigation:* authenticated-only upload is strictly safer than the retired grant; enforced quota + registration anti-abuse are a **recorded pre-production follow-up**, not a blocker.
- **Reopening ADR 0008.** *Mitigation:* the §2 boundary is the anchor; a change to a boundary is a new superseding ADR, never a plan edit.

## 7. Reconciliation targets

*Where the effort's durable knowledge landed. Verified on `main` at archival: `MediaObject.uploaderId` is `NOT NULL` and carries no grant columns; `MEDIA_GRANT_SECRET` is absent from the env schema and `.env.example`; the API contract exposes no grant endpoint or evidence header and does expose `PATCH`/`GET /users/me`; and `ReclaimReason` is the single `"unreferenced"` class. One finding was recorded and is [Resolved](../../architecture/findings/resolved/0007-grant-access-token-shared-secret.md).*

- **`server/prisma/schema.prisma`** — `uploaderId NOT NULL`; `grantId`/`grantExpiresAt`/grant uniqueness removed.
- **`docs/api/api-contract.md`** — remove `POST /media/grants` + grant evidence; `POST /media` auth-required; register loses `avatar`; add `PATCH`/`GET /users/me`; profile responses resolve the avatar.
- **`docs/architecture/data-model.md`** — single-provenance ownership; the avatar producer; abandonment via unreferenced-owned only.
- **`server/.env.example`** + env schema — `MEDIA_GRANT_SECRET` removed.
- **[ADR 0005](../../architecture/decisions/0005-media-file-upload-architecture.md)** — Decisions 3/5/8 as amended by ADR 0008 (reconciled into `docs/backend/media.md` at M12).
- **[media-implementation.md](../media-implementation.md)** — M11 reconciled to the single class; abandonment terminology.
- **Verification catalogue/runbook** — abandoned scenarios retired.
- Any discovered deviations become **findings**.

---

> This plan owns strategy, sequencing, ordering invariants, gates, risk, and structure. Implementation, status, progress, and acceptance criteria are owned by each Work Item's Issue (created when it begins), which this plan links — never mirrors.
