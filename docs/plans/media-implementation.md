# Media / File Upload — Implementation Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-07-16
> **Parent Issue:** [#305](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/305)
> **Supersedes:** —

This plan translates **[ADR 0005 — Media / File Upload Architecture](../architecture/decisions/0005-media-file-upload-architecture.md)** into an ordered set of independently reviewable Work Items. ADR 0005 is **settled**: this plan **sequences its implementation and never reopens its boundaries, ownership, contracts, or invariants.** Where ADR 0005 deliberately left a *mechanism* open, this plan **surfaces it as a deferred decision** — resolved in its own record (a sub-ADR where architectural, otherwise the Work Item's Issue), never here.

It is a **strategy document**: it owns the effort's goals, sequence, dependencies, rationale, and risks. Each Work Item's implementation, acceptance criteria, status, and progress belong to that Work Item's Issue (created when implementation begins), which this plan links and never mirrors.

## 1. Purpose & goals

- Bring the Media subsystem of ADR 0005 into working software on the **initial local-disk backend**, end to end.
- Resolve **[#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256)** (register silently discards the avatar) as the **first end-to-end milestone** — the smallest consumer that proves the whole boundary.
- Deliver both feature consumers: the **avatar** (a single reference on `User`) and **tweet-compose media** (an ordered collection of references).
- Close the effort by reconciling the durable knowledge into the permanent documents — notably a new `docs/backend/media.md` — reducing ADR 0005 to boundary + rationale (one-owner-per-fact, per [ADR 0004](../architecture/decisions/0004-stable-core-platform-document-rule.md)).

## 2. Boundary declaration

*What this plan intentionally covers, and what it intentionally leaves out — so scope cannot silently expand while it is written.*

**Covers**

- Implementing ADR 0005 decisions 1–9 on the **local-disk** backend, end to end.
- The Media **foundation**: the platform module + published interface, the domain-ignorant storage-adapter port, the local-disk backend, and the `MediaObject` registry (schema, repository, opaque-token reference model, immutability/permanent-delete invariants).
- The **write path**: content-authoritative validation, the single principal-scoped multipart ingest boundary (16 kB cap lifted on that route only), uploader provenance, cross-principal attach-authorization, and aggregate usage accounting.
- The **read path**: the stable public `GET /media/:token` endpoint with local-disk streaming, the envelope invariant, the read-side security posture (content-derived `Content-Type`, `nosniff`, no active content from the app origin), and lifecycle read semantics.
- The **two consumers**: #256 register-with-avatar (first milestone) and tweet-compose media, including the frontend upload-then-submit-reference client pattern.
- The **lifecycle**: the codebase's first scheduled/background-execution substrate and Media-owned reclamation, under the conservative invariants (an object is never reclaimed before it can be referenced; single recovery unit; quarantine-on-divergence).
- Co-versioned contract/schema/data-model updates and the closing **reconciliation** (creating `media.md`).

**Deliberately excludes**

- Re-deciding **any** ADR 0005 boundary, ownership, contract, or invariant — the plan only sequences their implementation.
- **Resolving** the surfaced deferred decisions — each is named and scheduled, but settled in its own record, not here.
- **Object storage / presigned** write and **redirect/CDN** read delivery — reserved for a future object-store ADR; this plan only keeps the port and read endpoint from precluding it.
- A durable **non-public access posture** beyond the public read #256 needs (M5 ships public + a documented seam).
- Admitting **browser-executable / scriptable** media types (SVG/HTML) or standing up an isolated serving origin.
- A **third consumer** or a polymorphic shared-`Media` entity (ADR 0005 rejects that now).
- The concrete **quota policy** value / whether a quota is enforced (only the accounting capability + ownership check are built).
- **Acceptance criteria, per-Work-Item status, progress, checklists** — these live in each Work Item's future Issue, not in this strategy document.

## 3. Strategy & sequencing

**The one hard ordering invariant:** #256 (**M6**) is the **first end-to-end consumer**, reachable only once the foundation (M1, M2) and the two boundaries it uses (M4 ingest, M5 read) exist. Critical path: **M1 → {M2, M3} → M4 → M6**, with **M3** branching from M1 in parallel with M2 (rejoining at M4), and the read path **M5** depending only on M1 + M2 — buildable in parallel with the write path against a seeded object.

M6 deliberately exercises only the *reference-begins* half (ingest + attach on the same being-created principal), so it needs **neither** cross-principal attach-authorization/quota (M7) **nor** the *reference-ends* coordination — which is exactly why it is the minimal proof and comes first. Generalization is sequenced *after* #256 so the first milestone stays a clean, uncontended vertical, even though **M8** depends only on the registry and **M7** only on the registry plus the ingest boundary — both already built by Phase 2. Lifecycle is independent of the consumers' *code* but **not** of their *coordination*: reclamation (M11) must not be enabled until every reference-creating consumer (M6, M9) signals referenced-ness through the coordination mechanism, or an established reference could be misread as garbage. M12 closes the effort once the mechanisms are real in code.

| Phase | Goal | Work Items |
|---|---|---|
| **1 — Foundation** | The storage-agnostic seam: module, port + local-disk, registry — before any consumer. | M1, M2 |
| **2 — Boundaries** | The write path (validation + ingest) and the read path, behind the foundation. | M3, M4, M5 |
| **3 — First consumer (#256)** | Prove the whole boundary end-to-end with the smallest consumer. **First milestone.** | **M6** |
| **4 — Generalization & second consumer** | Cross-principal authority + `TweetMedia` schema + tweet-compose media. | M7, M8, M9 |
| **5 — Lifecycle & reclamation** | The first background-execution substrate + Media-owned reclamation. | M10, M11 |
| **6 — Reconciliation** | Create `media.md`; reduce ADR 0005 to boundary + rationale. | M12 |

**Decision gates** (deferred decisions pulled just-in-time — see §5): the pre-auth-ingest sub-ADR and the **begin-half** of the reference-coordination mechanism **before M6**; the validation technique **before M3**; the **full** reference-coordination contract (begin *and* end) **before M9 and M11**; the background-execution substrate **within M10, before M11**. The quota-policy value, the media access posture, and the object-store extension are **not** on the critical path to any local-disk milestone (including #256).

## 4. Execution structure — Work Items

*Each item is one independently reviewable change. Scope + rationale are strategy-level; the detailed acceptance criteria live in the item's Issue when it is created. IDs (M1…M12) are plan-local handles, not Issue numbers.*

**Phase 1 — Foundation**

- **M1 · Media module foundation: storage-adapter port + local-disk backend.** *(implements Decisions 1, 2, 6; deps: —)* Stand up the Media platform module exposing a **single published interface** (features consume only through it), fix the dependency-direction invariant (Media imports no feature module; the adapter is the only code touching storage), define the domain-ignorant byte-I/O port, and implement the local-disk backend as the initial adapter. Port signatures must not preclude a future presigned extension. The module's internal anatomy is an implementation detail. *Why:* the storage-agnostic seam every later boundary and consumer slots behind.
- **M2 · `MediaObject` registry: schema, repository, reference/identity model.** *(Decisions 3, 2; deps: M1)* Introduce the registry as Media's private authority for all storage detail: features persist a **stable internal Media Reference**, and the public reference token is **opaque and non-enumerable** (whether the persisted reference *is* the public token is an M2 implementation choice). Encode Decision 3's invariants (immutable-once-ready, opaque token, permanent-delete). Introduce only the status states the seams and #256 need. *Why:* the single owner of storage detail and identity — every consumer attaches a reference through it.

**Phase 2 — Boundaries**

- **M3 · Content-authoritative validation.** *(Decision 7; deps: M1)* A pure, transport-independent validation component: derive the effective type from content (e.g., signature inspection), enforce a non-executable allow-list + size limit, reject with reserved `415`/`413`, and return the single verified content-type Media will store. *Why:* the minimum bar against disguised uploads, reviewable in isolation.
- **M4 · Ingest write boundary (multipart, principal-scoped).** *(Decision 5; deps: M1, M2, M3)* The single Media-owned ingest route that lifts the 16 kB cap on that route only, accepts a streamed upload from an identified principal, runs validation, records the uploader, and returns a reference token. Feature endpoints take references, never bytes. Retires the `auth.routes.ts:19` multer lean. *Why:* concentrates upload transport in one storage-agnostic boundary.
- **M5 · Read boundary: `GET /media/:token` (stream delivery + security envelope).** *(Decisions 4, 7, 3; deps: M1, M2)* The stable top-level read endpoint (mounted like `/health`, outside `/api/v1`) resolving a token to a servable object and streaming for local disk, with the read-side security posture (content-derived `Content-Type`, `nosniff`, no active content from the app origin) and lifecycle read semantics (servable once ready; a permanent failure once deleted; not-yet-servable or absent is not served — the concrete status codes are the Work Item's / the API contract's). Ships **public** read behind a documented resolution-time access-control seam. *Why:* the one boundary every consumer reads through — a hard prerequisite for #256; buildable in parallel with the write path.

**Phase 3 — First consumer (#256) · first milestone**

- **M6 · Register-with-avatar — first media consumer (#256).** *(Decisions 9, 3, 5; deps: M2, M4, M5)* Repurpose `User.profileImage` to a single Media Reference; under the being-created principal, Media ingests + validates the avatar and the reference attaches to the new user (only the reference persisted); surface it via `GET /media/:token`; wire the register form + existing avatar `FileInput` to the upload-then-submit-reference pattern, closing the silent discard. Exercises only *reference-begins*. *Why:* ADR 0005 names #256 the first consumer; it is the smallest vertical proving the whole boundary and establishes the client pattern the second consumer reuses.

**Phase 4 — Generalization & second consumer**

- **M7 · Media ownership authority — attach-authorization + aggregate usage accounting.** *(Decision 5; deps: M2, M4)* Authorize a feature's attach against the object's recorded uploader (no cross-principal attach), and compute a principal's aggregate usage from the registry (so quota is enforceable at one owner). Builds the *capability*; the quota policy is deferred. *Why:* generalizes the write boundary beyond the same-principal register case, driven by the next consumer.
- **M8 · `TweetMedia` data model — ordered reference association; retire `Tweet.image`.** *(Decisions 9, 3; deps: M2)* Introduce the tweets-domain `TweetMedia` association (ordering + reference-only), retire the `Tweet.image` scalar, supersede the reserved `image` wire field, and establish that removing a tweet removes its *references* only. A self-contained, co-versioned schema+wire change (a "reserved shape" migration, no end-to-end behavior). *Why:* fits the model to cardinality; de-risked from the compose UX and never competes with the #256 milestone.
- **M9 · Tweet-compose media (dropzone) — second consumer.** *(Decisions 9, 5, 3, 8; deps: M4, M5, M7, M8; reuses M6's client pattern)* Wire tweet create/edit to accept ordered *references* only, attach through Media under the authenticated author, persist ordered `TweetMedia`, and surface the collection via the read endpoint; wire the existing dropzone `FileInput`. First path to exercise *reference-ends* coordination (replace/remove). *Why:* the richer consumer, sequenced after #256 to reuse the proven ingest/attach/read + client pattern (a reuse edge, not a hard prerequisite).

**Phase 5 — Lifecycle & reclamation**

- **M10 · Scheduled/background-execution substrate (platform capability).** *(Decision 8; deps: —)* Introduce the codebase's first background-execution mechanism generically (single-run safety under concurrency/restarts, failure isolation, observability); Media reclamation is its first job, but it is reusable (e.g., refresh-token cleanup). *Why:* ADR 0005 names this a new platform concern for its own Work Item; reclamation cannot run without it.
- **M11 · Media reclamation of abandoned and unreferenced objects.** *(Decisions 8, 9; deps: M10, M2, M8)* Media's exclusive physical deletion, running on the substrate: reclaim never-referenced (abandoned) and now-unreferenced objects, determining referenced-ness from the registry (never feature schemas), under the conservative invariants (an object is never reclaimed before it can be referenced; single recovery unit; quarantine-on-divergence). Reclamation is **enabled only after** every reference-creating consumer (M6, M9) participates in the coordination mechanism — otherwise an established reference could be misread as never-referenced; retiring the untracked `Tweet.image` path (M8) is a precondition for enabling physical deletion. *Why:* the *reference-ends*/cleanup half, separated from the first-consumer attach path.

**Phase 6 — Reconciliation**

- **M12 · `docs/backend/media.md` + ADR 0005 reconciliation.** *(Decision 1; deps: M6, M9, M11 — the terminal milestones whose closure covers all mechanisms)* Once the subsystem exists in code, create `media.md` as the operative owner of the media mechanisms and reduce ADR 0005 to boundary + rationale (one-owner-per-fact), with summarize-and-link cross-refs from `security.md` and `system-overview.md`. A Documentation Work Item, deferred (Stable-Core rule) until the subsystem is real. *Why:* the closing reconciliation of the effort.

### ADR 0005 coverage

Every decision has at least one implementing Work Item:

| ADR 0005 Decision | Work Item(s) |
|---|---|
| 1 — Media platform module owns the mechanism | M1, M12 |
| 2 — Fixed dependency direction; features consume Media only via its published interface | M1, M2 |
| 3 — Reference model + registry + invariants | M2, M5, M6, M8, M9 |
| 4 — Read endpoint owned; delivery open; envelope | M5 |
| 5 — Write boundary; principal; uploader; attach-auth; accounting | M4, M6, M7, M9 |
| 6 — Storage-adapter port (byte I/O; must not preclude presigned) | M1 |
| 7 — Content-authoritative validation + read-side security posture | M3, M5 |
| 8 — Lifecycle/deletion/reclamation; conservative invariants | M10, M11, M9 |
| 9 — Data model fit-to-cardinality, reference-only | M6, M8, M9, M11 |

## 5. Deferred decisions — *surfaced, not resolved by this plan*

ADR 0005 deliberately left these open. Each is settled in its **own** record — a **sub-ADR** where it is architectural, or the **Work Item's Issue** where it is a contained implementation choice — **before** the Work Item that needs it. The plan names them and *when* they are due; it never chooses them.

**Likely sub-ADRs (architectural):**

- **#256 pre-auth ingest authorization model** — *needed before M6.* How an ingest binds to a not-yet-existent principal on the unauthenticated register endpoint without opening an anonymous-upload vector. A security-boundary authorization choice that would set a reusable pattern.
- **Reference-coordination mechanism** — *needed before M9 and M11 (the begin-half touches M6).* How a feature signals a reference begins/ends so Media reasons from its own state (explicit call, transactional bookkeeping, reference count, or reconciliation). Cross-cutting across the consumers and reclamation.
- **Scheduled/background-execution substrate + single-run safety** — *resolved within M10, before M11.* A new platform capability whose selection also serves later needs (e.g., refresh-token cleanup).
- **Media access posture (public vs access-controlled reads)** — *needed only by the first feature requiring non-public media — not #256.* Shapes token authority and whether a resolution-time check runs. M5 ships public + a seam.
- **Future object-store ADR (presigned write / redirect-CDN read)** — *needed only to adopt a non-local-disk backend.* The plan only keeps the port and read endpoint from precluding it.
- **Admitting scriptable media types / an isolated serving origin** — *out of scope (see §2); if ever pursued it is a superseding ADR, since it reopens Decision 7's "no active content from the application origin."*

**Implementation choices (in the Work Item's Issue):**

- **Concrete `MediaObject` status set + registry schema shape** — *before M2.* (Invariants are fixed by Decision 3; the state model is not.)
- **Storage-key layout + opaque-token minting scheme** — *before M1/M2.*
- **Integrity mechanism (e.g., content checksum) + whether the registry reserves a column now** — *before M11 / any migration; not needed for #256.*
- **Validation technique, allow-list, size threshold** — *before M3* (bounded by Decision 7's constraints).
- **Quota policy — value + enforcement point** — *before M7* (the accounting capability exists; the policy on top does not).
- **Reclamation grace-window duration + run cadence** — *before M11.* Decision 8 bounds *that* a grace window exists (an object is not reclaimed before it can be referenced); its value and schedule are not fixed by ADR 0005.

## 6. Risks & mitigations

- **Reopening ADR 0005 (the dominant risk).** A Work Item — especially the registry (M2), validation (M3), the read boundary (M5), or the `media.md` reconciliation (M12) — could quietly re-decide a boundary. *Mitigation:* the invariants are taken verbatim from ADR 0005; anything ADR 0005 left open is a **deferred decision** (§5), not a WI's to choose; a change to a *boundary* is a new superseding ADR, never a plan or reconciliation edit.
- **Decisions resolved too late.** A Work Item blocks on an unmade decision. *Mitigation:* the decision gates in §3 pull each deferred decision just-in-time (e.g., the pre-auth sub-ADR before M6).
- **New platform surface — scheduled execution.** M10 introduces the codebase's first background execution. *Mitigation:* built generically with single-run safety in its own Work Item, reusable beyond media.
- **Security of the #256 pre-auth path.** Ingest on an unauthenticated endpoint. *Mitigation:* gated behind its own sub-ADR before M6; ingest is never anonymous (Decision 5).
- **Scope creep during authoring.** *Mitigation:* the §2 boundary declaration is the standing anchor; the excludes list is explicit.

## 7. Reconciliation targets

*Where the durable knowledge migrates when the effort completes (the full record is written at `Historical`). Named now so the destinations are known.*

- **`docs/backend/media.md`** (new, at M12) — the operative owner of all media mechanisms (module interface, port, registry model, validation/ingest/attach/accounting, read delivery + security posture, reclamation + coordination). ADR 0005 then retains only boundary + rationale.
- **`server/prisma/schema.prisma`** — field-level truth: the `MediaObject` model, `TweetMedia`, `User.profileImage` repurposed to a reference, `Tweet.image` retired.
- **`docs/architecture/data-model.md`** — the relationship/cascade/index rationale (feature→Media direction, `MediaObject` unaware of referrers, `TweetMedia` ordering, tweet-delete removes references while Media reclaims).
- **`docs/api/api-contract.md`** — the ingest route, `GET /media/:token`, media-reference fields, the tweet media collection superseding `image:null`, and the realized `415`/`413`.
- **`docs/backend/security.md`** and **`docs/architecture/system-overview.md`** — summarize-and-link cross-refs (the read-serving posture; the top-level media route in the request lifecycle).
- **`docs/architecture/decisions/0005-media-file-upload-architecture.md`** — reduced to boundary + rationale on `media.md`'s creation.
- The **background-execution substrate** (M10) — its durable knowledge lives in its **own sub-ADR** in `decisions/` (ADR-only under the Stable-Core rule while single-instance), **not** `media.md`, since it is a cross-cutting platform capability.
- Any **sub-ADRs** produced by the deferred decisions (§5) land in `docs/architecture/decisions/`; any discovered deviations become **findings**.

---

> This plan owns strategy, sequencing, rationale, risk, and structure. Implementation, status, progress, and acceptance criteria are owned by each Work Item's Issue (created when implementation begins), which this plan links — never mirrors.
