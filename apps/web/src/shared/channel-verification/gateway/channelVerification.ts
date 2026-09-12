// Channel Verification client — proof that an account controls a channel.
// None of the three carries a shape belonging to a feature: the read and the
// issue send no body, so the server resolves the subject from the token, and
// confirm sends a code.

import { authClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { CurrentChallengeDto, IssuedChallengeDto } from "./verificationDto";

/** Asks where the holder stands. Nothing outstanding is an answer of its own,
 *  so a client never reads a status code to decide a screen. */
export const currentChallenge = async (client = authClient): Promise<CurrentChallengeDto> => {
  const res = await client.get<ApiEnvelope<CurrentChallengeDto>>(
    "/channel-verification/challenges/current",
  );
  return unwrap(res);
};

/** Requests a code for the authenticated account's own address. */
export const issueChallenge = async (client = authClient): Promise<IssuedChallengeDto> => {
  const res = await client.post<ApiEnvelope<IssuedChallengeDto>>(
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
