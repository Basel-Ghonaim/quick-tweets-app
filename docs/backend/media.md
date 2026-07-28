# Media Platform Subsystem

> **Status:** Active.
> **Authority:** The authoritative source for the **Media platform subsystem's mechanisms and their rationale** — the module boundary and its public interface, the storage-adapter port, the registry and reference model, ingest and content-authoritative validation, read and resolution, ownership/attach and reference coordination, and the reclamation lifecycle (tombstones, quarantine, recovery, report-vs-destructive). It owns the *how* and the *why*.
> It does **not** own: the wire contract (endpoints, payloads, error shapes — the [API contract](../api/api-contract.md)'s), the field-level schema ([`schema.prisma`](../../server/prisma/schema.prisma)) or the relationship/cascade/indexing rationale (the [data model](../architecture/data-model.md)'s), the shared HTTP-hardening and auth-guard mechanisms (the [Backend Security](security.md)'s), or the boundary **decision** itself — recorded in [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md), which this document now implements per the Stable-Core rule ([ADR 0004](../architecture/decisions/0004-stable-core-platform-document-rule.md)).
> **Scope:** The server-side Media platform module (`server/src/modules/media/`) and its mechanisms. Feature-specific bindings (how tweets, comments, and the profile avatar attach media) belong to those features and link here.
> **Version:** 1.0
> **Last Updated:** 2026-07-28
> **Owner:** Basel Ghonaim

## Purpose & boundary

Media is a **platform module, not a business feature**: a single shared owner of uploads, storage, validation, serving, reference-tracking, physical deletion, and reclamation, so no feature reinvents any of them. Its boundary and rationale are the decision recorded in [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md); ingest's evolution to authenticated-only (retiring the pre-auth upload grant) is [ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md). This document owns the mechanisms that implement those decisions.

The **dependency rule** is fixed and one-directional: feature modules depend on Media; **Media depends on nothing domain-specific** — it imports no feature module and reaches the byte store only through an injected **storage-adapter port**. There is no cycle. Features consume Media **only through its published interface**, never its routes, repositories, or internals. The general law the subsystem establishes: features may depend on platform modules, features never depend on one another, and platform modules never depend on features.

## Module anatomy & the public/internal API

Media exposes exactly one feature-facing surface and keeps everything else internal.

- **`media/index.ts` is the sole feature-consumer public API.** It publishes the attach/ownership, reference-coordination, and resolution surfaces, the error types features catch, and the identifier constructors — nothing more. The tweets, comments, and users features import Media only from here. The registry repository, the ingest/read service, the controllers, the validation policy, the storage backend, and the reclamation subsystem are **not** exported.
- **Composition-root wiring is a separate, legitimate path — not a boundary bypass.** The application assembly wires Media's *transport and background entry points* directly: the app mounts Media's HTTP routes, and the server registers the reclamation job with the background scheduler by importing the job module directly. This is composition-root wiring (the same pattern the auth refresh-token cleanup job uses), distinct from a feature consuming Media's logic through `index.ts`. Two intentional entry points — the feature-facing barrel and direct composition-root wiring — coexist by design.
- **Two internal submodules with their own boundaries.** *Storage* owns the byte backend and its factory. *Reclamation* is a self-contained internal submodule — the collector, its registry-only query repository, its scheduler job, and its controlled-verification harness. Reclamation has **no public barrel**; its encapsulation is a dependency rule (**core Media never imports the reclamation submodule** — only the composition root wires its job, and its own verification consumes it). This keeps the reclamation lifecycle changeable in one place and unreachable by accident.

## The registry & the reference model

The **registry** is Media's private authority for a stored object's identity and storage detail. It records, per object, the internal id, the opaque public **token**, the storage key, the verified content type, the size, the `status`, the **uploader** (provenance), and timestamps. Feature tables persist **only** a stable internal **Media Reference** — the object's **numeric id** (`User.avatar_media_id`, `Comment.media_id`, `TweetMedia.media_id`) — never the public token, a provider URL, or a storage key, so a storage migration repoints nothing in feature schemas. The opaque **token** is the separate API-boundary handle (see *Read & resolution*): Media resolves it to and from the numeric reference, and a feature never stores it.

**One persistence authority owns the registry.** The registry repository owns both the object rows **and** the `media_references` ledger, because that ledger *is* Media's own referential state: [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md) Decision 8 requires Media to determine what is still referenced **from its own state, never by reading a feature schema**. The reference is opaque — a feature composes a **referrer tag**, Media stores and matches it but never parses it, so Media learns *that* an object is referenced, never *what* refers to it (Decision 9's "a `MediaObject` is unaware of its referrers"). The reclamation collector has its **own, separate** registry-only query repository (below); the two are distinct authorities — the live attach/reference/resolve surface versus the garbage collector's read model.

