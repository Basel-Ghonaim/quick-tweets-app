/**
 * Media module — adoption (ADR 0007: "attach with grant evidence").
 *
 * The first **feature-facing** Media operation: a feature (the register flow)
 * turns a pre-auth, grant-provenance object into one owned by a just-created
 * user. It is published through `index.ts` (ADR 0005 Decision 2) — features
 * depend on Media only through the published interface, never on the registry.
 *
 * Ownership of the boundary (M6 pinned decision): **the caller owns the
 * transaction / unit-of-work; Media owns and enforces the adoption semantics.**
 * `adopt` therefore requires the caller's transaction `client` and runs entirely
 * within it, so create-user + adopt commit or roll back together.
 *
 * Guards (all mandatory):
 * - **grant verification** — the presented grant must be a live upload grant;
 * - **grant-binding** — its identity must equal the object's recorded `grantId`;
 * - **adoptability** — the object must be grant-provenance and currently unadopted;
 * - **conditional atomic write** — the ownership fill succeeds for exactly one
 *   caller; a replay or a concurrent second adoption fails (a grant is spent by
 *   adoption exactly once, with no new lifecycle state).
 *
 * Errors are deliberately coarse: a bad grant, an unknown reference, a
 * binding mismatch, or a non-grant object all surface as one opaque
 * `invalid_evidence` — the caller never learns whether a token exists.
 */

import { type DbClient } from "../../shared/database/index.js";
import { MediaAdoptionError } from "./media.errors.js";
import { verifyUploadGrant } from "./media.grants.js";
import { createMediaRepository } from "./media.repository.js";
import { mediaToken } from "./media.tokens.js";
import type { IMediaRepository, MediaToken } from "./media.types.js";

/** The evidence a register flow presents to adopt a pre-auth avatar upload. */
export interface AdoptMediaInput {
  /** The object's public read token (returned by `POST /media`). */
  token: string;
  /** The upload grant that ingested the object (ADR 0007 grant evidence). */
  grant: string;
  /** The just-created user that will own the object. */
  ownerId: number;
}

/** The result of a successful adoption. */
export interface AdoptedMedia {
  /** The internal numeric reference the feature persists (e.g. `User.avatarMediaId`). */
  referenceId: number;
  /** The public read token, for the API to hand back as a `/media/:token` URL. */
  token: MediaToken;
}

/** Media's published adoption surface (feature-facing). */
export interface IMediaAdoption {
  /**
   * Adopt a grant-provenance object onto `ownerId`, within the caller's
   * transaction `client` (required — adoption is always part of an atomic
   * feature operation). Throws `MediaAdoptionError` on any guard failure, which
   * rolls the caller's transaction back.
   */
  adopt(input: AdoptMediaInput, client: DbClient): Promise<AdoptedMedia>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createMediaAdoption = (
  repo: IMediaRepository = createMediaRepository(),
): IMediaAdoption => ({
  adopt: async (input, client) => {
    // 1. The grant must verify as a live upload grant.
    let grantId: string;
    try {
      grantId = verifyUploadGrant(input.grant).id;
    } catch {
      throw MediaAdoptionError.invalidEvidence();
    }

    // 2. The reference token must be well-formed and resolve to an object.
    let token: MediaToken;
    try {
      token = mediaToken(input.token);
    } catch {
      throw MediaAdoptionError.invalidEvidence();
    }
    const object = await repo.findByToken(token, client);

    // 3. Grant-binding + provenance: the object must exist and record *this*
    //    grant (a null grantId — an authenticated upload — never matches). All
    //    of these collapse to one opaque failure (no token-existence oracle).
    if (object === null || object.grantId !== grantId) {
      throw MediaAdoptionError.invalidEvidence();
    }

    // 4. Adoptability: an already-owned object is a conflict for the grant holder.
    if (object.uploaderId !== null) {
      throw MediaAdoptionError.alreadyAdopted();
    }

    // 5. Conditional atomic write — the authoritative guard. If a concurrent
    //    caller adopted between the read above and here, this changes 0 rows.
    const adopted = await repo.adoptById(object.id, input.ownerId, grantId, client);
    if (!adopted) {
      throw MediaAdoptionError.alreadyAdopted();
    }

    return { referenceId: object.id, token: object.token };
  },
});

// A default, ready-to-use instance for feature consumers that do not inject.
export const mediaAdoption: IMediaAdoption = createMediaAdoption();
