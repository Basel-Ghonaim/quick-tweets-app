// Channel Verification client — proof that an account controls a channel.
// Neither call carries a shape belonging to a feature: issue sends no body, so
// the server resolves the subject from the token, and confirm sends a code.

import { authClient } from "./authClient";
import { unwrap, type ApiEnvelope } from "./envelope";

export interface IssuedChallenge {
  delivery: "accepted" | "refused" | "unknown";
  /** Whole seconds until this address may be issued another code. Read from the
   *  response because the cooldown is a server setting, not a client constant. */
  resendAvailableInSeconds: number;
}

/** Requests a code for the authenticated account's own address. */
export const issueChallenge = async (client = authClient): Promise<IssuedChallenge> => {
  const res = await client.post<ApiEnvelope<IssuedChallenge>>(
    "/channel-verification/challenges",
  );
  return unwrap(res);
};

/** Submits a code. Resolves on acceptance; every rejection is one refusal. */
export const confirmChallenge = async (
  code: string,
  client = authClient,
): Promise<void> => {
  await client.post("/channel-verification/challenges/confirm", { code });
};
