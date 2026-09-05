# ADR 0008: Auth-First Onboarding and Retirement of the Pre-auth Upload Grant

> **Status:** Accepted
> **Date:** 2026-07-27
> **Deciders:** Basel Ghonaim
> **Supersedes:** [ADR 0007](0007-pre-auth-ingest-upload-grant-model.md)
> **Amends:** [ADR 0005](0005-media-file-upload-architecture.md) — Decisions 3, 5, 8
> **Revised:** 2026-09-05 — Decision 2 narrowed to what it was written to protect: the *account* holds no onboarding-completion state, which is distinct from a separately-owned fact that routes a reader between onboarding screens.

## Context

[ADR 0007](0007-pre-auth-ingest-upload-grant-model.md) introduced the **upload grant** to solve exactly one problem: in register-with-avatar the avatar uploads *before the user row exists*, so ingest needed an identity that was not yet a principal. ADR 0007 framed itself deliberately as *"a reusable pattern, a single consumer… no generalization machinery until a second consumer exists"* — registration was its only consumer.

No second pre-auth consumer has materialized or is planned (invite/onboarding flows named in ADR 0007 remain hypothetical). Moving registration to an **auth-first** model — create the account and session first, then upload the avatar as an authenticated user — removes the grant's sole reason to exist. The machinery auth-first needs already exists: authenticated ingest (`POST /media` under a Bearer principal, ADR 0005 Decision 5 / M4) and attach-authorization against the recorded uploader (M7).

Retiring the grant collapses, in one move, **two upload-authorization models → one**, **two provenance models → one**, **two reclamation classes → one**, and **removes adoption** (the one-time ownership-fill exception to immutable-once-ready). It is the largest available simplification of the Media lifecycle, and it lands directly on the still-unverified destructive path of **M11** (reclamation), which is running **report-only**.

This ADR records **settled boundaries, ownership, contracts, and invariants**. The concrete migration *sequence* is an execution-plan concern; only the migration **safety invariants** are recorded here (Decision 11). This ADR implements nothing.

## Decision

### 1. Registration is auth-first; the account is complete at creation

`POST /auth/register` creates the account and issues the normal authenticated session, and **nothing else**. The `avatar` field is removed from the register request and from `RegisterInput`. A successful registration means a **fully valid account** — closing the browser, skipping avatar/profile, or a later upload failure never invalidates it. Steps a client may present as an onboarding wizard (account → avatar → profile) are **independent backend operations**, never one transaction.

### 2. The account holds no onboarding-completion state

Avatar, bio, and other profile fields are **optional enrichment**. The **account** holds no "onboarding complete" flag and **nothing an account may do is gated on one**: no capability, no endpoint, and no read of a `User` row consults such a notion to decide what the holder is permitted. The invariant *"an account is complete the instant it is created"* is preserved exactly.

What this decision was written to forbid is **gating the account**. It is not a prohibition on **routing the reader** — a distinction the original wording did not draw because, at the time, nothing needed it. A separately-owned fact recording that a registration journey was begun and finished is admissible, on three conditions: it lives outside `users`, it decides only which client screens a reader may reach, and its absence changes nothing an account can do. A reader with no journey is refused three onboarding screens and nothing else; their account remains complete, and every endpoint remains open to them exactly as before.

That fact cannot be frontend-local, which the original text offered as the alternative. Client-held journey state does not survive a reload, a second tab, or a typed URL — so a route-level guarantee built on it is not a guarantee. It is owned by the onboarding journey capability (`modules/auth/journey/`), which stores it in its own table and publishes nothing to the account.

### 3. The pre-auth upload grant is retired **completely**

There is no legitimate remaining pre-auth Media consumer, so the grant is removed in full — not deprecated, not preserved for a hypothetical future. The final architecture has: **authenticated Media uploads only; no grant issuance; no grant verification; no grant signing secret; no adoption flow; no abandoned-grant reclamation class.**

### 4. Authenticated-only ownership — one provenance model

Every `MediaObject` records a **non-null, authenticated `uploaderId`** at creation. `MediaObject.uploaderId` becomes **`NOT NULL`** (enforced only after the legacy gate of Decision 12 completes). Grant provenance (`grantId`, `grantExpiresAt`, and the grant-scoped uniqueness) is removed. Attach-authorization has a **single** form: *the authenticated principal equals the object's recorded uploader.* Reclamation (Decision 9) therefore has a **single** class.

