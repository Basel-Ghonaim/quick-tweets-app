/**
 * Media module — reference coordination (ADR 0005 Decision 8).
 *
 * The third feature-facing surface, alongside adoption and ownership. Decision 8
 * splits the responsibility: *"Features own the domain reference and the decision
 * to add, replace, or remove it. A feature's only obligation is to signal when a
 * reference begins and ends."* This is that signal.
 *
 * The feature owns the **trigger**; Media owns the **write**. Both operations
 * accept the caller's transaction, so the signal and the feature's own reference
 * change commit or roll back together and a signal cannot be lost half-way —
 * the shape adoption already proved on the register path.
 *
 * Both signals are **idempotent**, so a retry is safe: beginning twice records
 * one reference, and ending a reference that is already gone is a no-op.
 *
 * Replacing media is not a third operation — Decision 3 mints a *new* object
 * rather than rewriting one, so a replacement is an end followed by a begin.
 */

import { type DbClient } from "../../shared/database/index.js";
import { createMediaRepository } from "./media.repository.js";
import type { IMediaRepository, MediaReferenceInput } from "./media.types.js";

/** Media's published reference-coordination surface (feature-facing). */
export interface IMediaReferences {
  /** Signal that `referrer` now holds a reference to the object. Idempotent. */
  referenceBegan(ref: MediaReferenceInput, client?: DbClient): Promise<void>;
  /** Signal that `referrer`'s reference has ended. Idempotent. */
  referenceEnded(ref: MediaReferenceInput, client?: DbClient): Promise<void>;
  /**
   * Whether anything still references the object, from Media's own state.
   * Reclamation's bulk "find everything unreferenced" query is deliberately not
   * built here — it belongs with the collector, shaped by its real scan.
   */
  isReferenced(mediaId: number, client?: DbClient): Promise<boolean>;
}

/** A referrer tag Media will store but never interpret; it must still identify something. */
const assertReferrer = (referrer: string): void => {
  if (referrer.trim() === "") {
    throw new Error("A media referrer tag must be a non-empty identifier");
  }
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export const createMediaReferences = (
  repo: IMediaRepository = createMediaRepository(),
): IMediaReferences => ({
  referenceBegan: async (ref, client) => {
    assertReferrer(ref.referrer);
    await repo.addReference(ref, client);
  },

  referenceEnded: async (ref, client) => {
    assertReferrer(ref.referrer);
    await repo.removeReference(ref, client);
  },

  isReferenced: async (mediaId, client) => (await repo.countReferences(mediaId, client)) > 0,
});

// A default, ready-to-use instance for feature consumers that do not inject.
export const mediaReferences: IMediaReferences = createMediaReferences();
