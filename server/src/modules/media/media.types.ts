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
