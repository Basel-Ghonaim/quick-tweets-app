import type { VerificationMessages } from "@shared/channel-verification";
import { AUTH_COPY } from "../../config/copy";

/** Held as a module constant so the hooks that key callbacks on it stay stable. */
export const VERIFICATION_MESSAGES: VerificationMessages = {
  too_many_requests: AUTH_COPY.verify.cooldownRefused,
  rate_limit: AUTH_COPY.verify.rateLimited,
  bad_request: AUTH_COPY.verify.codeRejected,
};
