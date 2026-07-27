/**
 * Media module — ownership authority (ADR 0005 Decision 5).
 *
 * The second feature-facing surface, alongside adoption. Two capabilities:
 * - `authorizeAttach` — Media authorizes a feature's attach against the object's
 *   recorded uploader, so no principal can attach another's media. Unlike
 *   adoption (a one-time ownership *fill*), this is a read-only **check**: an
 *   authenticated upload already records its uploader.
 * - `usageFor` — a principal's aggregate footprint, computed from the registry.
 *   Only Media can compute it, so a quota would be enforceable at one owner; the
 *   quota policy itself is deliberately not built here.
 */

import { type DbClient } from "../../shared/database/index.js";
import { MediaAttachError } from "./media.errors.js";
import { createMediaRepository } from "./media.repository.js";
import { mediaToken } from "./media.tokens.js";
import type { IMediaRepository, MediaToken, MediaUsage } from "./media.types.js";

/** What a feature presents to attach media it owns. */
export interface AttachMediaInput {
  /** The object's public read token (what the client submits). */
  token: string;
  /** The authenticated principal doing the attaching. */
  ownerId: number;
}

/** An authorized attach: the reference the feature persists, the read token, and
 *  the object's authoritative metadata for the consumer's own policy check. */
export interface AttachableMedia {
  referenceId: number;
  token: MediaToken;
  /** Content-derived type (e.g. `image/png`) — Media's authoritative fact. */
  contentType: string;
  /** Byte size — Media's authoritative fact. */
  size: number;
}

/** Media's published ownership surface (feature-facing). */
export interface IMediaOwnership {
  /**
   * Authorize `ownerId` attaching the object behind `token`. Resolves to the
   * numeric reference the feature persists; throws `MediaAttachError` otherwise.
   * Locks the object `FOR UPDATE` for the caller's transaction, so the attach
   * serializes against reclamation (M11).
   */
  authorizeAttach(input: AttachMediaInput, client?: DbClient): Promise<AttachableMedia>;
  /**
   * Authorize a **batch** of attaches at once, locking every object `FOR UPDATE`
   * in ascending-id order (deadlock-free) and re-checking ownership + servability
   * under the lock. Ordered attaches (a tweet's media set) use this so the whole
   * set is authorized atomically and serialized against reclamation. Returns the
   * references in **input order**, so array position is preserved.
   */
  authorizeAttachMany(
    inputs: AttachMediaInput[],
    client?: DbClient,
  ): Promise<AttachableMedia[]>;
  /** A principal's aggregate media usage — accounting only, nothing enforced. */
  usageFor(ownerId: number, client?: DbClient): Promise<MediaUsage>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createMediaOwnership = (
  repo: IMediaRepository = createMediaRepository(),
): IMediaOwnership => {
  const authorizeAttachMany: IMediaOwnership["authorizeAttachMany"] = async (inputs, client) => {
    // Parse every token first — a malformed one is notAttachable before any
    // lookup (no token-existence oracle from a lock either).
    const parsed = inputs.map(({ token, ownerId }) => {
      let value: MediaToken;
      try {
        value = mediaToken(token);
      } catch {
        throw MediaAttachError.notAttachable();
      }
      return { token: value, ownerId };
    });

    // Lock + fetch every object under one `FOR UPDATE` (ascending id), then
    // validate each under the lock: owned by the attaching principal AND
    // servable. A wrong owner, an unadopted grant object (null uploaderId), an
    // unknown token, or a tombstone a concurrent reclaimer set all collapse to
    // one opaque refusal.
    const locked = await repo.lockAndFetchByTokens(
      parsed.map((p) => p.token),
      client,
    );
    const byToken = new Map(locked.map((row) => [row.token, row]));

    return parsed.map((p) => {
      const row = byToken.get(p.token);
      if (row === undefined || row.uploaderId !== p.ownerId || row.status !== "ready") {
        throw MediaAttachError.notAttachable();
      }
      // The authoritative metadata travels with the reference, under the same
      // lock, so a consumer can evaluate its own policy without re-reading bytes
      // and without a validation↔attach TOCTOU (ADR 0008 Decision 6).
      return { referenceId: row.id, token: row.token, contentType: row.contentType, size: row.size };
    });
  };

  return {
    authorizeAttach: async (input, client) => (await authorizeAttachMany([input], client))[0]!,
    authorizeAttachMany,
    usageFor: (ownerId, client) => repo.usageFor(ownerId, client),
  };
};

// A default, ready-to-use instance for feature consumers that do not inject.
export const mediaOwnership: IMediaOwnership = createMediaOwnership();
