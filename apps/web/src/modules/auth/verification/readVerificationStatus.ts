import { authClient, unwrap, type ApiEnvelope } from "@shared/api";

/**
 * Read from `GET /users/me`, which the User domain owns and no feature here
 * does. Verification reads it because the fact is verification's, projected onto
 * that resource — the same tenancy the profile client sits in, and it leaves
 * with it.
 *
 * Only the projection is taken. Verification has no business holding a user
 * shape, and a reader that took the whole record would acquire one by accident.
 */
export type VerificationStatus = "unproven" | "pending" | "proven";

interface SelfView {
  emailVerification: VerificationStatus;
}

export const readVerificationStatus = async (
  client = authClient,
): Promise<VerificationStatus> => {
  const res = await client.get<ApiEnvelope<SelfView>>("/users/me");

  return unwrap(res).emailVerification;
};
