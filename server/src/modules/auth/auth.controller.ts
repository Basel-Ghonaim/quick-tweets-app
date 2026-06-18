/**
 * Auth controller — HTTP request handling for auth endpoints.
 *
 * Purpose:
 * - register: parse validated body → call service → set cookie → return 201 + user + accessToken
 * - login: parse validated body → call service → set cookie → return 200 + user + accessToken
 * - logout: read cookie → call service → clear cookie → return 204
 * - refresh: read cookie → call service → set new cookie → return 200 + accessToken
 * - me: read userId from authGuard → fetch user → return 200 + user
 *
 * Security: refresh token is NEVER in the response body.
 * It is set as an httpOnly cookie — JavaScript cannot read it.
 *
 * Response format: All responses use sendSuccess() → { success: true, data: {...} }
 *
 * Future expansion:
 * - forgotPassword: validate email → call service → return 200
 * - resetPassword: validate token + password → call service → return 200
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on IAuthService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createAuthService } from "./auth.service.js";
import type { IAuthService } from "./auth.types.js";
import { sendSuccess } from "../../shared/response/index.js";
import { AppError } from "../../shared/errors/index.js";

// ─── Cookie Configuration ────────────────────────────────────────────────────

/**
 * Cookie identity flags — shared between setCookie and clearCookie.
 * clearCookie requires the same flags (except maxAge/expires) to match.
 * Adding a flag here ensures both operations stay in sync.
 */
const REFRESH_COOKIE_BASE = {
  httpOnly: true,                          // JS cannot read this cookie
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "strict" as const,             // blocks CSRF
  path: "/api/v1/auth",                    // only sent to auth endpoints
} as const;

/** Full cookie options (base + maxAge) — used when setting the cookie. */
const REFRESH_COOKIE_OPTIONS = {
  ...REFRESH_COOKIE_BASE,
  maxAge: 7 * 24 * 60 * 60 * 1000,        // 7 days in milliseconds
};

// ─── User Response Formatter ─────────────────────────────────────────────────

/**
 * Strips sensitive fields (passwordHash) from User before sending to client.
 * This acts as a simple response mapper (DTO).
 */
const toUserResponse = (user: { id: number; username: string; name: string; email: string; profileImage: string | null; bio: string; createdAt: Date }) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  bio: user.bio,
  createdAt: user.createdAt,
});

// ─── Controller Factory ──────────────────────────────────────────────────────

/**
 * Creates auth controller handlers with injected service dependency.
 *
 * @param service - Auth service instance (defaults to production service)
 */
export const createAuthController = (
  service: IAuthService = createAuthService(),
) => ({

  /**
   * POST /auth/register
   * Creates a new user account.
   * Sets refresh token as httpOnly cookie, returns accessToken in body.
   */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.register(req.body);

      res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(res, {
        user: toUserResponse(result.user),
        accessToken: result.accessToken,
      }, 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/login
   * Authenticates user.
   * Sets refresh token as httpOnly cookie, returns accessToken in body.
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.login(req.body);

      res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(res, {
        user: toUserResponse(result.user),
        accessToken: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/logout
   * Reads refresh token from cookie, invalidates it, clears cookie.
   */
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await service.logout(refreshToken);
      }

      // Clear cookie with matching flags — uses REFRESH_COOKIE_BASE
      // so any new flag added to the base is automatically picked up.
      res.clearCookie("refreshToken", REFRESH_COOKIE_BASE);
      sendSuccess(res, null, 204);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/logout-all
   * Invalidates ALL refresh tokens for the authenticated user (all devices).
   * Requires authGuard — userId comes from the verified JWT.
   */
  logoutAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      await service.logoutAll(userId);

      // Clear cookie on current device
      res.clearCookie("refreshToken", REFRESH_COOKIE_BASE);
      sendSuccess(res, null, 204);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/refresh
   * Reads refresh token from cookie, rotates it, sets new cookie.
   * Returns new accessToken in body.
   */
  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        throw AppError.unauthorized("No refresh token provided");
      }

      const result = await service.refreshToken(refreshToken);

      res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

      sendSuccess(res, {
        accessToken: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /auth/me
   * Returns the authenticated user's profile.
   * Requires authGuard middleware to run first.
   */
  me: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const user = await service.getMe(userId);

      sendSuccess(res, {
        user: toUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  },
});
