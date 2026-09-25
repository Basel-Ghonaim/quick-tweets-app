/**
 * Trend controller — HTTP request handling for the trending list.
 *
 * Principle: SRP — only sends responses, no business logic.
 * Principle: DIP — depends on ITrendService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/response/index.js";
import { createTrendService } from "./trend.service.js";
import type { ITrendService } from "./trend.types.js";

/**
 * Creates trend controller handlers with injected service dependency.
 *
 * @param service - Trend service instance (defaults to production service)
 */
export const createTrendController = (service: ITrendService = createTrendService()) => ({
  /**
   * GET /trends
   * The same list for every reader, so no guard reads the token.
   */
  getTrending: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await service.getTrending());
    } catch (err) {
      next(err);
    }
  },
});
