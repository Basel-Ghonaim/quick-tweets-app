# Backend Security

> **Status:** Active.
> **Authority:** The authoritative source for the backend's **security mechanisms and the reasoning behind them** — authentication and the token model, password handling, the auth cookie, rate limiting, and HTTP hardening. It owns the *how* and the *why*. It does **not** own the wire contract (the auth endpoints, the rate-limit figures, and the auth modes are the [API contract](../api/api-contract.md)'s), the security *principles* it applies ([Engineering Principles §7](../development/engineering-principles.md)), or the **frontend** side of the token model (the in-memory access token and the 401-refresh flow belong to the [frontend API client](../frontend/api-client.md)).
> **Scope:** Server-side security mechanisms shared across the backend. Per-feature authorization rules live in the feature documents; the request lifecycle in the [system overview](../architecture/system-overview.md).
> **Version:** 1.4
> **Last Updated:** 2026-09-07
> **Owner:** Basel Ghonaim

## Authentication: the token model

Authentication is **stateless access + stateful refresh**:

- **Access token** — a short-lived **JWT** (default 15 minutes) carrying only the `userId`. It is signed and verified with **`HS256`, pinned explicitly on both sign and verify** — never inferred from the token header — which closes algorithm-substitution attacks (including the `alg: none` attack). The signing secret must be at least 16 characters and is validated at startup, so a misconfigured server refuses to boot.
- **Refresh token** — a long-lived (7-day) **opaque** value (a random UUID, not a JWT), validated by a database lookup rather than by decoding, and stored one row per session. It is **rotated on every use**: a refresh **atomically** deletes the old row and inserts the new one in a single transaction, so a crash mid-rotation can never half-apply and lock a user out.

The access token authorizes API calls; the refresh token renews it without re-login. The `RefreshToken` entity and its cascade behaviour are owned by the [data model](../architecture/data-model.md); the auth endpoints and payloads by the [API contract](../api/api-contract.md).

### Hybrid storage

The two tokens are stored differently **by design**, balancing usability against blast radius:

| Token | Lives in | Why |
|---|---|---|
| Access (15 min) | the **response body** (not a cookie) | short-lived, and handed to the client to attach as a bearer header rather than locked in a cookie; the client-side in-memory storage and its rationale are owned by the [frontend API client](../frontend/api-client.md#the-client-side-of-the-token-model) |
| Refresh (7 days) | an **`HttpOnly` cookie** the server sets | long-lived, so it must be unreadable by JavaScript — `HttpOnly` keeps it safe even under XSS |

This document owns the **server** side of that split (issuing the access token, setting the cookie, rotation). The **client** side — holding the access token in memory and replaying requests after a silent refresh — belongs to the [frontend API client](../frontend/api-client.md).

## The refresh cookie

The refresh token travels only as a cookie, hardened with every relevant flag:

- **`HttpOnly`** — JavaScript can't read it (XSS can't exfiltrate it);
- **`Secure`** in production — sent only over HTTPS;
- **`SameSite=Strict`** — not sent on cross-site requests (CSRF defense);
- **`Path=/api/v1/auth`** — sent only to the auth routes, never to the rest of the API;
- a 7-day **`Max-Age`** matching the token's lifetime.

It is set on register/login and cleared on logout **with the same flags it was set with** (kept in sync through a shared base), because a mismatched `clearCookie` silently fails to delete the cookie in production.

## The reset session cookie

A second cookie exists, and it is not part of the token model above. It addresses a reader's position in account recovery and **authorizes nothing on its own** — the credential it stands for is held server-side and never travels ([ADR 0017](../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)).

It carries the same hardening the refresh cookie does — `HttpOnly`, `Secure` in production, `SameSite=Strict`, and a `Path` scoped to the recovery routes so it reaches nothing else — with two differences that follow from what it is:

- **Its lifetime is the reset credential's**, not a session's. A cookie outliving what it authorizes would be a step a reader could return to and not be able to leave.
- **It is issued for every request alike**, including addresses with no account. Issuing it conditionally would answer, by its presence, the question the whole capability refuses to answer — which is why it is set before the response body is written rather than on a branch.

It is cleared with the attributes it was set with when a reset completes, for the same reason the refresh cookie is: a mismatched clear silently fails to delete it.

The mechanism it belongs to is [Password Reset](password-reset.md)'s; what is here is only its place in the HTTP surface's cookie inventory.

## Authorization guards

Two middlewares gate routes (where each sits in the request lifecycle is the [system overview](../architecture/system-overview.md)'s; which endpoint requires which mode is the [API contract](../api/api-contract.md)'s):

- **Strict guard** — requires a valid `Authorization: Bearer <token>`, attaches `userId`, and rejects with `401` otherwise. Used wherever private data is read or mutated.
- **Optional guard** — for public reads (the feed, a tweet, follower lists): it attaches `userId` if a valid token is present (enabling per-user fields like *is liked*), otherwise continues as a guest. It does a cheap structural check (a JWT has three dot-separated parts) before paying for signature verification, so guest traffic on hot endpoints isn't taxed.

