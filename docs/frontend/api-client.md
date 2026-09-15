# Frontend API Client

> **Status:** Active.
> **Authority:** The authoritative source for the frontend's **transport layer** — how an HTTP request leaves the frontend and reaches the backend: the transport clients in use, how each is selected, how the access token is attached, and how the refresh cookie participates. It owns the *transport*, not a library. It does **not** own the wire contract (the endpoints, payloads, and error shapes are the [API contract](../api/api-contract.md)'s), the **error-normalization pipeline** (the [frontend error handling](error-handling.md) document), the **RTK Query cache/data layer** (the frontend state-and-data document, deferred), or the **server** side of the token model ([Backend Security](../backend/security.md)).
> **Scope:** The shared transport mechanisms in `apps/web/src/shared/api/` and `apps/web/src/shared/rtk-query/`. Each capability's own calls live in its `gateway/`, not here; the end-to-end request lifecycle in the [system overview](../architecture/system-overview.md).
> **Version:** 1.3
> **Last Updated:** 2026-09-15
> **Owner:** Basel Ghonaim

## Current transport architecture

The frontend reaches the backend through **two transport stacks**, kept in strictly separate folders:

- **Axios** (`apps/web/src/shared/api/`) — the clients every capability's gateway reaches the server through today.
- **RTK Query `fetchBaseQuery`** (`apps/web/src/shared/rtk-query/`) — wired, and serving nothing: `baseApi` injects no endpoints yet.

**A capability's calls to the server live in its own `gateway/`** ([frontend architecture](architecture.md#the-capability-structure)); this layer supplies the clients, the envelope and the interceptors, and holds no capability's endpoints. So there is no selection *rule* to state — every gateway in the tree chooses an Axios client, and the second stack waits for the first consumer that wants a cache. That reflects the **current implementation**, not a permanent architectural constraint. Both attach the same access token and rely on the same `HttpOnly` refresh cookie issued by the backend.

## How a request leaves the frontend

Whichever stack issues it, an outgoing request carries the **access token** as an `Authorization: Bearer <token>` header when one is present, and targets the backend under `/api/v1`. Every response — success or failure — is funnelled through error normalization so a caller only ever sees one typed `AppError` (the normalization pipeline is owned by the [frontend error handling](error-handling.md) document).

Every capability reaches the server through its own gateway over one of the three Axios clients below. **Session renewal happens only through the Axios stack** (below), because the session is what renews and its gateway is there; the RTK Query stack carries the current token and performs no refresh of its own. That reflects where the session currently lives, not a rule that the RTK Query stack must never refresh.

## The Axios stack

### Three clients

| Client | Auth header | Credentials | Retry | 401 refresh | Used for |
|---|---|---|---|---|---|
| `apiClient` | no | no | yes | no | public endpoints |
| `publicCredentialedClient` | no | `withCredentials: true` | yes | no | anonymous endpoints the server addresses by a cookie it set |
| `authClient` | yes | `withCredentials: true` | yes | yes | authenticated endpoints |

**Being authenticated and sending credentials are separate properties**, and the third client exists because they are. An endpoint can require the browser's cookie while requiring no session at all — account recovery is the first, and the emailed-link path it defers would be the second. Attaching a token there would send one where none is read, and arming the refresh replay would drive a session flow on behalf of a signed-out reader.

It is a third client rather than a per-call flag so the properties live in the thing's shape, and rather than a factory because one instance cannot shape what varies ([Engineering Principles §3](../development/engineering-principles.md)). Unlike `authClient` it needs no setup seam: it injects nothing, so the composition root does not wire it.

### Configuration

`config.ts` is the single source for the Axios base URL and timeout — `API_BASE_URL` (from `VITE_API_URL`, defaulting to `http://localhost:4000/api/v1`) and a 10-second `API_TIMEOUT`. All three clients read from it.

### Interceptor pipeline

Interceptors run in registration order on the way out and reverse order on the way back:

