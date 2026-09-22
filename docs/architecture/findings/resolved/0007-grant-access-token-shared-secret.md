# Finding 0007: Upload grants and access tokens shared `JWT_SECRET`, so token-type separation rested on payload-shape convention

> **Status:** Resolved
> **Date:** 2026-07-18
> **Resolved:** 2026-07-18 (#317)
> **Affected areas:** `server/src/modules/media/media.grants.ts`, `server/src/shared/utils/jwt.ts`, `server/src/config/env.ts`
> **Reported by:** Basel Ghonaim (surfaced during the M4 adversarial review, PR #316)

## Observation

M4 introduced **upload grants** (ADR 0007) as stateless HS256 JWTs, signed with the **same `JWT_SECRET`** as authentication **access tokens**. Because the two token types shared a signing key, the only thing separating them was a *payload-shape* check in each verifier.

The M4 review found this had an exploitable gap in one direction: `verifyAccessToken` decoded and cast without inspecting the payload class, so a grant — **mintable without authentication** (`POST /media/grants`) — presented as `Authorization: Bearer <grant>` verified as an access token with `userId: undefined`, passed `authGuard`, and via `POST /auth/logout-all` reached `deleteMany({ where: { userId: undefined } })`: an **unauthenticated, platform-wide session wipe**.

The immediate mitigation (shipped in M4) made the two verifiers reject each other's payload shape — `verifyAccessToken` now requires a numeric `userId`; `verifyUploadGrant` requires `typ === "media_upload_grant"` — closing both directions, tested.

This finding records the **residual architectural risk** that mitigation left in place: with a shared signing key, the boundary between two distinct **trust domains** — anonymously-minted grants vs. authenticated sessions — was held by a **cross-file payload-shape invariant**, not by construction. Correct, but fragile: it must be re-verified whenever the token set changes, and any future third JWT token type would have to be walled against **both** existing types. Given that a confusion enables an auth bypass, convention-only separation was an undue risk to carry forward.

## Evidence

Verified on `main` at M4 merge (commit `587288e`).

- `server/src/modules/media/media.grants.ts` — `mintUploadGrant` / `verifyUploadGrant` signed and verified with `env.JWT_SECRET`, the same key `server/src/shared/utils/jwt.ts` uses for access tokens.
- The mitigating shape checks: `verifyAccessToken` requires `typeof decoded.userId === "number"`; `verifyUploadGrant` requires `typ === "media_upload_grant"`.
- Grants are mintable with no authentication: `POST /api/v1/media/grants` (`media.routes.ts`) sits behind only a rate limiter.

## Resolution

The confusion class is eliminated **by construction**: upload grants are now signed and verified with a **dedicated `MEDIA_GRANT_SECRET`**, distinct from `JWT_SECRET`. A grant therefore fails an access-token signature check (and vice versa) **before any payload is inspected** — the two trust domains cannot cross-verify regardless of payload shape. The `typ` and numeric-`userId` checks are retained as **defense in depth**. The env schema requires `MEDIA_GRANT_SECRET` (`min(16)`) and **fails fast if it equals `JWT_SECRET`**, so the separation cannot be silently defeated by misconfiguration.

This did not amend ADR 0007 — grant representation is an ADR-deferred implementation choice; the stateless-JWT + `typ` boundary is unchanged, only the key is separated — and required no Execution Plan change.