**Invariants:** an object's **content is immutable once `ready`** — no path rewrites its bytes, content type, size, or token, so replacing media mints a *new* object rather than rewriting one; the token is **opaque and non-enumerable**. The lifecycle **`status`** is the deliberate exception to that immutability: it transitions `ready → deleted` (a retained tombstone) through reclamation, and a read then **fails permanently** (`410`). The field-level columns and constraints are owned by [`schema.prisma`](../../server/prisma/schema.prisma); the relationship, cascade, and indexing rationale by the [data model](../architecture/data-model.md).

Because every object records an **owning uploader** (`uploader_id`, `NOT NULL`, `onDelete: Restrict`), the database **blocks deleting a `User` while they own media objects**. This is the current constraint: no account-deletion route exists today, and any future account-deletion workflow must first **explicitly reconcile a user's owned media** — reassign or reclaim — before removing the `User`; the database refuses a silent cascade. (This records the constraint only; it invents no deletion semantics. The cascade rationale is the [data model](../architecture/data-model.md)'s.)

## The storage-adapter port & backend

The **storage-adapter port** is domain-ignorant **byte I/O only**: store, retrieve, delete (idempotent), test existence, and enumerate by key. It does **not** validate content, mint identifiers, or compute integrity metadata — those are Media's, above the port. The adapter is the **only** code that touches physical storage; the initial backend is **local disk**, and the storage submodule owns the factory that selects and constructs it (rooted at the configured upload directory). The port deliberately stays byte-level so an alternative backend (for example a presigned object-store adapter) can be added later behind the same signature — that extension is a future object-store ADR, not this document.

## Ingest & content-authoritative validation

Ingest is Media's entry point; a feature's write endpoints accept **only references**, never file bytes or multipart. Ingest runs under an **authenticated principal** — the single evidence type after the pre-auth upload grant was retired ([ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)) — and every object records that uploader as its provenance. The endpoint, its multipart shape, the allow-list, the size limit, and the reserved `415`/`413` are the [API contract](../api/api-contract.md)'s.

Validation is **server-side and content-authoritative**: the client-declared type and the file extension are advisory and are not even inputs — the effective type is derived from the file's own bytes (signature inspection), content that does not verify as an allowed, non-executable type is **rejected**, and the stored type is the verified one. Ingest is **write-after-validate**: the registry row is created only after the bytes are fully stored and verified — there is no servable half-written object. The streaming mechanics (reading the signature head, counting bytes, failing fast past the size limit, and cleaning up a partial object on any failure) are the ingest boundary's; the pure allow-list/size policy is a separate, transport-independent component.

## Read & resolution

The stable public read contract is `GET /media/:token` (the [API contract](../api/api-contract.md) owns the wire shape and status codes). Only **servable** (`ready`) objects read; a deleted object reads **`410 Gone`** permanently (the token is never reissued), and an unknown, not-yet-ready, or bytes-missing object reads `404`. The read-side security posture — the content-derived, non-sniffable type, the route-scoped cross-origin resource policy, the bounded cache window, and the public-by-opaque-token model — is a Media mechanism this document owns; [Backend Security](security.md) links here and owns the global HTTP-hardening baseline it overrides.

**Resolution** turns the internal numeric references features persist back into public tokens, **batched** (a feed page resolves many at once) and **servable-only** (an unresolvable reference is simply absent, so a caller can never hand out a token that would fail to read). It is the only sanctioned way to cross the identity boundary — a feature never copies a token into its own table, where it would drift from the registry.

## Ownership, attach, and reference coordination

Media publishes three feature-facing surfaces, all thin adapters over the registry:

