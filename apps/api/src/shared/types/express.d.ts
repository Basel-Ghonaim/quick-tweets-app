/**
 * Express type extensions for the Quick Tweets backend.
 *
 * Purpose:
 * - Adds `userId` to Express Request globally
 * - Used by two middleware:
 *   1. authGuard — STRICT: sets userId or throws 401. Always defined after authGuard.
 *   2. optionalAuth — SOFT: sets userId if valid token present, otherwise undefined.
 *
 * Controllers access it directly: req.userId (no casting needed)
 *   - After authGuard: req.userId is guaranteed (number)
 *   - After optionalAuth: req.userId may be undefined (number | undefined)
 *
 * Future expansion:
 * - Add `sessionId` for refresh token tracking
 * - Add `role` for role-based access control (RBAC)
 * - Add `file` / `files` typing for Multer uploads
 */

declare global {
  namespace Express {
    interface Request {
      /** ID of the authenticated user — set by authGuard or optionalAuth middleware */
      userId?: number;
    }
  }
}

export {};