### 5. Avatar is a normal, User-owned Media producer

The avatar is an ordinary reference producer of the **single-cardinality** shape (identical to comment media): a bare `User.avatarMediaId`, referrer tag **`user-avatar:{userId}`**, no foreign key. It supports, from the outset, **set, replace, remove, and read**, with full-replacement mutation semantics: `avatar` **omitted** = unchanged; `avatar: { token }` = **set/replace**; `avatar: null` = **remove**. Replacing or removing an avatar **ends the old reference but never deletes bytes** — physical reclamation is M11's alone (Decision 9). The avatar's lifecycle, and its product policy (Decision 7), are owned by the **User/Profile** domain (Decision 10), not by Auth and not by Media.

### 6. Consumer policy is evaluated over Media-authoritative metadata — Media never learns product concepts

Media owns **authoritative technical metadata** — the content-derived `contentType` and the byte `size`, already persisted on the registry (ADR 0005 Decision 7). The consuming feature owns **product policy** (e.g. "an avatar is one image ≤ 1 MiB"). The boundary: **Media's attach surface exposes the authoritative `contentType` and `size` of the object being attached; the consuming feature evaluates its own policy over those facts.** Media never receives or evaluates product concepts such as "avatar"; features never read stored bytes, never trust client-declared metadata, and never duplicate MIME/size truth. Because the metadata is content-derived and **immutable-once-ready**, and is obtained under the same attach lock as the reference write (Decision 8), there is **no validation↔attach TOCTOU**. This generalizes with no further change: Tweet and Comment evaluate different predicates over the same facts.

*(Rejected — see Alternatives: passing product constraints *into* Media. It makes Media evaluate policy it does not own and grows feature-specific over time; returning facts keeps policy wholly in the feature.)*

### 7. Avatar initial product policy (server-authoritative)

For the initial product the avatar policy is, explicitly:

- **exactly one image**;
- **maximum 1 MiB**;
- **allowed content types: `image/jpeg` and `image/png`**;
- **GIF and WebP are not accepted** for the avatar.

This `{jpeg, png}` allow-list is the **actual initial product policy**, not a workaround. **APNG** (an animated `image/png`) is an **accepted residual** of allowing PNG and is **not a blocker**. Should the product later require a strict *static-images-only* invariant, that requires Media to expose additional authoritative technical metadata (e.g. `isAnimated` / `frameCount`) — a **future enhancement, outside this migration**. The registry already persists everything the initial policy needs (`contentType`, `size`); **no schema change is required** to enforce it. The global Media ingest limit is unchanged — the 1 MiB bound is an avatar-feature policy, not a platform limit.

### 8. Avatar mutation is one transaction under one lock (M11 serialization preserved)

A set/replace/remove of the avatar is a **single unit of work on a single `DbClient`**, and the following all participate in **that same transaction and the M11 attach-vs-reclamation locking protocol**:

1. `authorizeAttach(new)` — which takes the `FOR UPDATE` lock on the new object (M11 concurrency hardening) and returns its authoritative metadata;
2. the **authoritative metadata read**;
3. the **avatar policy evaluation** (Decision 7);
4. the **reference coordination** — `referenceEnded(old, user-avatar:{id})` / `referenceBegan(new, user-avatar:{id})` on the set difference (a resubmit of the same object signals neither);
5. the **`User.avatarMediaId` mutation**.

These are **not merely sequential calls**: the `FOR UPDATE` protection obtained by `authorizeAttach` **must remain effective through policy evaluation and reference coordination until commit**, so a concurrent reclamation can never tombstone an object between its validation and its reference beginning. Any failure at any step — authorization, policy, coordination, or the user update — **rolls the whole unit back**, leaving the previous avatar/reference state intact. Removal is the same unit without a new object: `referenceEnded(old)` → `avatarMediaId = null` → commit; the old object needs no lock because ending its reference only makes it *eligible* for later reclamation, and M11's own re-check-under-lock observes only committed state.

### 9. Abandonment is uniform: unreferenced-owned + grace, never request-level cleanup

An authenticated user who uploads a Media object and then abandons attachment (Skip, close, a failed `PATCH`, or a re-upload) leaves a **`ready`, owned, unreferenced** object. It is reclaimed **only** by M11 under the normal unreferenced-owned grace policy. **No request path deletes bytes because attachment did not occur.** This is the single, standard abandonment model after grant retirement — it replaces ADR 0007's grant-expiry abandonment. *(Distinct from — and does not remove — the existing cleanup of a **failed ingest** that never became `ready`.)*

