/**
 * Password Reset — the module's internal types.
 *
 * A momentary authorization to change one password (ADR 0016 Decision 1),
 * entirely inside Auth. Copied from Channel Verification's construction, not
 * shared with it — a different actor (unauthenticated), a different subject
 * (the account, not an endpoint), and a different lifetime (spent on first
 * successful use, not standing).
 */

import type { DbClient } from "../../../shared/database/index.js";

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

/**
 * A reset code in its plaintext form, minted or validated — never the digest
 * that is stored. Branded so an unvalidated string cannot reach a comparison
 * by accident.
 */
export type ResetCode = Brand<string, "ResetCode">;

/**
 * The shape a code is drawn from and checked against. Supplied by the caller
 * rather than fixed here, exactly as Channel Verification's own format is:
 * how long a code is and which characters it uses is configuration (D1), and
 * freezing it in this module would make changing it a change to the mechanism.
 */
export interface ResetCodeFormat {
  readonly alphabet: string;
  readonly length: number;
}

/** A credential row, without its digest — the digest never travels on this shape. */
export interface PasswordResetChallenge {
  id: number;
  userId: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * The one shape that carries the stored digest, returned only where a caller
 * must compare against it.
 */
export interface PasswordResetChallengeWithHash extends PasswordResetChallenge {
  codeHash: string;
}

export interface CreateChallengeInput {
  userId: number;
  codeHash: string;
  expiresAt: Date;
}

/**
 * The module's only data-access path. Every method accepts an optional client
 * so a caller can run it inside an interactive transaction; without one it
 * uses the repository's own.
 */
export interface IPasswordResetRepository {
  /**
   * The most recent row for a user, regardless of its state — what the
   * request flow's cooldown check reads. `null` means no row has ever
   * existed for this user.
   */
  findMostRecentForUser(userId: number, client?: DbClient): Promise<PasswordResetChallenge | null>;

  /**
   * Take a per-user advisory lock, so two requests for the same account
   * serialise and the cooldown can be read under it rather than around it.
   * Scoped to the transaction; nothing to release explicitly.
   */
  lockUser(userId: number, client: DbClient): Promise<void>;

  createChallenge(input: CreateChallengeInput, client?: DbClient): Promise<PasswordResetChallenge>;

  /** The row whose digest matches, if any — confirm/apply resolve the account from this. */
  findByCodeHash(codeHash: string, client?: DbClient): Promise<PasswordResetChallengeWithHash | null>;

  /**
   * Marks one row used **only while it is still unused**, reporting how many
   * rows matched. Conditional rather than unconditional so single use is
   * decided by the write itself: two callers racing on the same code cannot
   * both succeed.
   */
  markUsed(id: number, usedAt: Date, client?: DbClient): Promise<number>;

  /**
   * Removes rows used or expired before `cutoff`; returns how many went.
   * Hygiene only — usable/expired/spent is derived, so nothing depends on
   * this having run.
   */
  deleteBefore(cutoff: Date, client?: DbClient): Promise<number>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface RequestResetInput {
  email: string;
}

/**
 * What `request` hands back. `dispatchSend` is present only when a code was
 * actually minted — absent for an unknown address AND for a known address
 * still inside its cooldown, so the two are indistinguishable from outside
 * the service (I5). Calling it triggers the mail send; the HTTP layer decides
 * when (after the response is flushed — D3), never this module.
 */
export interface RequestResetOutcome {
  dispatchSend?: () => Promise<void>;
}

export interface ConfirmResetInput {
  code: string;
}

export interface ApplyResetInput {
  code: string;
  /** Already validated against registration's strength rules by the HTTP boundary; hashed here, not before. */
  newPassword: string;
}

export interface IPasswordResetService {
  /**
   * Mints and persists a code if, and only if, the address belongs to an
   * account that is not currently inside its resend cooldown. Every other
   * case — unknown address, cooling-down address — does nothing observable,
   * indistinguishably (I5). Always takes at least the configured response
   * floor before resolving, regardless of which branch ran.
   */
  request(input: RequestResetInput): Promise<RequestResetOutcome>;

  /** Read-only: reports whether `code` currently identifies a usable row. Consumes nothing. */
  confirm(input: ConfirmResetInput): Promise<void>;

  /**
   * Re-validates `code` and, only if it is still usable, atomically marks it
   * used, hashes and writes the new password, and revokes every session for
   * the account (D2 / I7). One transaction: a code that was valid a moment
   * before must never be spent without the password actually changing.
   */
  apply(input: ApplyResetInput): Promise<{ userId: number }>;
}
