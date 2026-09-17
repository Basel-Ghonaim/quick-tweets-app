import type { VerificationMessages } from "@shared/channel-verification";
import type { Catalogue } from "@shared/copy";

/** Built from the active catalogue; the screens hold it per language, so the hooks keyed on it stay stable. */
export const verificationMessages = (copy: Catalogue): VerificationMessages => ({
  too_many_requests: copy.auth.verify.cooldownRefused,
  rate_limit: copy.auth.verify.rateLimited,
  bad_request: copy.auth.verify.codeRejected,
});
