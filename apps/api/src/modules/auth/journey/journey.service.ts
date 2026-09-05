/**
 * Onboarding Journey — the rules, and the only place a move is applied.
 *
 * Whether a move is legal is decided by a pure function; what this adds is the
 * one condition that needs the world — a reader may not reach the code screen
 * unless a live challenge actually exists — and the writes that follow.
 *
 * The capability never imports the subsystem that owns verification. It states
 * what it needs as a probe and is handed one at composition, so the copy the
 * boundary test asserts stays a copy.
 */

import { JourneyError } from "./journey.errors.js";
import { decideTransition, phaseOf } from "./journey.phase.js";
import { createJourneyRepository } from "./journey.repository.js";
import type {
  IJourneyRepository,
  IJourneyService,
  JourneyPhase,
  VerificationProbe,
} from "./journey.types.js";

/**
 * @param hasLiveChallenge - required and undefaulted: the capability must not
 *   reach for its own answer, and a default would be exactly that reach.
 * @param repo - data access (defaults to the Prisma implementation)
 * @param now - clock seam, so the marks are assertable
 */
export const createJourneyService = (
  hasLiveChallenge: VerificationProbe,
  repo: IJourneyRepository = createJourneyRepository(),
  now: () => Date = () => new Date(),
): IJourneyService => {
  /**
   * Read the phase back from the row rather than assuming the move landed.
   *
   * A racing tab may have advanced further between the decision and the write,
   * so the truthful answer is the one the record now gives — which is what lets
   * a client re-sync from any response instead of trusting its own guess.
   */
  const currentPhase = async (userId: number): Promise<JourneyPhase> =>
    phaseOf(await repo.findByUserId(userId));

  return {
    phaseFor: currentPhase,

    advance: async (userId, to) => {
      const journey = await repo.findByUserId(userId);
      if (journey === null) throw JourneyError.noJourney();

      const decision = decideTransition(phaseOf(journey), to);

      switch (decision.kind) {
        case "refused":
          throw JourneyError.illegalTransition();

        case "noop":
          return phaseOf(journey);

        case "settleProfile":
          await repo.fillMark(journey.id, "profileSettledAt", now());
          return currentPhase(userId);

        case "reachCode":
          /* The terminal screen is only reachable when there is something to
             type into it. Without this a client could latch itself onto the
             end of the journey with no code in flight, and the latch is the
             one state nothing walks back. */
          if (!(await hasLiveChallenge(userId))) throw JourneyError.illegalTransition();

          await repo.fillMark(journey.id, "codeReachedAt", now());
          return currentPhase(userId);

        case "close":
          await repo.close(journey.id, now(), decision.from);
          return currentPhase(userId);
      }
    },
  };
};