Beyond authentication, **authorization is re-checked server-side**: mutating endpoints verify the caller owns the resource (author = caller) before acting, returning `403` otherwise — the client is never trusted ([Engineering Principles §7](../development/engineering-principles.md)).

## Password security

- Passwords are hashed with **bcrypt** at a cost of **12 rounds** — deliberately slow (~a quarter-second per hash) to resist offline cracking without harming login UX — and only ever compared, never decrypted.
- The policy (length 8–72, with upper, lower, digit, and symbol) is enforced at the boundary; the 72-character ceiling is bcrypt's input limit.
- Login and registration return a **single generic message** for both "no such user" and "wrong password", so the API can't be used to enumerate accounts.
- The password hash is **excluded at the database query layer** for profile reads — not merely dropped by the mapper — so even a code path that forgets to strip it cannot leak it (defense in depth).

## Rate limiting

Eight per-IP rate limiters protect different surfaces over a fixed window, each tier sized to its own threat rather than sharing one global cap:

- **auth** (login/register) — strict, to blunt brute-force password guessing;
- **refresh** — generous, because the silent refresh is automated and a tight limit would lock out normal browsing;
- **general API** — a moderate cap against spam and abuse on everything else;
- **verification issue** — guards outbound spend and sender reputation rather than secrecy; the durable control is the per-address cooldown [Channel Verification](channel-verification.md) enforces, and this limiter is only the cheap outer layer;
- **verification confirm** — sized for people mistyping rather than for attackers, since a single-use code of that length is out of brute-force reach whatever this limiter says;
- **the three password-reset tiers**, across four routes — requesting a code and resending one share a budget, because minting from either is the same act and separate budgets would make the real ceiling their sum. The actor is the reason they are sized differently from the verification pair rather than the operation: those endpoints sit behind the auth guard, so a caller must already hold a session to reach them, while these are anonymous. **Applying is the tightest**, since it hashes a password before the code is examined, so even a rejected request costs real work. The shared mint budget is the widest of the three because it is sized for a whole recovery — a request, its resends, and a correction if the address was mistyped — rather than for one call. As with verification, the durable controls sit beneath them — the per-account cooldown [Password Reset](password-reset.md) enforces and the per-recipient cap [Mail Delivery](mail.md) does.

The exact windows, limits, and `429` messages are owned by the [API contract](../api/api-contract.md). The app **trusts one proxy hop** so the limiter keys on the real client IP behind a reverse proxy — otherwise everyone behind the proxy would share a single counter.

**Outbound send limits are not these limiters', and are not this document's.** The per-recipient cap and the global outbound ceiling the mail mechanism applies to messages it sends are a **Mail Delivery mechanism owned by [`backend/mail.md`](mail.md)** — the same cession this document makes for Media's read-side posture. They are a different kind of control from the ones here: these bound what arrives at the edge, per IP, in memory; those bound what leaves, per recipient and in total, durably.

## HTTP hardening

Applied once, at the edge, before any route:

- **`helmet`** sets the standard security headers (CSP, `nosniff`, frame denial, HSTS, a **`same-origin` `Cross-Origin-Resource-Policy`** baseline, …);
- **CORS** allows a **single configured origin** (an env var — not a wildcard, not hardcoded localhost) with credentials enabled so the cookie can travel cross-origin;
- the JSON body parser caps payloads at **16 kB** to refuse memory-exhaustion payloads (the multipart **`POST /media`** ingest route is exempt — it streams and enforces its own media size limit, owned by [`backend/media.md`](media.md));
- the server **fails fast** if it cannot reach the database at startup, **shuts down gracefully** (draining in-flight requests, then disconnecting the pool) on `SIGTERM`/`SIGINT`, and exposes a **health check that actually pings the database**.

The **Media read route** (`GET /media/:token`) deliberately overrides the `same-origin` CORP baseline with a route-scoped `Cross-Origin-Resource-Policy: cross-origin`, so public, opaque-token media can be embedded cross-origin — this is not an authorization control (a direct GET bypasses it). That read-side security posture — the content-derived, non-sniffable served type, the CORP override, and the bounded cache window — is a Media mechanism owned by [`backend/media.md`](media.md).

## Principles applied

These mechanisms are the backend's application of the security principles ([Engineering Principles §7](../development/engineering-principles.md)): validate at the boundary, never trust the client, defense in depth (independent layers — validation, guards, database constraints), least privilege (narrow tokens, a single CORS origin), and no secrets on the client (the refresh token is `HttpOnly`; the password hash never leaves the database). The typed error model that carries these failures is owned by the [backend conventions](conventions.md).

---

> This document owns the backend's security mechanisms and their rationale. The wire contract is owned by the API contract, the security principles by Engineering Principles, the error model by the backend conventions, and the frontend token handling by the [frontend API client](../frontend/api-client.md) — linked here, never duplicated.
