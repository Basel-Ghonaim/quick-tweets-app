/**
 * Channel Verification — the published query surface.
 *
 * Derivation lives here rather than on the service so that what is published is
 * a query and nothing else: a status unit that wrapped the service would hand
 * consumers a reference to the object holding issue and confirm, which is the
 * coupling this surface exists to prevent.
 *
 * Status is resolved on read from the record and its challenge; nothing here
 * writes, so asking is always safe and an expired challenge answers correctly
 * without anyone having touched it.
 */

import { env } from "../../config/env.js";
import type { DbClient } from "../../shared/database/index.js";
import { resendAvailableInSeconds } from "./channelVerification.cooldown.js";
import { createChannelVerificationRepository } from "./channelVerification.repository.js";
import type {
  IChannelVerificationRepository,
  VerificationRecord,
  VerificationState,
  VerificationStatus,
  VerificationSubject,
} from "./channelVerification.types.js";

export interface IChannelVerificationStatus {
  /**
   * The status of every subject, **in the order given**, so a caller can pair
   * results with its own list by position. A fixed number of queries whatever
   * the batch size.
   */
  statusOfMany(
    subjects: VerificationSubject[],
    client?: DbClient,
  ): Promise<VerificationStatus[]>;

  /** One subject's status. */
  statusOf(
    userId: number,
    endpoint: string,
    client?: DbClient,
  ): Promise<VerificationStatus>;

  /**
   * One subject's whole read-time answer: the status, and what remains of the
   * resend window. The capability's own read route serves this; it writes
   * nothing, as everything here reads.
   */
  stateOf(
    userId: number,
    endpoint: string,
    client?: DbClient,
  ): Promise<VerificationState>;
}

// The id is numeric, so the first space is unambiguously the separator.
const subjectKey = (userId: number, endpoint: string) => `${userId} ${endpoint}`;

/** The one rule, so a second caller cannot derive the status its own way. */
const statusFrom = (
  record: VerificationRecord | null | undefined,
  challenge: { expiresAt: Date } | null | undefined,
  at: number,
): VerificationStatus => {
  // No record for this exact value: either never asked about, or the endpoint
  // changed and this is a different subject.
  if (record === null || record === undefined) return "unproven";
  if (record.provenAt !== null) return "proven";

  return challenge !== null && challenge !== undefined && challenge.expiresAt.getTime() > at
    ? "pending"
    : "unproven";
};

export const createChannelVerificationStatus = (
  repo: IChannelVerificationRepository = createChannelVerificationRepository(),
  now: () => Date = () => new Date(),
  resendCooldownMs: number = env.CHANNEL_VERIFICATION_RESEND_COOLDOWN_MS,
): IChannelVerificationStatus => {
  const statusOfMany: IChannelVerificationStatus["statusOfMany"] = async (
    subjects,
    client,
  ) => {
    if (subjects.length === 0) return [];

    const records = await repo.findRecords(subjects, client);
    const bySubject = new Map(records.map((r) => [subjectKey(r.userId, r.endpoint), r]));

    // Only an unproven record can still be pending, so nothing else is asked about.
    const unproven = records.filter((r) => r.provenAt === null).map((r) => r.id);
    const open = await repo.findOpenChallenges(unproven, client);
    const byRecord = new Map(open.map((c) => [c.verificationId, c]));

    const at = now().getTime();

    return subjects.map(({ userId, endpoint }) => {
      const record = bySubject.get(subjectKey(userId, endpoint));
      return statusFrom(record, record && byRecord.get(record.id), at);
    });
  };

  return {
    statusOfMany,
    statusOf: async (userId, endpoint, client) =>
      (await statusOfMany([{ userId, endpoint }], client))[0]!,

    stateOf: async (userId, endpoint, client) => {
      const at = now();
      const record = await repo.findRecord(userId, endpoint, client);
      // Only an unproven record can still be pending, so nothing else is asked about.
      const challenge =
        record !== null && record.provenAt === null
          ? await repo.findOpenChallenge(record.id, client)
          : null;

      return {
        status: statusFrom(record, challenge, at.getTime()),
        resendAvailableInSeconds: resendAvailableInSeconds(
          record?.lastChallengedAt ?? null,
          resendCooldownMs,
          at,
        ),
      };
    },
  };
};

/** A ready-to-use instance for consumers that do not inject. */
export const channelVerificationStatus: IChannelVerificationStatus =
  createChannelVerificationStatus();
