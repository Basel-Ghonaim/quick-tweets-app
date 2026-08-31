/**
 * Channel Verification — the challenge lifecycle and status resolution.
 *
 * The capability produces one fact and holds no policy: it never decides which
 * actions require a proven endpoint, and it takes the subject exactly as given.
 *
 * Status is resolved on read from `provenAt`, `closedAt` and `expiresAt`, never
 * stored. That is what lets an expired challenge read as expired with nobody
 * having written anything — the sweep is hygiene, not correctness.
 */

import { env } from "../../config/env.js";
import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../../shared/database/index.js";
import { createMailAdapter, type MailAdapter } from "../../shared/mail/index.js";
import { isPrismaError } from "../../shared/utils/index.js";
import {
  challengeCode,
  challengeCodeMatches,
  digestChallengeCode,
  mintChallengeCode,
} from "./channelVerification.codes.js";
import { ChannelVerificationError } from "./channelVerification.errors.js";
import { createChannelVerificationRepository } from "./channelVerification.repository.js";
import {
  createChannelVerificationStatus,
  type IChannelVerificationStatus,
} from "./channelVerification.status.js";
import type {
  ChallengeCode,
  ChallengeCodeFormat,
  ConfirmInput,
  IChannelVerificationRepository,
  IChannelVerificationService,
  IssueInput,
  IssueOutcome,
} from "./channelVerification.types.js";

export interface ChannelVerificationServiceDeps {
  repo?: IChannelVerificationRepository;
  status?: IChannelVerificationStatus;
  mail?: MailAdapter;
  runInTransaction?: RunInTransaction;
  now?: () => Date;
  format?: ChallengeCodeFormat;
  challengeTtlMs?: number;
  resendCooldownMs?: number;
}

const composeMessage = (code: ChallengeCode) => ({
  subject: "Your verification code",
  body: `Your verification code is ${code}. It expires shortly; if you did not request it, ignore this message.`,
});

export const createChannelVerificationService = (
  deps: ChannelVerificationServiceDeps = {},
): IChannelVerificationService => {
  const repo = deps.repo ?? createChannelVerificationRepository();
  const mail = deps.mail ?? createMailAdapter();
  const now = deps.now ?? (() => new Date());
  const status = deps.status ?? createChannelVerificationStatus(repo, now);
  const runTransaction = deps.runInTransaction ?? defaultRunInTransaction;
  const format = deps.format ?? {
    alphabet: env.CHANNEL_VERIFICATION_CODE_ALPHABET,
    length: env.CHANNEL_VERIFICATION_CODE_LENGTH,
  };
  const challengeTtlMs = deps.challengeTtlMs ?? env.CHANNEL_VERIFICATION_CHALLENGE_TTL_MS;
  const resendCooldownMs =
    deps.resendCooldownMs ?? env.CHANNEL_VERIFICATION_RESEND_COOLDOWN_MS;

  /**
   * One attempt at the persisted half of issuing. The record is locked before
   * the throttle is read: checked around the lock the cooldown is advisory, and
   * two simultaneous requests would both pass it and send two messages.
   */
  const persistChallenge = ({ userId, endpoint }: IssueInput, at: Date) =>
    runTransaction(async (tx) => {
      const record = await repo.upsertRecord({ userId, endpoint }, tx);
      const locked = await repo.lockRecord(record.id, tx);

      const lastChallengedAt = locked?.lastChallengedAt ?? record.lastChallengedAt;
      if (
        lastChallengedAt !== null &&
        at.getTime() - lastChallengedAt.getTime() < resendCooldownMs
      ) {
        throw ChannelVerificationError.cooldownActive();
      }

      // A resend rotates: the previous secret stops working, so a message that
      // may have been exposed cannot be used, and the newest one is the one
      // that works.
      await repo.closeOpenChallenges(
        { verificationId: record.id, closedAt: at, reason: "superseded" },
        tx,
      );

      const code = mintChallengeCode(format);
      await repo.createChallenge(
        {
          verificationId: record.id,
          secretHash: digestChallengeCode(code),
          expiresAt: new Date(at.getTime() + challengeTtlMs),
        },
        tx,
      );

      // Anchored on the record, so rotating a challenge cannot reset the throttle.
      await repo.touchLastChallenged(record.id, at, tx);

      return code;
    });

  const issue: IChannelVerificationService["issue"] = async (input) => {
    const at = now();

    let code: ChallengeCode;
    try {
      code = await persistChallenge(input, at);
    } catch (error) {
      if (!isPrismaError(error, "P2002")) throw error;
      // A concurrent request won — either creating the record first, or
      // inserting its challenge against the one-open constraint. Retrying takes
      // the lock the winner has now released and reads the throttle it set, so
      // the loser gets a cooldown answer rather than a race error. The
      // constraint stays authoritative for any path that forgets the lock.
      code = await persistChallenge(input, at);
    }

    // Sent after commit: a transport failure must not undo a persisted
    // challenge, and no row lock is held across a network call.
    const delivery = await mail.send({ to: input.endpoint, ...composeMessage(code) });

    return { delivered: delivery.ok } satisfies IssueOutcome;
  };

  const confirm: IChannelVerificationService["confirm"] = async ({
    userId,
    endpoint,
    code,
  }: ConfirmInput) => {
    const at = now();

    let submitted: ChallengeCode;
    try {
      submitted = challengeCode(code, format);
    } catch {
      throw ChannelVerificationError.confirmationFailed();
    }

    const record = await repo.findRecord(userId, endpoint);
    if (record === null) throw ChannelVerificationError.confirmationFailed();

    const open = await repo.findOpenChallenge(record.id);
    if (open === null) throw ChannelVerificationError.confirmationFailed();

    // Lapsed challenges are refused on read; nothing is written, which is what
    // keeps expiry correct without a writer.
    if (open.expiresAt.getTime() <= at.getTime()) {
      throw ChannelVerificationError.confirmationFailed();
    }

    // A wrong value leaves the challenge open: closing it here would let one
    // mistyped character deny the holder their own verification.
    if (!challengeCodeMatches(submitted, open.secretHash)) {
      throw ChannelVerificationError.confirmationFailed();
    }

    await runTransaction(async (tx) => {
      // The close is what decides single use: if no row was still open, another
      // caller verified it or a resend superseded it between the read above and
      // here. Raising before the proof is recorded rolls the whole thing back,
      // so a lost race can never leave a proof behind.
      const closed = await repo.closeChallenge(open.id, at, "verified", tx);
      if (closed === 0) throw ChannelVerificationError.confirmationFailed();

      await repo.markProven({ verificationId: record.id, provenAt: at }, tx);
    });
  };

  // Delegated, not duplicated: derivation has one home, and it is the one that
  // is published.
  const statusOf: IChannelVerificationService["statusOf"] = (userId, endpoint, client) =>
    status.statusOf(userId, endpoint, client);

  return { issue, confirm, statusOf };
};
