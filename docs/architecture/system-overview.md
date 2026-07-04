# System Overview

> **Status:** Active.
> **Authority:** The authoritative source for the system **topology** and the end-to-end **request lifecycle** across frontend, backend, and database. Per-subsystem mechanism detail and the wire contract are owned by their documents and linked here, never restated.
> **Scope:** How the parts fit together and how a request flows through them. It does not specify endpoints (see the [API contract](../api/api-contract.md)) or per-subsystem internals (see the backend and frontend platform documents).
> **Version:** 1.0
> **Last Updated:** 2026-06-28
> **Owner:** Basel Ghonaim

## Topology

quick-tweets is a monorepo of three tiers communicating over HTTP/JSON:

- **Frontend** — a React 19 single-page app with Redux Toolkit (`src/`). Holds UI state and a normalized server-cache; it never talks to the database.
- **Backend** — an Express 5 HTTP API (`server/`) served under the `/api/v1` prefix. It owns all business rules and is the only tier that touches the database.
- **Database** — PostgreSQL, reached exclusively through Prisma; only the backend touches it.

The dependency is one-directional: the frontend depends on the contract, the backend fulfils it, and the database sits behind the backend as an implementation detail. The contract between frontend and backend — endpoints, payloads, error shapes, pagination — is owned by the [API contract](../api/api-contract.md).

## Request lifecycle

A typical authenticated request travels end to end as follows:

1. **Frontend dispatch.** A component triggers a request through the frontend's data layer, carrying the user's **access token** as an `Authorization: Bearer` header.
2. **Transport.** The request crosses to the backend over HTTP/JSON.
3. **Backend middleware chain**, applied in order: security headers → CORS → JSON body parsing (bounded size) → cookie parsing → request logging → a per-route **rate limiter** → an **auth guard** (strict, or optional for guest-readable routes) → **schema validation** (Zod). A request that fails any gate is rejected before it reaches business logic.
4. **Layered module.** Inside a feature module the request flows **controller → service → repository**: the controller handles HTTP concerns (status, cookies, response shaping), the service holds business rules and depends on repository *interfaces* (built by factory functions — dependency injection), and the repository performs the Prisma queries. Business logic never imports the database client directly.
5. **Database.** Prisma executes the query against PostgreSQL and returns domain rows.
6. **Response.** On success the result is wrapped in the standardized **response envelope** (`success` / `data` / optional `meta`). On failure any layer throws a typed **`AppError`**, which a single global error handler normalizes into the error envelope — so every response, success or failure, has one predictable shape (owned by the [API contract](../api/api-contract.md)).
7. **Frontend handling.** The frontend normalizes the response — every error collapses to one typed shape — updates its state, and the component re-renders.

## Cross-cutting architecture

- **Layered modules, dependencies inward.** Each backend feature module is internally layered (controller → service → repository) and depends on abstractions, not concretions — the application of the layering and dependency-inversion principles ([Engineering Principles §3, §5](../development/engineering-principles.md)).
- **One envelope, one error shape.** Every response is wrapped, and every error — from any layer or any source — is normalized to one typed shape on **both** sides (backend `AppError` ↔ frontend error normalizer). The shapes themselves are owned by the [API contract](../api/api-contract.md).
- **Token-based authentication.** A short-lived JWT **access token** authorizes API calls; a long-lived **refresh token** renews it without re-login. The token model — how each token is stored, the refresh flow, and session bootstrap — is owned by [Backend Security](../backend/security.md) and the [frontend API client](../frontend/api-client.md).
- **Defense at the boundary.** Untrusted input is gated before business logic by rate limiting, schema validation, security headers, and auth guards — independent layers, so a single gap is not fatal.

## Where the details live

This document owns the topology and lifecycle only; each subsystem's internals are owned elsewhere:

| Concern | Owner |
|---|---|
| Endpoints, payloads, error shapes, pagination | [API contract](../api/api-contract.md) |
| Entities, relationships, cascade, indexing | [`architecture/data-model.md`](data-model.md) |
| Backend layering, response wrapper, validation, security mechanisms | [`backend/conventions.md`](../backend/conventions.md) + [`backend/security.md`](../backend/security.md) |
| Axios clients & interceptors, RTK Query, error normalization | [`frontend/api-client.md`](../frontend/api-client.md) + [`frontend/error-handling.md`](../frontend/error-handling.md) + `frontend/state-and-data.md` *(deferred)* |
| A known deviation from this intended architecture | [Finding 0001 — schema-form ↔ design-system cycle](findings/0001-schema-form-design-system-cycle.md) |

---

> This document owns the cross-system topology and request lifecycle. Endpoints, the data model, and per-subsystem mechanisms are owned by their documents and linked here — never duplicated.
