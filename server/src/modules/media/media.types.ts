/**
 * Media module — core domain types and the storage-adapter port.
 *
 * Purpose:
 * - Defines `StorageKey`, the branded identifier the storage layer speaks in.
 * - Defines `StorageAdapter`, the domain-ignorant, HTTP-agnostic byte-I/O port.
 *
 * Boundary (ADR 0005 — Decisions 2 & 6):
 * - Media is a *platform* module: feature modules depend on it through the
 *   published interface (`index.ts`); it imports no feature module.
 * - The port deals only in a `StorageKey` and a byte `Readable` — never in
 *   HTTP, Express/Multer, provider URLs, or filesystem paths. Those belong to
 *   an adapter (the only code that touches storage) or to a higher layer.
 * - The shape is deliberately byte-level so an alternative backend (e.g. a
 *   presigned / object-store adapter) can be added later without changing it.
 */

import type { Readable } from "node:stream";

import type { DbClient } from "../../shared/database/index.js";

declare const brand: unique symbol;

/** Nominal-typing helper: a `T` tagged with a compile-time-only brand `B`. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/**
 * Storage-facing identifier for a single stored object. Constructed only via
 * `storageKey()` (which enforces a traversal-safe format). Features never hold
 * a `StorageKey` — they hold a Media Reference (introduced with the registry,
 * M2); the registry owns the mapping between the two.
 */
export type StorageKey = Brand<string, "StorageKey">;

/**
 * The storage-adapter port: backend-agnostic byte I/O for a `StorageKey`.
 * Implementations are the *only* code permitted to touch physical storage.
 *
 * Responsibility: a `StorageAdapter` persists and retrieves bytes for a
 * `StorageKey` — nothing more. It never generates identifiers, validates
 * content, owns metadata, or implements business rules. Those responsibilities
 * belong to higher Media-layer components.
 */
export interface StorageAdapter {
  /** Persist the byte stream `data` as the object at `key`. */
  save(key: StorageKey, data: Readable): Promise<void>;
  /** Open a readable stream over the bytes stored at `key`. */
  createReadStream(key: StorageKey): Promise<Readable>;
  /** Whether an object is currently stored at `key`. */
  exists(key: StorageKey): Promise<boolean>;
  /** Remove the object at `key`; a no-op if already absent (idempotent). */
  delete(key: StorageKey): Promise<void>;
  /**
   * Enumerate every stored object's key. Illustrative in ADR 0005 Decision 6
   * ("enumerate by key"), realized here for reclamation's divergence sweep (M11):
   * comparing stored bytes against the registry surfaces **orphan bytes** (a key
   * with no `ready` row). Keys not in the module's storage-key format are skipped
   * — they were never Media objects. May be costly on a large store, so the
   * caller (the reclaimer) bounds how often it runs.
   */
  enumerate(): Promise<StorageKey[]>;
}

// ─── Registry: identity & the MediaObject record (ADR 0005 — Decision 3) ──────

/**
 * The opaque, non-enumerable public identifier for a stored object — the value
 * in `GET /media/:token`. Features and the API hold this; it is deliberately
 * distinct from the internal reference (the registry row's numeric `id`) and
 * from the `StorageKey`. Minted via `mintToken()`, parsed via `mediaToken()`.
 */
export type MediaToken = Brand<string, "MediaToken">;

/**
 * Lifecycle states the registry models. `ready` is the only servable state;
 * `pending` is a modeled not-yet-servable state with no producer yet
 * (write-after-validate ingest never persists it — the read boundary refuses
 * it); `deleted` is a tombstone whose producer is the reclamation Work Item.
 */
export type MediaStatus = "pending" | "ready" | "deleted";

/**
 * A registry entry — Media's authoritative record of one stored object.
 * Internal to the module: features never receive it (they hold only a
 * reference/token), because it carries storage detail the boundary must not leak.
 */