- **Ownership / attach-authorization.** A feature presents a token and the attaching principal; Media authorizes the attach against the object's recorded uploader (no cross-principal attach), under a row lock, and returns the numeric reference plus the object's **authoritative** content-type and size (so the consumer evaluates its own policy over Media's facts, with no validation↔attach TOCTOU). A batch variant locks every object in ascending-id order (deadlock-free) and authorizes the set atomically.
- **Reference coordination.** The feature owns the **trigger** (the decision to add, replace, or remove a reference); Media owns the **write**. Both `referenceBegan` and `referenceEnded` accept the caller's transaction, so the signal and the feature's own reference change commit or roll back together — a signal cannot be lost half-way — and both are **idempotent** (beginning twice records one reference; ending an absent one is a no-op). Replacing media is not a third operation: because an object's content is immutable, a replacement is an end followed by a begin. Each feature composes its own referrer tag (for example a per-tweet, per-comment, or per-user-avatar tag); Media stores it opaquely.
- **Resolution** (above).

## Lifecycle: status, tombstones, reclamation, quarantine, recovery

An object's `status` is `ready` or `deleted`. **Reclamation is Media's exclusive physical deletion** and is deliberately conservative:

- **Registry-only selection.** The collector finds garbage from **Media's own state** — never a feature schema at runtime. There is a **single garbage class**, *unreferenced-owned* (an owned, `ready` object with no reference, settled past a grace window that covers the upload→first-attach gap). The grant-era "abandoned" class was retired with the pre-auth grant ([ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)).
- **Tombstone retention.** A successful reclaim **flips the row to `status='deleted'` and deletes the bytes** — it **never hard-deletes the registry row**. The retained tombstone makes the read path return `410` permanently and is the durable anchor for idempotent recovery.
- **Quarantine on divergence.** A registry↔storage divergence — a `ready` row whose bytes are gone (*row-without-bytes*), or a stored key with no row (*orphan-bytes*) — is **quarantined and flagged for review, never deleted on divergence alone**, so a point-in-time restore is not mistaken for garbage. The registry and its bytes are a **single recovery unit**.
- **Lingering-bytes recovery.** If a crash or failed delete leaves a committed tombstone whose bytes still exist, a later pass **re-issues the idempotent byte delete** (the tombstone is retained). This is retryable cleanup, not a divergence to quarantine.
- **Reclamation reads no feature table at runtime** — an invariant the controlled-verification harness independently proves (below).

The append-only reclamation audit trail (written in **both** modes) and the quarantine review queue are Media's **durable, queryable record of what each pass observed and did** — the evidence base for human review of reclamation, in controlled pre-production verification and in any later operational soak alike; it is not tied to any single review. Field-level detail is [`schema.prisma`](../../server/prisma/schema.prisma)'s; cascade rationale is the [data model](../architecture/data-model.md)'s.

## The background substrate: report vs destructive, and the enablement gates

Reclamation runs as a recurring job on the codebase's background scheduler (the first scheduled/background-execution substrate, shared with refresh-token cleanup). Its mode is **process-scoped and fail-safe**: `MEDIA_RECLAMATION_MODE` resolves **once** at job creation, and **only the exact string `destructive` enables physical deletion** — any missing, empty, mis-cased, or unknown value resolves to **`report`**, warned but never silent. Changing the mode requires a process restart.

- **Report mode is the default and performs zero physical byte deletion** — including lingering-tombstone recovery. It identifies, accounts, and writes `would_*` audit rows; it deletes nothing.
- **Destructive mode** additionally tombstones and deletes bytes, per-object-transactionally.

Two gates are distinct and must not be conflated:

- **Pre-production Engineering GO** — the controlled-verification certification that the destructive implementation is correct under oracle/failure/recovery/concurrency conditions. It **enables nothing** and changes no default. Granted; recorded in the [controlled-verification report](../development/verification/reclamation-controlled-verification-go.md).
- **Deployment GO** — the later, separate operational decision to actually run destructive where real traffic exists (real-traffic soak + explicit per-environment opt-in). **Not granted.** `MEDIA_RECLAMATION_MODE` remains `report`.

## Concurrency & transaction invariants

Attach and reclaim **serialize on the `MediaObject` row.** The attach path and the collector each take `FOR UPDATE` on the object, so they cannot interleave destructively:

- **Reclaim wins** → it tombstones and commits; the racing attach unblocks, re-reads `status='deleted'` under its own lock, and **refuses the attach** (the object is retained as a tombstone, its bytes reclaimed).
- **Attach wins** → its reference commits first; the collector's under-lock re-check sees the reference and **skips** the object (it stays `ready`).

The load-bearing **global invariant is that no object is ever both tombstoned and referenced.** Each object is its own recovery unit — a per-object transactional tombstone-then-byte-delete with per-object failure isolation (one object's failure never blocks its batch-mates). These invariants were established across M9–M11 and are independently certified by the controlled-verification harness (real-Postgres concurrency, bidirectional registry↔storage oracle, and a runtime tap confirming the selection touches only registry models).

## Responsibility boundary

Media owns byte storage, validation, the registry and its status, read resolution, **physical deletion (exclusively)**, and reclamation. **Features own the domain reference and the decision to add, replace, or remove it** — their only obligation is to signal begin/end; a feature never deletes stored bytes. Cross-feature composition that ends references (for example, deleting a tweet ends its media references and its comments' before the rows are removed) is an **application-level use-case**, above both Media and the individual features — Media then reclaims whatever its own state shows is now unreferenced.

---

> This document owns the Media subsystem's mechanisms and their rationale. Endpoints and error shapes are the [API contract](../api/api-contract.md)'s, field-level schema is [`schema.prisma`](../../server/prisma/schema.prisma)'s, relationship/cascade/indexing rationale is the [data model](../architecture/data-model.md)'s, shared HTTP-hardening and auth guards are [Backend Security](security.md)'s, and the boundary decision is [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md)'s — linked here, never duplicated.