### 10. Responsibility boundary

- **Auth** owns account creation, authentication, and session lifecycle. **Auth is Media-free and Profile-free**: it does not resolve, hydrate, or return avatars. (Auth responses carry only token-derived identity; the avatar is not among them.)
- **User/Profile** owns the avatar **lifecycle and policy** and the profile read surface: `GET /users/:username`, `GET /users/me`, `PATCH /users/me`, and **avatar resolution**.
- **Media** owns Media identity, storage, validation, ingest, attach-authorization, authoritative metadata, reference mechanics, and physical deletion.
- **M11** owns physical reclamation.

*(Rejected — see Alternatives: retaining an Auth→User hydration path merely to keep `avatarToken` in Auth responses. Auth is made fully Media-free and Profile-free; the current-user profile, including the avatar, is served by `GET /users/me`.)*

### 11. Migration safety invariants (the *properties*, not the step list)

The migration's concrete ordering belongs to the execution plan; these **invariants** are architectural and must hold throughout it:

- **No `NULL`-owner object may be creatable before the constraint lands.** Every path that could create a grant-provenance / `uploaderId IS NULL` object is removed *before* the legacy cleanup and the `NOT NULL` constraint.
- **Frontend cutover precedes grant-path removal.** New auth-first paths are added first (additive), the existing signup UI is cut over, and only then is the grant path removed — there is **no runtime window supporting both protocols**.
- **Code-before-columns.** All grant-referencing code — adoption, mint/verify, provenance handling, *and the M11 abandoned class* — is removed **before** `grantId` / `grantExpiresAt` are dropped, so nothing references a column that no longer exists.
- **Legacy gate before constraint.** The `NOT NULL` constraint and column drops are applied **only after** the legacy cleanup (Decision 12) has driven `COUNT(uploaderId IS NULL) = 0`.

### 12. Legacy-data safety gate (bounded one-time tool, not a schema migration)

Existing `uploaderId IS NULL` objects are **candidates, not authorization to delete.** Cleanup is a **bounded, supervised, one-time tool** — never M11's destructive path (unverified, and it would tombstone rather than remove), never hidden inside a schema migration:

1. **Report** every `uploaderId IS NULL` object.
2. **Prove each is genuinely legacy garbage** — all must hold, or it is an **anomaly → halt & investigate, never auto-delete**: zero `MediaReference` rows; not referenced by any feature state (`tweet_media`, `comments.media_id`, `users.avatar_media_id`); expected legacy grant provenance present; `status ∈ {ready, deleted}`; storage existence recorded.
3. **Explicit human approval** of the proven-clean set.
4. **Remove** (hard-delete, not tombstone — a tombstoned `NULL`-owner row would violate the incoming constraint).
5. **Verify `COUNT(uploaderId IS NULL) = 0`**, then and only then apply Decision 4's constraint and the column drops.

**Recovery semantics** (byte deletion and row deletion cannot be one atomic transaction, so the tool is **idempotent and retryable**):

- **Ordering is bytes-then-row**, so the registry row remains the tracking anchor until the object is fully removed.
- **Bytes deleted, row deletion fails/crashes:** the row survives; a retry re-finds it, re-proves the invariants, deletes bytes (a no-op), and completes the row deletion.
- **Bytes already absent on retry:** byte deletion is idempotent (a no-op success).
- **DB deletion blocked by a reference/backstop:** the `media_references` `Restrict` foreign key is the final guard — if a reference unexpectedly exists, the row delete **fails loudly**; the tool leaves the object **intact and flagged**, and **never force-deletes**.
- **Repeated execution:** fully-removed candidates are simply not re-found; partially-removed ones are completed; the end state is invariant.
- **The tool re-proves the Decision-12 invariants per candidate at deletion time** and **never turns an unexpected invariant violation into an automatic deletion.**

### 13. Relationship to M11 destructive enablement

