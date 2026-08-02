/**
 * Channel Verification — the module's internal types.
 *
 * The endpoint is always a caller-supplied parameter: this module never reads,
 * joins, or foreign-keys the mutable account email (ADR 0009 Decision 6).
 */

import type { DbClient } from "../../shared/database/index.js";

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

/**
 * A challenge secret in its plaintext form, minted or validated — never the
 * digest that is stored. Branded so an unvalidated string cannot reach a
 * comparison by accident.
 */
export type ChallengeCode = Brand<string, "ChallengeCode">;

/**
 * The shape a code is drawn from and checked against. Supplied by the caller
 * rather than fixed here: how long a code is and which characters it uses is a
 * product decision, and freezing it in this module would make changing it a
 * change to the mechanism.
 */
export interface ChallengeCodeFormat {
  readonly alphabet: string;
  readonly length: number;
}

/** The standing record: one account's claim over one endpoint value. */
export interface VerificationRecord {
  id: number;
  userId: number;
  endpoint: string;
  provenAt: Date | null;
  lastChallengedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A challenge, without its secret — the digest never travels on this shape. */
export interface Challenge {
  id: number;
  verificationId: number;
  expiresAt: Date;
  closedAt: Date | null;
  closedReason: string | null;
  createdAt: Date;
}

/**
 * The one shape that carries the stored digest, returned only where a caller
 * must compare against it. Expiry is deliberately not filtered here: whether an
 * open challenge has lapsed is derived by the caller, so no write is needed for
 * an expired challenge to read as expired.
 */
export interface OpenChallenge extends Challenge {
  secretHash: string;
}

export interface CreateRecordInput {
  userId: number;
  endpoint: string;
}

export interface CreateChallengeInput {
  verificationId: number;
  secretHash: string;
  expiresAt: Date;
}

export interface CloseChallengesInput {
  verificationId: number;
  closedAt: Date;
  reason: string;
}

export interface MarkProvenInput {
  verificationId: number;
  provenAt: Date;
}

/**
 * The module's only data-access path. Every method accepts an optional client so
 * a caller can run it inside an interactive transaction; without one it uses the
 * repository's own.
 */
export interface IChannelVerificationRepository {
  findRecord(
    userId: number,
    endpoint: string,
    client?: DbClient,
  ): Promise<VerificationRecord | null>;

  createRecord(
    input: CreateRecordInput,
    client?: DbClient,
  ): Promise<VerificationRecord>;

  /** The open challenge for a record, if any — open being the absence of a close. */
  findOpenChallenge(
    verificationId: number,
    client?: DbClient,
  ): Promise<OpenChallenge | null>;

  createChallenge(
    input: CreateChallengeInput,
    client?: DbClient,
  ): Promise<Challenge>;

  /** Closes whatever is open for a record; returns how many were closed. */
  closeOpenChallenges(
    input: CloseChallengesInput,
    client?: DbClient,
  ): Promise<number>;

  /** Closes one challenge by id — retained, not deleted, so a replay stays distinguishable. */
  closeChallenge(
    id: number,
    closedAt: Date,
    reason: string,
    client?: DbClient,
  ): Promise<void>;

  markProven(input: MarkProvenInput, client?: DbClient): Promise<void>;

  /** Anchors the resend throttle on the record, so rotating a challenge cannot reset it. */
  touchLastChallenged(
    verificationId: number,
    at: Date,
    client?: DbClient,
  ): Promise<void>;

  /**
   * Removes closed or expired challenges older than `cutoff`; returns how many
   * went. Hygiene only — no status is written, and no answer the system gives
   * depends on this having run.
   */
  deleteSpentChallenges(cutoff: Date, client?: DbClient): Promise<number>;
}
