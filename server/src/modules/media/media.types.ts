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
 * Lifecycle states the registry models at this stage. `ready` is the only
 * servable state; `deleted` is a tombstone whose producer is the reclamation
 * Work Item — no path sets it yet. (A pre-servable `pending` state is deferred
 * to the ingest boundary if it adopts write-before-validate.)
 */
export type MediaStatus = "ready" | "deleted";

/**
 * A registry entry — Media's authoritative record of one stored object.
 * Internal to the module: features never receive it (they hold only a
 * reference/token), because it carries storage detail the boundary must not leak.
 */
export interface MediaObject {
  /** Internal reference — the numeric identity feature tables point at (via a real FK, added by their own Work Items). */
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
 * The registry's data-access contract. Internal to Media (never published) —
 * consumed by Media's own boundaries (ingest, read), never by features. It
 * exposes no path that mutates a stored row: immutability-once-ready is encoded
 * by the *absence* of a mutator (replacing media mints a new object).
 */
export interface IMediaRepository {
  /** Register a newly-stored, validated object; mints its token and returns the entry. */
  create(input: NewMediaObject): Promise<MediaObject>;
  /** Resolve a public token to its registry entry, or `null` if none exists. */
  findByToken(token: MediaToken): Promise<MediaObject | null>;
  /** How many objects a grant has ingested (per-grant bound enforcement). */
  countByGrant(grantId: string): Promise<number>;
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

/** The ingest orchestration contract — transport-agnostic (a `Readable`, never HTTP). */
export interface IMediaService {
  ingest(file: Readable, evidence: IngestEvidence): Promise<IngestResult>;
}
