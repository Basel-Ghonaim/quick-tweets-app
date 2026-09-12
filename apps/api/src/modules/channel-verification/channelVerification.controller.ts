/**
 * Channel Verification — the HTTP boundary.
 *
 * The subject is resolved **here**, not in the service: the capability is
 * handed the endpoint it is asked about and never fetches its own, which is what
 * keeps it from reading the account's email transitively. This is the
 * composition point, and that is its job.
 */

import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../shared/errors/index.js";
import { resolveCurrentEmail } from "../../shared/identity/index.js";
import { sendSuccess } from "../../shared/response/index.js";
import { ChannelVerificationError } from "./channelVerification.errors.js";
import { createChannelVerificationService } from "./channelVerification.service.js";
import type { IChannelVerificationService } from "./channelVerification.types.js";

/**
 * Translate the capability's transport-agnostic errors at the boundary, leaving
 * anything else untouched for the global handler.
 *
 * Every failed confirmation becomes one status with one message. Uniform opacity
 * is auditable and a carve-out is not: the moment a single cause reports itself
 * it earns its own message, then its own status, and the guarantee decays by
 * increments.
 */
const asHttpError = (err: unknown): unknown => {
  if (!(err instanceof ChannelVerificationError)) return err;

  if (err.code === "cooldown_active") {
    return AppError.tooManyRequests(
      "A verification code was requested too recently. Please wait before requesting another.",
    );
  }
  if (err.code === "confirmation_failed") {
    return AppError.badRequest("That verification code is not valid.");
  }
  return err;
};

/**
 * A refusal that knows when to retry says so in the header HTTP already has for
 * it. The error envelope is left alone deliberately: adding a field there would
 * change the shape every error in the system shares, for one caller's benefit.
 */
const applyRetryAfter = (res: Response, err: unknown): void => {
  if (err instanceof ChannelVerificationError && err.retryAfterSeconds !== undefined) {
    res.setHeader("Retry-After", String(err.retryAfterSeconds));
  }
};

export const createChannelVerificationController = (
  service: IChannelVerificationService = createChannelVerificationService(),
  resolveEndpoint: (userId: number) => Promise<string | null> = resolveCurrentEmail,
) => ({
  /**
   * POST /channel-verification/challenges
   * Issues a challenge for the authenticated holder's own endpoint.
   */
  issue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const endpoint = await resolveEndpoint(userId);
      // The account went away between authentication and here; nothing is
      // passed downstream in place of a subject.
      if (endpoint === null) throw AppError.notFound("Account");

      const { delivery, resendAvailableInSeconds } = await service.issue({ userId, endpoint });

      sendSuccess(res, { delivery, resendAvailableInSeconds }, 202);
    } catch (err) {
      applyRetryAfter(res, err);
      next(asHttpError(err));
    }
  },

  /**
   * GET /channel-verification/challenges/current
   * What the capability knows about the authenticated holder's own endpoint,
   * and how long until another challenge may be issued. Nothing outstanding is
   * an answer rather than a missing resource, so this never reports `404` for
   * the absence of a challenge.
   */
  current: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const endpoint = await resolveEndpoint(userId);
      if (endpoint === null) throw AppError.notFound("Account");

      sendSuccess(res, await service.stateOf(userId, endpoint), 200);
    } catch (err) {
      next(asHttpError(err));
    }
  },

  /**
   * POST /channel-verification/challenges/confirm
   * Confirms an outstanding challenge for the authenticated holder.
   */
  confirm: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const endpoint = await resolveEndpoint(userId);
      if (endpoint === null) throw AppError.notFound("Account");

      await service.confirm({ userId, endpoint, code: String(req.body.code) });

      sendSuccess(res, null, 204);
    } catch (err) {
      next(asHttpError(err));
    }
  },
});
