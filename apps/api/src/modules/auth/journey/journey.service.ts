/**
 * Onboarding Journey — the rules, and the only place a move is applied.
 *
 * Whether a move is legal is decided by a pure function; what this adds is the
 * two conditions that need the world — a reader may not reach the code screen
 * unless a live challenge exists, and closing records whether the channel was
 * ever proven — and the writes that follow.
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
  JourneyRecord,
  JourneyState,
  VerificationProbe,
} from "./journey.types.js";

/**
 * @param verification - required and undefaulted: the capability must not reach
 *   for its own answers, and a default would be exactly that reach.
 * @param repo - data access (defaults to the Prisma implementation)
 * @param now - clock seam, so the marks are assertable
 */
export const createJourneyService = (
  verification: VerificationProbe,
  repo: IJourneyRepository = createJourneyRepository(),
  now: () => Date = () => new Date(),
): IJourneyService => {
  const stateOf = (journey: JourneyRecord | null): JourneyState => ({
    phase: phaseOf(journey),
    profileOutcome: journey?.profileOutcome ?? null,
  });

  /**
   * Read the state back from the row rather than assuming the move landed.
   *
   * A racing tab may have advanced further between the decision and the write,
   * so the truthful answer is the one the record now gives — which is what lets
   * a client re-sync from any response instead of trusting its own guess.
   */
  const currentState = async (userId: number): Promise<JourneyState> =>
    stateOf(await repo.findByUserId(userId));

  return {
    stateFor: currentState,

    advance: async (userId, move) => {
      const journey = await repo.findByUserId(userId);
      if (journey === null) throw JourneyError.noJourney();

      const decision = decideTransition(phaseOf(journey), move.to);

      switch (decision.kind) {
        case "refused":
          throw JourneyError.illegalTransition();

        case "noop":
          return stateOf(journey);

        case "settleProfile":
          /* The decision is reached only from `to: "verify"`, which is the one
             move that carries an outcome — so the narrowing is the union's
             rather than a check of its own. */
          if (move.to !== "verify") throw JourneyError.illegalTransition();

          await repo.settleProfile(journey.id, now(), move.outcome);
          return currentState(userId);

        case "reachCode":
          /* The terminal screen is only reachable when there is something to
             type into it. Without this a client could latch itself onto the
             end of the journey with no code in flight, and the latch is the
             one state nothing walks back. */
          if (!(await verification.hasLiveChallenge(userId)))
            throw JourneyError.illegalTransition();

          await repo.reachCode(journey.id, now());
          return currentState(userId);

        case "close": {
          /* Read rather than taken from the caller: the fact belongs to the
             capability that owns it, and a client's word for it would be a
             second copy free to disagree. */
          const proven = await verification.hasProvenChannel(userId);

          await repo.close(journey.id, now(), decision.from, proven ? "verified" : "later");
          return currentState(userId);
        }
      }
    },
  };
};
