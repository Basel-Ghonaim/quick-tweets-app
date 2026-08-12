/**
 * Media module — reference resolution (ADR 0005 Decision 3).
 *
 * Turns the internal numeric references features persist back into the opaque
 * public read tokens `GET /media/:token` serves. Media owns identity, so this
 * mapping is the only sanctioned way to cross it: a feature must never copy a
 * token into its own table, where it would drift from the registry.
 *
 * Resolution is **batched** because the natural caller is a feed page — many
 * tweets, each with several references. Resolving one at a time would issue a
 * query per object.
 *
 * Only **servable** objects resolve. An unresolvable reference is simply absent
 * from the result, so a caller can never hand a client a token that would fail
 * to read. Callers should treat an absence as a divergence worth logging: a
 * referenced object should never be unservable, since reclamation only removes
 * what nothing references.
 */

import { type DbClient } from "../../shared/database/index.js";
import { createMediaRepository } from "./media.repository.js";
import type { IMediaRepository, MediaToken } from "./media.types.js";

/** Media's published resolution surface (feature-facing). */
export interface IMediaResolution {
  /** Resolve many references at once, keyed by reference; unservable ones are absent. */
  resolveTokens(
    referenceIds: number[],
    client?: DbClient,
  ): Promise<Map<number, MediaToken>>;
  /** Resolve a single reference — `null` when it does not resolve to a servable object. */
  resolveToken(referenceId: number, client?: DbClient): Promise<MediaToken | null>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createMediaResolution = (
  repo: IMediaRepository = createMediaRepository(),
): IMediaResolution => {
  const resolveTokens: IMediaResolution["resolveTokens"] = (referenceIds, client) =>
    repo.findTokensByIds(referenceIds, client);

  return {
    resolveTokens,
    // Delegates rather than querying separately, so there is one resolution path.
    resolveToken: async (referenceId, client) =>
      (await resolveTokens([referenceId], client)).get(referenceId) ?? null,
  };
};

// A default, ready-to-use instance for feature consumers that do not inject.
export const mediaResolution: IMediaResolution = createMediaResolution();
