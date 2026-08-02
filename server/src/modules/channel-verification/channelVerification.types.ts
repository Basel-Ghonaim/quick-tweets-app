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

/**
 * Why a challenge was closed. A closed set, so a failed attempt cannot quietly
 * become a fourth reason: a wrong guess leaves the challenge open.
 */
export type ChallengeCloseReason = "verified" | "superseded" | "expired";

export interface CloseChallengesInput {
  verificationId: number;
  closedAt: Date;
  reason: ChallengeCloseReason;
}

/** A record held under a row lock, carrying only what the throttle decision needs. */
export interface LockedRecord {
  id: number;
  lastChallengedAt: Date | null;
  provenAt: Date | null;
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

  /**
   * The record for a subject, created if it is not there yet. A concurrent
   * first-ever call can still lose the unique constraint; the caller retries.
   */
  upsertRecord(
    input: CreateRecordInput,
    client?: DbClient,
  ): Promise<VerificationRecord>;

  /**
   * Take a row lock on the record, so callers issuing for the same subject
   * serialize and the throttle can be read under it rather than around it.
   */
  lockRecord(id: number, client?: DbClient): Promise<LockedRecord | null>;

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
    reason: ChallengeCloseReason,
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

// ─── Service ─────────────────────────────────────────────────────────────────

/** What the capability knows about a subject, resolved rather than stored. */
export type VerificationStatus = "unproven" | "pending" | "proven";

export interface IssueInput {
  userId: number;
  /** The subject, taken as given: this module normalizes nothing. */
  endpoint: string;
}

export interface ConfirmInput {
  userId: number;
  endpoint: string;
  code: string;
}

export interface IssueOutcome {
  /**
   * Whether the mail port accepted the message. The challenge is persisted
   * either way — a delivery failure is reported, never destructive.
   */
  delivered: boolean;
}

export interface IChannelVerificationService {
  issue(input: IssueInput): Promise<IssueOutcome>;
  /** Resolves on success; every failure raises the one opaque error. */
  confirm(input: ConfirmInput): Promise<void>;
  statusOf(
    userId: number,
    endpoint: string,
    client?: DbClient,
  ): Promise<VerificationStatus>;
}
