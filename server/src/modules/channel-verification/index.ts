/**
 * Channel Verification — the single published interface.
 *
 * Consumers read verified state through this file and nothing else. The
 * repository, the challenge lifecycle, the code and its digest, the mail
 * composition, and every other internal are deliberately absent.
 *
 * **Only the query surface is published.** `issue` and `confirm` are commands
 * with no in-process consumer — the capability drives them from its own HTTP
 * surface — and Media publishes no ingest for the same reason. They join this
 * file when a consumer genuinely needs them, as a deliberate act rather than by
 * having been reachable all along.
 */

export {
  createChannelVerificationStatus,
  channelVerificationStatus,
} from "./channelVerification.status.js";
export type { IChannelVerificationStatus } from "./channelVerification.status.js";
export type {
  VerificationStatus,
  VerificationSubject,
} from "./channelVerification.types.js";
