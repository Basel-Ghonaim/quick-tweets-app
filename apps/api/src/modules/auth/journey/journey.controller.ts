/**
 * Onboarding Journey — the HTTP boundary.
 *
 * It translates the capability's refusals into statuses and nothing else: the
 * rules are the service's, and a reader's identity is the guard's. The probe
 * the service needs is taken here and passed inward, so this is the composition
 * point and the capability below it stays ignorant of who answers.
 */

import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../../shared/errors/index.js";
import { sendSuccess } from "../../../shared/response/index.js";
import { JourneyError } from "./journey.errors.js";
import { createJourneyService } from "./journey.service.js";
import type { IJourneyService, JourneyMove, VerificationProbe } from "./journey.types.js";

/**
 * A refused move is a conflict with the journey's current state, not a bad
 * request: the target was well-formed and the reader simply is not there. A
 * missing journey answers the same way, and deliberately says no more — a
 * caller learns that it cannot move, never why, for the same reason the phase
 * itself collapses "closed" and "never had one".
 */
const REFUSED = "That step is not available.";

const asHttpError = (err: unknown): unknown =>
  err instanceof JourneyError ? AppError.conflict(REFUSED) : err;

export const createJourneyController = (
  hasLiveChallenge: VerificationProbe,
  service: IJourneyService = createJourneyService(hasLiveChallenge),
) => ({
  /**
   * GET /onboarding/journey
   * Where this reader belongs. Answers for every caller, writes nothing.
   */
  read: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // No journey is a legitimate answer rather than an error, so there is no
      // 404 here: a caller must never have to read a status code to decide
      // where to send a reader.
      sendSuccess(res, await service.stateFor(req.userId!));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /onboarding/journey/advance
   * Moves the journey, or refuses. Answers with the resulting state either way,
   * so a client re-syncs from every response rather than from its own guess.
   */
  advance: async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await service.advance(req.userId!, req.body as JourneyMove));
    } catch (err) {
      next(asHttpError(err));
    }
  },
});
