/**
 * Channel Verification — proof from evidence obtained elsewhere.
 *
 * The capability owns one fact and is its sole authority (ADR 0009 Decision 2).
 * It does not follow that it must be the only place evidence *arises* — only
 * that it decides what counts and performs the write. This is the second class
 * it admits, and the rule for that class lives here rather than in the caller
 * (ADR 0017 Decision 6).
 *
 * What the class requires: a single-use code delivered to the endpoint, and an
 * actor who has become the account holder in the act of producing it. A caller
 * reports that it happened; it never reports that an endpoint is proven.
 */

import { createChannelVerificationRepository } from "./channelVerification.repository.js";
import type { IChannelVerificationRepository } from "./channelVerification.types.js";

export interface IChannelVerificationProof {
  /**
   * Records that a code delivered to `endpoint` was produced by someone who,
   * in producing it, became the holder of `userId`.
   *
   * Idempotent: an endpoint already proven stays proven at its original time,
   * because a second demonstration does not make the first one later.
   */
  fromDeliveredCode(userId: number, endpoint: string): Promise<void>;
}

export const createChannelVerificationProof = (
  repo: IChannelVerificationRepository = createChannelVerificationRepository(),
  now: () => Date = () => new Date(),
): IChannelVerificationProof => ({
  fromDeliveredCode: async (userId, endpoint) => {
    const record = await repo.upsertRecord({ userId, endpoint });
    if (record.provenAt !== null) return;

    await repo.markProven({ verificationId: record.id, provenAt: now() });
  },
});

export const channelVerificationProof = createChannelVerificationProof();
