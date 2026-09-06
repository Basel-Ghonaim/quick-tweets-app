/**
 * Channel Verification — the single published interface.
 *
 * Consumers read verified state through this file and nothing else. The
 * repository, the challenge lifecycle, the code and its digest, the mail
 * composition, and every other internal are deliberately absent.
 *
 * **The query surface, and one command.** `issue` and `confirm` remain absent:
 * they have no in-process consumer, since the capability drives them from its
 * own HTTP surface. What is published beside the query is the one command that
 * does have one — recording a proof from evidence that arose elsewhere, which
 * account recovery produces (ADR 0017 Decision 6). It joined this file as a
 * deliberate act rather than by having been reachable all along.
 */

export {
  createChannelVerificationStatus,
  channelVerificationStatus,
} from "./channelVerification.status.js";
export type { IChannelVerificationStatus } from "./channelVerification.status.js";
export {
  createChannelVerificationProof,
  channelVerificationProof,
} from "./channelVerification.proof.js";
export type { IChannelVerificationProof } from "./channelVerification.proof.js";
export type {
  VerificationStatus,
  VerificationSubject,
} from "./channelVerification.types.js";
