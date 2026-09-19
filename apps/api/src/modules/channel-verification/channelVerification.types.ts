/**
 * Channel Verification — the module's internal types.
 *
 * The endpoint is always a caller-supplied parameter: this module never reads,
 * joins, or foreign-keys the mutable account email (ADR 0009 Decision 6).
 */

import type { DbClient } from "../../shared/database/index.js";
import type { MailOutcome } from "../mail-delivery/index.js";

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

/** An account paired with the endpoint being asked about. */
export interface VerificationSubject {
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
 * become a third reason: a wrong guess leaves the challenge open.
 */
export type ChallengeCloseReason = "verified" | "superseded";

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

  /**
   * The records matching any of `subjects`, in whatever order the database
   * returns them — the caller re-associates. One query regardless of how many
   * subjects are asked about.
   */
  findRecords(
    subjects: VerificationSubject[],
    client?: DbClient,
  ): Promise<VerificationRecord[]>;

  /**
   * The open challenge for each of `verificationIds` that has one. One query
   * regardless of how many records are asked about.
   */
  findOpenChallenges(
    verificationIds: number[],
    client?: DbClient,
  ): Promise<OpenChallenge[]>;

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

  /**
   * Closes one challenge by id **only while it is still open**, reporting how
   * many rows that matched. Conditional rather than unconditional so single use
   * is decided by the write itself: two callers racing cannot both succeed, and
   * a challenge a concurrent resend already superseded cannot be verified.
   *
   * Retained, not deleted, so a replay stays distinguishable from a value that
   * never existed.
   */
  closeChallenge(
    id: number,
    closedAt: Date,
    reason: ChallengeCloseReason,
    client?: DbClient,
  ): Promise<number>;

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

/**
 * A subject's whole read-time answer: what is known, and how long until another
 * challenge may be issued. Both are derived on read from the same two rows, so
 * asking writes nothing and an expired challenge answers correctly untouched.
 */
export interface VerificationState {
  status: VerificationStatus;
  /** `0` when no window is running — never challenged, or the wait has passed. */
  resendAvailableInSeconds: number;
}

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
   * What the mail port is known to have achieved — accepted, refused, or
   * genuinely unknown. The challenge is persisted regardless: a delivery
   * problem is reported, never destructive.
   *
   * The port's own type is reused rather than mirrored, so the two cannot
   * drift apart.
   */
  delivery: MailOutcome;

  /**
   * How long until this subject may be issued another challenge.
   *
   * Derived from the record's own cooldown anchor and read at the moment the
   * answer is produced — not restated from configuration. A caller that
   * hardcoded the setting would be wrong twice: whenever an operator changed
   * it, and on every send, since delivery is attempted after the anchor is
   * stamped and consumes part of the window before the caller hears anything.
   */
  resendAvailableInSeconds: number;
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
  /** One subject's whole read-time answer, for the capability's own read route. */
  stateOf(
    userId: number,
    endpoint: string,
    client?: DbClient,
  ): Promise<VerificationState>;
}
