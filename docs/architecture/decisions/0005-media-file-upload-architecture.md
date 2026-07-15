# ADR 0005: Media / File Upload Architecture — a Media Platform Module Behind a Storage-Adapter Port

> **Status:** Proposed
> **Date:** 2026-07-14
> **Deciders:** Basel Ghonaim

## Context

The project has upload UI (the design-system `FileInput` `avatar` and `dropzone` variants) but **no** upload/storage mechanism: the server accepts only `express.json({ limit: "16kb" })` (no multipart parser, no object store, no server-side file validation), `User.profileImage` and `Tweet.image` are single nullable reference columns, and the API contract *reserves* media (tweet `image` "always null in v1"; `415 unsupported_media_type` already reserved). The first visible symptom is [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) — register silently discards the selected avatar. A latent per-feature lean exists in `server/src/modules/auth/auth.routes.ts:19` (a *"PATCH /profile → multer"* comment).

This decision was reviewed under [#276](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/276) to define the media boundary **before** the first upload feature, so that features do not each invent their own upload, storage, and validation mechanism. As with [ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md), the **boundary is decided now and the implementation is deliberately deferred**.

The decision spans server transport, storage, multiple features, the API contract, and the data model, with **no single natural document owner** — it meets the [ADR 0002](0002-refined-adr-threshold.md) threshold for a standalone record.

## Decision

Adopt a **Media platform module** that owns all media handling behind a storage-agnostic boundary. **This ADR records architectural boundaries, ownership, contracts, and invariants only; the mechanisms that implement them are deferred to the Consequences below, to the future `docs/backend/media.md`, or to the implementation Work Items.**

1. **A shared Media platform module owns the media mechanism.** Media is a **platform module** — a shared mechanism, not a business feature (the *Media subsystem*) — that owns uploads, storage, validation, serving, deletion, and reclamation. It lives in the server's module layer, designated a platform module rather than a feature.

2. **Fixed dependency direction.** Feature modules (auth, tweets) depend on the Media subsystem; the Media subsystem depends on **nothing domain-specific** (it never imports a feature module) and reaches storage only through an injected **storage-adapter port**. The adapter lives inside Media — the only code that touches storage. There is no cycle.

3. **Stable internal reference model.** Feature entities persist **only** a stable internal **Media Reference** (a `MediaObject` identity); they never persist a provider URL or a storage key. The Media registry owns **all** storage-specific detail — the storage key, the content type, the size, the status, and timestamps. A storage migration is therefore a media-internal operation that repoints nothing in feature tables.

4. **The subsystem owns the read endpoint, not the delivery mechanism.** A stable public endpoint, `GET /media/:token`, is the read contract. The **delivery mechanism is intentionally left open** as an implementation detail — a read may stream, redirect, or be served through a CDN, and may vary by backend; the ADR does not mandate any particular delivery.

5. **The storage-adapter port is domain-ignorant byte I/O.** The port abstracts the storage backend and performs **byte I/O only** — it does **not** validate content, generate keys, or compute integrity metadata (those are Media's). Its operations (store, retrieve, delete, test existence, and enumerate by key) are **illustrative, not exhaustive**, so the port may evolve as a media-internal detail. **Local disk** is the initial backend. The port **must not preclude** a future direct-to-store / presigned extension — but such an extension is introduced by the future object-store ADR, **not here**.

6. **Server-side, content-authoritative validation.** No object becomes servable until it is validated, and validation is **server-side and content-derived**: the file extension and the client-declared type are advisory only; the effective type is derived from the file's own content (for example, by signature inspection); content that does not verify as an allowed type is **rejected**, and the stored type is the verified one. A type allow-list and a size limit also apply. This is the minimum bar against disguised uploads.

7. **Lifecycle, deletion, and reclamation ownership.**
   - **Media owns** byte storage, validation, the registry and its status, read resolution, **physical deletion (exclusively)**, and the **reclamation** of abandoned and unreferenced objects. A feature never deletes stored bytes.
   - **Features own** the domain reference and the decision to **add, replace, or remove** it. A feature's only obligation is to **signal when a reference begins and ends**; the **coordination mechanism is intentionally left open** (an explicit call, transactional bookkeeping, a reference count, or reconciliation are all admissible). Media determines what is still referenced from **its own state**, never by reaching into feature schemas (a boundary leak).
   - **Invariants:** an object is never reclaimed before it has had the opportunity to be referenced (a just-created object is not destroyed as an orphan), and an object is not servable until it has passed validation.

8. **Data model — fit-to-cardinality, reference-only.** Multiple tweet images are modeled by a dedicated tweets-domain association (`TweetMedia`) that carries the tweet-domain **ordering** and holds **only a reference** to a `MediaObject` — never storage detail. A `Tweet` has zero or more ordered media; the **avatar is a single reference** on the `User`. The reference points **from the feature to Media** (the one allowed direction), and a `MediaObject` is unaware of its referrers. Removing a `Tweet` removes its media **references**; Media then reclaims any now-unreferenced objects — the tweets domain never deletes bytes.

This ADR records boundaries only and **implements nothing** — no module, no endpoint, no schema change, no storage backend. Object storage / presigned direct-to-store is deferred (the port must not preclude it). The latent per-feature `multer` lean (`auth.routes.ts:19`) is **retired** — features do not implement their own upload. [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) is the first downstream consumer, resolved by an implementation Work Item, not here.

## Alternatives considered

- **Upload direction — presigned direct-to-object-store (now).** Deferred, not rejected: the better pattern at scale, but premature here — it requires an object store, CORS, a key-minting endpoint, and a post-upload validation trust boundary (client validation cannot be trusted). It is adopted later behind the same adapter port.
- **Upload direction — per-feature multipart (`multer` on each feature route, the `auth.routes.ts:19` lean).** Rejected: it duplicates upload and validation per feature and violates the shared-mechanism boundary.
- **Upload direction — base64-in-JSON.** Rejected: it would force raising the global 16 kB JSON cap (a DoS surface) and bloats payloads and the database.
- **Data model — an array/JSON of URLs inside `Tweet`.** Rejected: it cannot cleanly carry ordering, per-image status, or typed metadata, and replacing the whole array on each edit is poor for deletion/replacement.
- **Data model — a polymorphic shared `Media` entity across avatar and tweets.** Rejected now: a polymorphic owner has no real foreign key (weak relational integrity) for little gain; the unification belongs at the capability layer. Reconsider only if a third media consumer appears.
- **Reference persistence — a provider URL or a raw storage key in domain rows.** Rejected: it couples domain rows to the provider and breaks on migration or CDN introduction; features persist only the internal Media Reference.
- **Read delivery — mandating a specific delivery mechanism (e.g. proxy streaming).** Rejected: the subsystem owns the endpoint, not the delivery mechanism, so delivery can vary by backend.

## Consequences

- The project gains one storage-provider-independent boundary for all media: a single owner for bytes, validation, serving, deletion, and reclamation, while features persist only stable references.
- **Nothing is implemented by this ADR.** The following are deferred to the implementation Work Items and the future `docs/backend/media.md` (noted, not decided here): the concrete `MediaObject` states and registry schema; the `TweetMedia` schema and the mechanism by which removing a tweet removes its references; the module's internal anatomy and the interface features consume; the **read delivery mechanism** (stream / redirect / CDN); the **validation technique** (for example, signature inspection), the allow-list, and the size threshold; any **integrity mechanism** (for example, a content checksum) Media keeps for corruption detection and migration verification; the **reclamation mechanism** (reference count / bookkeeping / reconciliation, its grace window, and its schedule); and the dedicated multipart route that lifts the 16 kB cap on that route only. The smallest proven consumer ([#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256)) comes first.
- The **Media platform document** (`docs/backend/media.md`) is **deferred until the subsystem exists in code**, per the Stable-Core rule ([ADR 0004](0004-stable-core-platform-document-rule.md)); this ADR is its interim decision record.
- **Contract impact (future):** register and tweets grow media-reference fields and a `GET /media/:token` read path, and the reserved `415 unsupported_media_type` is realized. Recorded here as direction only; the [API contract](../../api/api-contract.md) is updated when the capability is implemented (Documentation Strategy §10 co-versioning).
- This ADR is immutable once accepted; its status moves from `Proposed` to `Accepted` on merge. A future change to this direction is a new, superseding ADR.