- **Token attachment** (request) — reads the access token through an **injected callback** and sets the `Authorization` header. The interceptor has no idea where the token is stored, so `shared/` stays free of Redux.
- **Retry** (response) — exponential backoff (1s → 2s, max 2 retries) for transient failures only: `500/502/503/504` and the network/timeout codes (`ERR_NETWORK`, `ECONNABORTED`). Client `4xx` errors are never retried.
- **Normalization + 401 refresh** (response) — converts any error to an `AppError` (pipeline owned by the [frontend error handling](error-handling.md) document) and, on `authClient`, drives the refresh flow.

### 401 refresh with request replay

When `authClient` receives a `401`, it refreshes **once** and replays: the refresh is **single-flight** — only one `/api/v1/auth/refresh` call is made while concurrent `401`s queue and then replay with the new token. A request is retried at most once (an `_retry` guard), a `401` from the refresh endpoint itself ends the session, and the refresh state (`isRefreshing`, the pending queue) is **scoped per client instance**, not shared globally.

### Decoupling (`setupAuthClient`)

`shared/` imports nothing from `app/`, `pages/` or `features/`. `authClient` exposes `setupAuthClient(getAccessToken, callbacks)`, wired once from `app/bootstrap.ts`, which injects the token getter and the refresh/expiry callbacks. The dependency direction is always `app → shared`, never the reverse — the dependency-inversion principle ([Engineering Principles §2, §3](../development/engineering-principles.md)).

## The RTK Query stack (transport)

When a consumer arrives, its requests go through `fetchBaseQuery`, wrapped by `unifiedBaseQuery`:

- **Token attachment** — `prepareHeaders` reads the access token from the **session**'s slice, through that capability's own selector rather than a guess at the state's shape. The platform reads the session as a peer ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 7); the cache/data layer built on this is the state-and-data document's (deferred).
- **No refresh of its own (current implementation)** — this stack neither sends credentials nor performs a `401` refresh; it relies on the access token kept current by the session's own refresh over Axios. It is not a permanent constraint on RTK Query.
- **Normalization** — `unifiedBaseQuery` converts any `fetchBaseQuery` error to an `AppError` before it reaches a hook, so components stay agnostic of the transport (pipeline owned by the [frontend error handling](error-handling.md) document).

The cache/data layer built on top — `createApi`, `injectEndpoints`, tag invalidation, and the generated hooks — is owned by the **state-and-data document** (deferred), not here.

## Base URL configuration

The two stacks currently configure their base URL differently, recorded here exactly as implemented:

- **Axios** — `API_BASE_URL` from `config.ts`: an **absolute, env-driven** URL (`VITE_API_URL`).
- **RTK Query** — `fetchBaseQuery({ baseUrl: "/api/v1" })`: a **relative, same-origin** URL, hardcoded, bypassing `config.ts`.

They therefore make different deployment assumptions (absolute origin vs. same-origin/proxy). Whether this should be unified is under investigation in [#240](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/240); this document records the current implementation only.

## The client side of the token model

This is the **client** half of the hybrid storage model whose server half — issuing, rotation, and cookie flags — is owned by [Backend Security](../backend/security.md):

- **Access token** — held **in memory** (the session slice, `shared/session`), never persisted to storage, and attached as a bearer header. Its short life keeps memory exposure low-risk.
- **Refresh token** — never visible to JavaScript: it travels only as the backend's `HttpOnly` cookie, which `authClient` returns on the refresh call via `withCredentials`. The frontend neither reads nor stores it.

## Principles applied

The transport layer applies the project's principles: dependency inversion (`setupAuthClient` keeps `shared/` free of app knowledge), one typed error shape across both stacks (normalization owned by the [frontend error handling](error-handling.md) document), and resilience at the edge (bounded retry with backoff) — see [Engineering Principles](../development/engineering-principles.md).

---

> This document owns the frontend's transport layer. The wire contract is owned by the [API contract](../api/api-contract.md), the error-normalization pipeline by the [frontend error handling](error-handling.md) document, the RTK Query cache/data layer by the frontend state-and-data document (deferred), the request lifecycle by the [system overview](../architecture/system-overview.md), and the server side of the token model by [Backend Security](../backend/security.md) — linked here, never duplicated.
