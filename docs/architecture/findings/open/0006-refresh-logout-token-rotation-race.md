# Finding 0006: Logout may miss a token rotated by a concurrent refresh

> **Status:** Open (observation — a potential race, not a confirmed bug today)
> **Date:** 2026-07-13
> **Affected areas:** `server/src/modules/auth` (refresh-token rotation, logout), `src/modules/auth` (logout / startup refresh)
> **Reported by:** Basel Ghonaim (surfaced during the #294 logout-reliability analysis)

## Observation

Refresh tokens **rotate on every use**: `POST /auth/refresh` atomically deletes the presented token and issues a new one, which becomes the new `HttpOnly` cookie. **Logout** (`POST /auth/logout`) revokes only the token currently in the cookie (`deleteMany({ where: { token } })`).

If a `/auth/refresh` completes **concurrently with**, or **between the attempts of**, a logout, the token the logout targets may already have been rotated away (deleted), while the **new** token remains live. A logout — or a logout retry — can then revoke a stale token and **miss the current one**, leaving the session valid despite the user having "logged out."

This matters more since #258 made the client **always** call `/auth/refresh` on startup (server-based restore): a session that survives a logout via this race would be restored on the next reload.

## Evidence

Verified on `main` (2026-07-13):

- Rotation: `auth.service.refreshToken` → `tokenRepo.rotateRefreshToken(oldToken, userId, newToken, …)` (delete old + create new in one transaction).
- Logout: `auth.service.logout` → `tokenRepo.deleteRefreshToken(token)` → `db.refreshToken.deleteMany({ where: { token } })` — scoped to the **single** cookie token.
- Client: `useInitAuth` unconditionally calls `restAuth().refresh()` on startup (#258).

## Why this is an observation, not a confirmed bug

It requires a specific concurrency window (a refresh racing a logout on the same session), which normal single-tab use rarely produces; the token also expires server-side within 7 days regardless; and the consequence is currently **latent** (no component keys control flow off logout/`isLoggedIn` yet — see [#18]). It is recorded to preserve the architectural observation, not because a defect has been demonstrated.

## Principle / boundary

- **Reliable session termination under concurrency** — logout should end *this* session deterministically, even when a refresh races it. The current single-token revoke is not concurrency-proof by construction.

## Resolution direction (not scheduled)

Potential **future** backend enhancements (analysis only — no fix proposed here): e.g. a session- or user-scoped revoke on logout, or coordinating refresh and logout so a rotation cannot outlive a logout. These are architectural improvements, not a confirmed-bug fix.

## Links

- Surfaced by the logout-reliability Work Item [#294](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/294), whose **immediate** fix is client-side; this finding preserves the **backend** concurrency observation separately.
- Related restore change: [#258](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/258) (server-based session restore).
