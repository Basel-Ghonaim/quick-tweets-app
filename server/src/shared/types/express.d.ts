/**
 * Express type extensions for the Quick Tweets backend.
 *
 * Current purpose:
 * - Adds `userId` to Express Request so auth-guarded routes have typed access
 *   to the authenticated user's ID without casting.
 *
 * Future expansion:
 * - Add `sessionId` for refresh token tracking
 * - Add `role` for role-based access control (RBAC)
 * - Add `file` / `files` typing for Multer uploads
 */

declare global {
  namespace Express {
    interface Request {
      /** ID of the authenticated user — set by authGuard middleware */
      userId?: number;
    }
  }
}

export {};
