import { AppError } from "@shared/errors";
import type { JourneyRead, JourneyState } from "@features/journey/model";
import type { JourneyRepository } from "@features/journey/repository";

const unauthorized = (error: unknown) =>
  error instanceof AppError && error.type === "unauthorized";

/** At `verify` the move is the question: only the server knows whether a
 *  challenge is outstanding, and refusing it is how it says no. */
export const resolveJourney = async (repo: JourneyRepository): Promise<JourneyRead> => {
  let state: JourneyState;

  try {
    state = await repo.read();
  } catch (error) {
    return { status: "failed", unauthorized: unauthorized(error) };
  }

  if (state.phase !== "verify") return { status: "resolved", state };

  try {
    return { status: "resolved", state: await repo.advance({ to: "code" }) };
  } catch {
    return { status: "resolved", state };
  }
};
