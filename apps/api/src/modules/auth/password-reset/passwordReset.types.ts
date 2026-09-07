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
  /** The address the code was sent to, frozen at mint. What a completed reset proves. */
  endpoint: string;
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
  endpoint: string;
  expiresAt: Date;
}

// ─── Session ─────────────────────────────────────────────────────────────────

/** Where a reader stands. `request` is also what an absent session answers. */
export type ResetStep = "request" | "code" | "password";

/**
 * Reporting that a code delivered to `endpoint` was produced by someone who,
 * in producing it, became the holder of `userId`.
 *
 * Named as this capability's own need rather than as another module's type: it
 * depends on this shape, never on whoever satisfies it, so it holds no import
 * of the subsystem that owns the fact. The composition root supplies one
 * (`app.ts`), the same arrangement the onboarding journey uses.
 *
 * It reports evidence and never reports that an endpoint is proven — deciding
 * that is the owning capability's, not this one's.
 */
export type ProveChannel = (userId: number, endpoint: string) => Promise<void>;

/** A position, without the digest that addresses it. */
export interface PasswordResetSession {
  id: number;
  maskedEndpoint: string;
  challengeId: number | null;
  /** The account this position was opened for, or `null` for an address none holds. */
  userId: number | null;
  lastAskedAt: Date;
  resendsUsed: number;
  expiresAt: Date;
}

export interface CreateSessionInput {
  tokenHash: string;
  maskedEndpoint: string;
  userId: number | null;
  expiresAt: Date;
}

/** What the position read answers. Nothing else about the address travels. */
export interface ResetPosition {
  step: ResetStep;
  maskedEndpoint: string | null;
  /**
   * Seconds until this position may ask for another code, `0` when it may now.
   * Seeded when the position is opened, so it reports that position's own
   * history and never whether an account holds the address.
   */
  retryAfterSeconds: number;
  /** False once the position has spent its asks, and where there is no position. */
  canResend: boolean;
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

  /** The row a session points at, so `apply` never takes a code from a caller. */
  findChallengeById(id: number, client?: DbClient): Promise<PasswordResetChallenge | null>;

  createSession(input: CreateSessionInput, client?: DbClient): Promise<void>;

  findSessionByTokenHash(tokenHash: string, client?: DbClient): Promise<PasswordResetSession | null>;

  /** Supersession: a second request from one browser ends the first outright. */
  deleteSessionByTokenHash(tokenHash: string, client?: DbClient): Promise<void>;

  /**
   * Binds a confirmed credential to a position, and is the whole of the step
   * derivation. Refuses if that credential already belongs to another session.
   */
  bindSessionToChallenge(id: number, challengeId: number, client?: DbClient): Promise<void>;

  /** Removes sessions expired before `cutoff`; returns how many went. */
  deleteSessionsBefore(cutoff: Date, client?: DbClient): Promise<number>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface RequestResetInput {
  email: string;
  /** The caller's current position, if any. A new request supersedes it. */
  sessionKey?: string;
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
  /**
   * The key addressing the position this request opened. Issued for every
   * address alike — issuing it only for a real account would answer, by its
   * presence, the question the capability refuses to answer.
   */
  sessionKey: string;
}

export interface ConfirmResetInput {
  code: string;
  /** Without a position there is nowhere for a confirmed code to be held. */
  sessionKey?: string;
}

export interface ApplyResetInput {
  /** The credential is read from the position, never taken from a caller. */
  sessionKey?: string;
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

  /**
   * Reports whether `code` currently identifies a usable row and binds it to
   * the caller's position. Consumes nothing — the same code confirmed twice
   * from the same position reports usable both times.
   */
  confirm(input: ConfirmResetInput): Promise<void>;

  /** Where a reader stands. Writes nothing, and never fails for want of a session. */
  positionOf(sessionKey?: string): Promise<ResetPosition>;

  /**
   * Re-validates `code` and, only if it is still usable, atomically marks it
   * used, hashes and writes the new password, and revokes every session for
   * the account (D2 / I7). One transaction: a code that was valid a moment
   * before must never be spent without the password actually changing.
   */
  apply(input: ApplyResetInput): Promise<{ userId: number }>;
}
