import type { VerificationRead } from "../model";
import type { VerificationGateway } from "../gateway";

/** A read that failed is not an answer of "nothing outstanding": reporting one
 *  would tell a reader there is nothing to wait for when there may be. */
export const resolveVerification = async (
  repo: VerificationGateway,
): Promise<VerificationRead> => {
  try {
    return { status: "resolved", position: await repo.current() };
  } catch {
    return { status: "failed" };
  }
};