M11 stays **report-only** throughout this migration. Its destructive path is verified and enabled **only against the final, simplified lifecycle** (one reclamation class), so verification effort is spent on the intended long-term model and irreversible deletion is never performed under a lifecycle mid-removal. Destructive enablement remains gated on the previously-approved measurable criteria — [#356](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/356), the deterministic controlled dataset + oracle, the disposable-environment rehearsal, and a separate explicit approval — now **built against this ADR's final lifecycle**.

### 14. Amendments to ADR 0005

ADR 0005 remains Accepted; this ADR amends three of its clauses (and reconciles into `docs/backend/media.md` at M12):

- **Decision 5** — ingest under *"an authenticated user, **or a principal being created (as in register-with-avatar)**"* is narrowed to **an authenticated user only**; the two attach-authorization evidence types collapse to one.
- **Decision 8** — reclamation of *"**abandoned** and unreferenced objects"* becomes reclamation of **unreferenced objects** only; the grant-provenance "abandoned" class is removed. The conservative invariants (grace, single recovery unit, quarantine-on-divergence) stand unchanged.
- **Decision 3** — the adoption exception (a one-time ownership *fill* on a `ready` object, introduced by ADR 0007) is removed; **immutable-once-ready becomes absolute** — an object's owner is fixed at creation.

## Alternatives considered

- **Keep the grant (Option A).** Rejected on the merits (not effort): it preserves two authorization models, two provenance models, two reclamation classes, and adoption — for a consumer that no longer exists. It also leaves the unauthenticated upload vector and a second signing secret in place, and it is the only option under which a user still cannot change or remove their avatar.
- **Pass product constraints into Media** (a generic `{maxBytes, allowedTypes}` evaluated by Media). Rejected: it makes Media evaluate policy it does not own and inevitably accretes feature-specific predicates. Returning authoritative facts keeps all policy in the feature and generalizes for free.
- **Keep Auth→User hydration to preserve `avatarToken` in Auth responses.** Rejected: it retains a coupling for a cosmetic convenience. Auth is made fully Media/Profile-free; the profile (incl. avatar) is a User-domain read.
- **A runtime dual-protocol compatibility window** (support grant and auth-first simultaneously). Rejected: it contradicts complete removal and adds dual-maintenance for zero benefit in a no-traffic environment; an additive-then-subtractive cutover is safe and cleaner.
- **Use M11 destructive reclamation for the legacy cleanup.** Rejected: M11 destructive is unverified, and it *tombstones* — leaving `uploaderId IS NULL` `deleted` rows that would violate the new `NOT NULL` constraint. A bounded, reviewed, hard-deleting one-time tool is safer and auditable.
- **Leave `uploaderId` nullable.** Rejected: nothing legitimately produces a null owner after retirement; `NOT NULL` makes the single-provenance invariant enforceable at the database.

## Consequences

- The project gains **one** upload-authorization model, **one** provenance model, **one** reclamation class, and no adoption exception — a materially simpler and more verifiable Media lifecycle, and a **smaller security surface** (no unauthenticated upload path, no grant issuance endpoint, no grant signing secret).
- **Removed:** grant minting/verification, the grant issuance endpoint, the pre-auth ingest evidence path, adoption, grant provenance fields + uniqueness, the `MEDIA_GRANT_SECRET`, the M11 abandoned class, and their tests. **Added:** the User/Profile write + self-read surface (`PATCH /users/me`, `GET /users/me`) and avatar attach via the authenticated path; the attach surface exposes authoritative metadata.
- The avatar gains a **full set/replace/remove/read lifecycle** it never had (a product improvement), reusing the comment-media producer shape.
- **Superseded/amended records:** ADR 0007 is **Superseded** by this ADR; ADR 0005 Decisions 3/5/8 are **amended** as in Decision 14. The [Media execution plan](../../plans/media-implementation.md) (M6 description, abandonment terminology) and the verification catalogue update accordingly; the durable reconciliation lands in `docs/backend/media.md` at M12.
- **Non-blocking follow-ups (recorded, not built here):** (a) enforced **per-user quota** (via the existing `usageFor` accounting) and **registration anti-abuse** (e.g. email verification / captcha) — a **blocker before production, not for this migration**, since authenticated-only upload is strictly safer than the retired grant path; (b) Media **animation metadata** (`isAnimated`/`frameCount`) if a strict static-only avatar rule is later required (Decision 7 residual); (c) the broader `AuthorEmbed`-in-feed avatar resolution — the remainder of #335, beyond the profile-read fold-in of Decision 10.
- **Abuse posture:** after retirement, upload abuse requires an authenticated account (rate-limited registration + per-user accounting), where before it could be anonymous under a minted grant. The residual gap (no *enforced* quota, evadable IP-based registration limits) is pre-existing and recorded above as a pre-production blocker.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
