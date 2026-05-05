/**
 * Auth controller — HTTP request handling for auth endpoints.
 *
 * Current purpose:
 * - register: parse validated body → call service → return 201 + user + tokens
 * - login: parse validated body → call service → return 200 + user + tokens
 * - logout: parse validated body → call service → return 204
 * - refresh: parse validated body → call service → return 200 + new tokens
 * - me: read userId from authGuard → fetch user → return 200 + user
 *
 * Future expansion:
 * - forgotPassword: validate email → call service → return 200
 * - resetPassword: validate token + password → call service → return 200
 *
 * Principle: SRP — only parses requests and sends responses, no business logic.
 * Principle: DIP — depends on IAuthService interface, not concrete implementation.
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/authGuard.js";
import { createAuthService } from "./auth.service.js";
import { createAuthRepository } from "./auth.repository.js";
import type { IAuthService } from "./auth.types.js";

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
   * Creates a new user account and returns tokens.
   */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.register(req.body);

      res.status(201).json({
        user: toUserResponse(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/login
   * Authenticates user and returns tokens.
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.login(req.body);

      res.status(200).json({
        user: toUserResponse(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/logout
   * Invalidates the provided refresh token.
   */
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.logout(req.body.refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/refresh
   * Returns a new access + refresh token pair.
   */
  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.refreshToken(req.body.refreshToken);

      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
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
      const { userId } = req as AuthenticatedRequest;
      const authRepo = createAuthRepository();
      const user = await authRepo.findById(userId);

      if (!user) {
        res.status(404).json({ type: "not_found", message: "User not found" });
        return;
      }

      res.status(200).json({
        user: toUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  },
});
