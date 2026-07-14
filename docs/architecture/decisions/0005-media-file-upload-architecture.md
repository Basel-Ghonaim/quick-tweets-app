# ADR 0005: Media / File Upload Architecture — a Media Platform Module Behind a Storage-Adapter Port

> **Status:** Proposed
> **Date:** 2026-07-14
> **Deciders:** Basel Ghonaim

## Context

The project has upload UI (the design-system `FileInput` `avatar` and `dropzone` variants) but **no** upload/storage mechanism: the server accepts only `express.json({ limit: "16kb" })` (no multipart parser, no object store, no server-side file validation), `User.profileImage` and `Tweet.image` are single nullable reference columns, and the API contract *reserves* media (tweet `image` "always null in v1"; `415 unsupported_media_type` already reserved). The first visible symptom is [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) — register silently discards the selected avatar. A latent per-feature lean exists in `server/src/modules/auth/auth.routes.ts:19` (a *"PATCH /profile → multer"* comment).

This decision was reviewed under [#276](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/276) to define the media boundary **before** the first upload feature, so that features do not each invent their own upload, storage, and validation mechanism. As with [ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md), the **boundary is decided now and the implementation is deliberately deferred**.

The decision spans server transport, storage, multiple features, the API contract, and the data model, with **no single natural document owner** — it meets the [ADR 0002](0002-refined-adr-threshold.md) threshold for a standalone record.

## Decision

Adopt a **Media platform module** that owns all media handling behind a storage-agnostic boundary, governed by the decisions below (all finalized in the #276 design review).

1. **A shared Media platform module owns uploads, storage, validation, serving, and deletion.** It lives at `server/src/modules/media/`, following the standard module anatomy, but is designated a **platform module** (a shared mechanism, not a business feature) — the *Media subsystem*. It is **not** named "Media Service" (`service` is the in-module layer name) and is more than an "Upload Capability" (it also owns the registry, serving, and lifecycle).

2. **Fixed dependency direction.** Feature modules (auth, tweets) depend on the Media subsystem; the Media subsystem depends on **nothing domain-specific** (it never imports feature modules) and reaches storage only through an injected **storage-adapter port**. There is no cycle. The storage adapter lives inside the media module, because the Media subsystem is the only code that touches storage.

3. **Stable internal reference model.** Feature entities persist **only** a stable internal **Media Reference** (a `MediaObject` identity — an internal id plus an opaque public token). Domain rows **never** persist a provider URL or a storage key. The Media registry (`MediaObject`) owns **all** storage-specific detail — `storageKey`, `mime`, `size`, `checksum`, `status`, and timestamps. A storage migration is therefore a media-internal operation that repoints nothing in feature tables.

4. **The subsystem owns the read *endpoint*, not the delivery mechanism.** A stable public endpoint `GET /media/:token` is the contract. The **delivery mechanism is adapter-determined and may vary by backend** without changing the endpoint or its consumers: local disk → **stream**; object storage → **HTTP redirect / signed URL**; CDN → **redirect**. The ADR does not mandate proxy streaming.

5. **Storage-adapter port (byte I/O only).** A domain-ignorant port abstracts the storage backend. Its responsibilities are limited to: store bytes under a key, resolve delivery (stream **or** redirect) for a key, delete a key, test existence, and list keys (for reconciliation). It is **presigned-ready** — able to mint upload/download URLs — so object storage / direct-to-store can be adopted later without changing the media↔feature contract. The adapter performs byte I/O **only**; it does **not** validate content, generate keys, or compute checksums. **Local disk** is the initial backend; the port is injected via the project's factory-plus-interface dependency inversion.

6. **Multi-layered upload validation, magic-byte minimum.** Validation is owned by the media service and is defense-in-depth: **file extension** and **declared MIME** are advisory and never trusted alone; **magic-byte / file-signature inspection is authoritative and mandatory**, and the stored `mime` is derived from the signature; a **type allow-list** and a **size limit** also apply. A declared type that mismatches the signature (disguised content) is rejected. Magic-byte inspection is the minimum bar against disguised malicious uploads.

7. **Integrity metadata (checksum).** `MediaObject` carries a **SHA-256 checksum**, computed by the **media service during ingest** — it is **Media metadata, not a storage-adapter responsibility** — to support integrity verification and safe storage migrations. Under a future direct-to-store/presigned flow, where the server never streams the bytes, the checksum is supplied by the client and **verified** at the finalize step (or taken from the store's own checksum); the media service never trusts an unverified hash.

8. **Lifecycle and centralized deletion/cleanup ownership.** A `MediaObject` moves `pending → ready → deleted`, with `failed` for validation/store failures; a reference is `referenced` or `unreferenced`. Ownership is single-owner per responsibility:
   - **Media owns:** byte storage and validation, the registry and its status, reference→URL resolution, **physical file deletion (exclusively)**, and the **orphan/reconciliation sweep**.
   - **Features own:** domain reference persistence (`User.profileImage`, `TweetMedia`) and the decision to **add, replace, or remove** a reference. Features never call storage deletion.

   Deletion authority is centralized in Media; a feature never deletes stored bytes. A feature's only obligation is to **signal when a reference begins and ends** so Media can reclaim what is no longer needed — the concrete coordination mechanism (an explicit call, transactional bookkeeping, a reference count, or reconciliation) is an **implementation choice, not fixed by this ADR**. Media determines what is still referenced from its own state, **never by reaching into feature schemas** (a boundary leak). A **Grace TTL** (never delete an object younger than the TTL or still `pending`) is **paired with a periodic reconciliation sweeper** that (a) removes `ready`-but-unreferenced objects past grace, (b) removes `pending`/`failed` objects past a longer TTL, and (c) reconciles registry ↔ storage — deleting leaked objects and flagging missing or checksum-mismatched bytes.

9. **Data model — fit-to-cardinality persistence, referencing `MediaObject`.** Multiple tweet images are modeled by a dedicated **`TweetMedia`** entity owned by the tweets domain: it models the **association** between a `Tweet` and a `MediaObject` and carries the tweet-domain **ordering**, holding **only a reference to a `MediaObject`** — never any storage detail (`storageKey`, `mime`, `size`, and `checksum` remain the registry's, per decision 3). A `Tweet` has zero or more ordered `TweetMedia`, and each `TweetMedia` references **exactly one** `MediaObject`; the reference points **from `TweetMedia` to `MediaObject`** (feature → Media, the one allowed direction), and `MediaObject` remains unaware of `TweetMedia`. Deleting a `Tweet` cascade-deletes its `TweetMedia` rows — removing the *references*; the now-unreferenced `MediaObject`s are reclaimed by Media's sweep, never deleted by the tweets domain. The **avatar is the same pattern at cardinality one**: `User` holds a single `MediaObject` reference. The mechanism is unified at the capability layer, not the schema.

This ADR records the boundary and the decisions **only**. It implements nothing — no module, no endpoint, no schema change, no storage backend. **Object storage / presigned direct-to-store** (and its finalize/confirm flow) is deferred; the adapter port is presigned-ready so it can be adopted later without changing the media↔feature contract. The latent per-feature `multer` lean (`auth.routes.ts:19`) is **retired** — features do not implement their own upload/multipart. [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) is the first downstream consumer, resolved by an implementation Work Item owned by this direction, not here.

## Alternatives considered

- **Upload direction — presigned direct-to-object-store (now).** Deferred, not rejected: the better pattern at scale, but premature here — it requires an object store, CORS, a key-minting endpoint, and a post-upload validation trust boundary (client validation cannot be trusted). It is adopted later behind the same adapter port.
- **Upload direction — per-feature multipart (`multer` on each feature route, the `auth.routes.ts:19` lean).** Rejected: it duplicates upload and validation per feature and violates the shared-mechanism boundary.
- **Upload direction — base64-in-JSON.** Rejected: it would force raising the global 16 kB JSON cap (a DoS surface) and bloats payloads and the database.
- **Data model — an array/JSON of URLs inside `Tweet`.** Rejected: it cannot cleanly carry ordering, per-image status, or typed metadata, and replacing the whole array on each edit is poor for deletion/replacement.
- **Data model — a polymorphic shared `Media` entity across avatar and tweets.** Rejected now: a polymorphic owner has no real foreign key (weak relational integrity) for little gain; the unification belongs at the capability layer. Reconsider only if a third media consumer appears.
- **Reference persistence — a provider URL or a raw storage key in domain rows.** Rejected: it couples domain rows to the provider and breaks on migration or CDN introduction; features persist only the internal Media Reference.
- **Read delivery — mandating proxy streaming.** Rejected: the subsystem owns the endpoint, not the delivery mechanism, so delivery can vary by backend.

## Consequences

- The project gains one storage-provider-independent boundary for all media: a single owner for bytes, validation, serving, deletion, and cleanup, while features persist only stable references. Because every read passes through `GET /media/:token`, that endpoint is also the single place at which access control would be enforced if media is ever non-public.
- **Nothing is implemented by this ADR.** Establishing the subsystem later entails (noted, not decided here): the media module and `MediaObject` registry; a dedicated multipart route that lifts the 16 kB cap on that route only; server-side magic-byte validation; the local-disk adapter behind the port; `TweetMedia` and the avatar wiring; the `GET /media/:token` read path; and the scheduled reconciliation sweeper — each a separate Work Item, smallest proven consumer (#256) first.
- The **Media platform document** (`docs/backend/media.md`) is **deferred until the subsystem exists in code**, per the Stable-Core rule ([ADR 0004](0004-stable-core-platform-document-rule.md)); this ADR is its interim decision record.
- **Contract impact (future):** register and tweets grow media-reference fields and a `GET /media/:token` read path, and the reserved `415 unsupported_media_type` is realized. Recorded here as direction only; the [API contract](../../api/api-contract.md) is updated when the capability is implemented (Documentation Strategy §10 co-versioning).
- This ADR is immutable once accepted; its status moves from `Proposed` to `Accepted` on merge. A future change to this direction is a new, superseding ADR.