export interface MediaObject {
  /** Internal reference — the numeric identity feature tables point at as a bare
   * scalar (no DB foreign key: Decision 9 keeps MediaObject unaware of its referrers). */
  id: number;
  token: MediaToken;
  storageKey: StorageKey;
  contentType: string;
  size: number;
  status: MediaStatus;
  /** Authenticated uploader / adopted owner; `null` while under grant provenance. */
  uploaderId: number | null;
  /** Pre-auth provenance: the upload grant that ingested the object (ADR 0007). */
  grantId: string | null;
  grantExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Who an ingested object is accountable to (ADR 0005 Decision 5 / ADR 0007):
 * an authenticated uploader, or — for pre-auth ingest — the minting grant.
 * Exactly one form is present at creation; adoption later fills the owner.
 */
export type MediaProvenance =
  | { uploaderId: number }
  | { grantId: string; grantExpiresAt: Date };

/** Fields required to register a newly-stored object; the token is minted by the registry. */
export interface NewMediaObject {
  storageKey: StorageKey;
  contentType: string;
  size: number;
  provenance: MediaProvenance;
}

/**
 * A registry row locked for an attach decision — only the fields the attach
 * guard needs. Returned by `lockAndFetchByTokens`, which takes the row lock that
 * serializes an attach against reclamation (M11).
 */
export interface LockedMediaObject {
  id: number;
  token: MediaToken;
  uploaderId: number | null;
  status: MediaStatus;
  /** Authoritative, content-derived type — the fact a consumer's policy evaluates. */
  contentType: string;
  /** Authoritative byte size — the fact a consumer's policy evaluates. */
  size: number;
}

/**
 * The registry's data-access contract. Internal to Media (never published) —
 * consumed by Media's own boundaries (ingest, read, adoption), never by features.
 * Content immutability-once-ready holds: no path rewrites a stored object's bytes,
 * type, size, or token. The one admissible mutation is adoption's one-time
 * *ownership* fill (`adoptById`) — a conditional write that turns grant provenance
 * into an owner (ADR 0007), never a content change.
 *
 * Read/adopt methods take an optional `client` so they can run inside a caller's
 * interactive transaction (register-with-avatar is atomic across auth + media).
 */
export interface IMediaRepository {
  /** Register a newly-stored, validated object; mints its token and returns the entry. */
  create(input: NewMediaObject): Promise<MediaObject>;
  /** Resolve a public token to its registry entry, or `null` if none exists. */
  findByToken(token: MediaToken, client?: DbClient): Promise<MediaObject | null>;
  /** How many objects a grant has ingested (per-grant bound enforcement). */
  countByGrant(grantId: string): Promise<number>;
  /**
   * Atomically adopt a grant-provenance object onto `ownerId` — the concurrency
   * guard for adoption. Sets `uploaderId` only where it is still `null` AND the
   * recorded `grantId` equals `expectedGrantId`; returns `true` iff exactly one
   * row changed (a replay or a second concurrent adoption changes none).
   */
  adoptById(
    referenceId: number,
    ownerId: number,
    expectedGrantId: string,
    client?: DbClient,
  ): Promise<boolean>;
  /**
   * Resolve numeric references to their public read tokens, keyed by reference.
   * **Servable objects only** — a non-`ready` reference is simply absent from the
   * result, so a caller can never surface a token that would fail to read.
   * Batched because a feed page resolves many references at once.
   */
  findTokensByIds(
    referenceIds: number[],
    client?: DbClient,
  ): Promise<Map<number, MediaToken>>;
  /** A principal's aggregate usage over owned, servable objects (accounting only). */
  usageFor(ownerId: number, client?: DbClient): Promise<MediaUsage>;
  /**
   * Record that `referrer` holds a reference to `mediaId`. Idempotent: a repeat
   * for the same pair changes nothing (the replay guard for a retried signal).
   */
  addReference(ref: MediaReferenceInput, client?: DbClient): Promise<void>;
  /** Drop `referrer`'s reference to `mediaId`. Idempotent: a missing row is a no-op. */
  removeReference(ref: MediaReferenceInput, client?: DbClient): Promise<void>;
  /** How many referrers currently hold `mediaId` — referenced-ness from Media's own state. */
  countReferences(mediaId: number, client?: DbClient): Promise<number>;
  /**
   * Lock the objects behind `tokens` `FOR UPDATE` and return their current
   * provenance + status, **ordered by id ascending** — so two concurrent
   * multi-object attaches acquire the shared locks in the same order and cannot
   * deadlock.
   *
   * The attach path calls this so an attach serializes against reclamation (M11):
   * once a row is locked here, a concurrent reclaimer's own `FOR UPDATE` on it
   * blocks until the attach commits (and vice-versa), and the returned `status`
   * is re-checked under the lock — a tombstone a reclaimer set first is then seen
   * and the attach refused. Only meaningful inside the caller's transaction;
   * outside one the lock is a harmless autocommit no-op.
   */
  lockAndFetchByTokens(
    tokens: string[],
    client?: DbClient,
  ): Promise<LockedMediaObject[]>;
}

/**
 * One reference relationship, as Media records it (ADR 0005 Decision 8).
 *
 * `referrer` is deliberately **opaque**: the feature composes it, Media stores
 * and matches it, and never parses it. Media therefore learns *that* an object
 * is referenced, never *what* refers to it — which is how Decision 9's "a
 * MediaObject is unaware of its referrers" survives Media keeping this state.
 */
export interface MediaReferenceInput {
  /** The numeric Media Reference the feature persists. */
  mediaId: number;
  /** Opaque referrer tag, unique per referring slot. Never interpreted by Media. */
  referrer: string;
}

/**
 * A principal's media footprint, computed from the registry (ADR 0005 Decision 5).
 * Only Media can compute it, so a quota would be enforceable at one owner — the
 * quota policy itself is deliberately not built.
 */
export interface MediaUsage {
  objectCount: number;
  totalBytes: number;
}

// ─── Ingest boundary (ADR 0005 Decision 5 / ADR 0007) ────────────────────────

/** The two admissible authorization evidence types fixed by ADR 0007. */
export type IngestEvidence =
  | { kind: "user"; userId: number }
  | { kind: "grant"; grant: string };

/** What ingest returns to the client — the reference token plus display facts. */
export interface IngestResult {
  token: MediaToken;
  contentType: string;
  size: number;
}

/**
 * A servable object opened for reading: the header facts plus the byte stream.
 * Deliberately narrow — it carries no storage detail (the storage key stays
 * inside the module; the read boundary only needs the type, size, and bytes).
 */
export interface MediaReadResult {
  contentType: string;
  size: number;
  stream: Readable;
}

/** Media's orchestration contract — transport-agnostic (a `Readable`, never HTTP). */
export interface IMediaService {
  ingest(file: Readable, evidence: IngestEvidence): Promise<IngestResult>;
  /** Resolve a public token to a servable object; the access-control seam (ADR 0005 D4). */
  read(token: MediaToken): Promise<MediaReadResult>;
}
