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

/** An authorized attach: the reference the feature persists, plus the read token. */
export interface AttachableMedia {
  referenceId: number;
  token: MediaToken;
}

/** Media's published ownership surface (feature-facing). */
export interface IMediaOwnership {
  /**
   * Authorize `ownerId` attaching the object behind `token`. Resolves to the
   * numeric reference the feature persists; throws `MediaAttachError` otherwise.
   */
  authorizeAttach(input: AttachMediaInput, client?: DbClient): Promise<AttachableMedia>;
  /** A principal's aggregate media usage — accounting only, nothing enforced. */
  usageFor(ownerId: number, client?: DbClient): Promise<MediaUsage>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createMediaOwnership = (
  repo: IMediaRepository = createMediaRepository(),
): IMediaOwnership => ({
  authorizeAttach: async ({ token, ownerId }, client) => {
    let parsed: MediaToken;
    try {
      parsed = mediaToken(token);
    } catch {
      throw MediaAttachError.notAttachable();
    }

    const object = await repo.findByToken(parsed, client);

    // Attachable = owned by this principal AND servable. A null uploaderId (an
    // unadopted, grant-provenance object) never matches, so it must be adopted
    // first. All refusals collapse to one opaque error — no enumeration oracle.
    if (object === null || object.uploaderId !== ownerId || object.status !== "ready") {
      throw MediaAttachError.notAttachable();
    }

    return { referenceId: object.id, token: object.token };
  },

  usageFor: (ownerId, client) => repo.usageFor(ownerId, client),
});

// A default, ready-to-use instance for feature consumers that do not inject.
export const mediaOwnership: IMediaOwnership = createMediaOwnership();
