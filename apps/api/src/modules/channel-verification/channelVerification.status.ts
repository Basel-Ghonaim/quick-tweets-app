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

import type { DbClient } from "../../shared/database/index.js";
import { createChannelVerificationRepository } from "./channelVerification.repository.js";
import type {
  IChannelVerificationRepository,
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
}

// The id is numeric, so the first space is unambiguously the separator.
const subjectKey = (userId: number, endpoint: string) => `${userId} ${endpoint}`;

export const createChannelVerificationStatus = (
  repo: IChannelVerificationRepository = createChannelVerificationRepository(),
  now: () => Date = () => new Date(),
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
      // No record for this exact value: either never asked about, or the
      // endpoint changed and this is a different subject.
      const record = bySubject.get(subjectKey(userId, endpoint));
      if (record === undefined) return "unproven";
      if (record.provenAt !== null) return "proven";

      const challenge = byRecord.get(record.id);
      return challenge !== undefined && challenge.expiresAt.getTime() > at
        ? "pending"
        : "unproven";
    });
  };

  return {
    statusOfMany,
    statusOf: async (userId, endpoint, client) =>
      (await statusOfMany([{ userId, endpoint }], client))[0]!,
  };
};

/** A ready-to-use instance for consumers that do not inject. */
export const channelVerificationStatus: IChannelVerificationStatus =
  createChannelVerificationStatus();
