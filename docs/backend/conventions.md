# Backend Conventions

> **Status:** Active.
> **Authority:** The authoritative source for the backend's **cross-cutting conventions and mechanisms** — how a feature module is structured, how responses are shaped, how errors are modelled, how requests are validated, and how lists are paginated. It owns the *how*; it does not own the wire contract (see the [API contract](../api/api-contract.md)), security mechanisms (see [Backend Security](security.md)), or the design principles these mechanisms apply (see [Engineering Principles](../development/engineering-principles.md)).
> **Scope:** Patterns shared across backend feature modules. Per-feature business logic lives in the feature documents; the end-to-end request lifecycle lives in the [system overview](../architecture/system-overview.md).
> **Version:** 1.0
> **Last Updated:** 2026-06-29
> **Owner:** Basel Ghonaim

## Module layering

Every feature module (auth, tweets, comments, users, follows) is internally layered, and each layer talks only to the one beneath it:

- **Routes** wire the per-endpoint middleware chain (auth guard → validation → controller) and are mounted under `/api/v1/<resource>`.
- **Controller** handles HTTP only — it reads validated input, calls the service, and writes the response envelope. No business rules.
- **Service** holds the business rules — pagination math, DTO mapping, ownership checks, race-condition handling. It depends on a repository *interface*, never on Prisma directly.
- **Repository** performs data access (Prisma queries) behind that interface, and nothing else.

This is the backend application of the layering and dependency-inversion principles ([Engineering Principles §2, §3](../development/engineering-principles.md)).

### Dependency injection

Dependencies are injected by **factory functions with default parameters** — no DI container, no decorators. Each layer's factory takes its dependency and defaults to the real one:

```text
createController(service = createService())
  → createService(repo = createRepository())
    → createRepository(db = prisma)   // the shared Prisma singleton
```

Routes instantiate with the defaults; tests inject a mock (a plain object matching the layer's interface) without touching the database. The `I<Name>Service` / `I<Name>Repository` interfaces define the contract and enable substitution; they are type-checked, not enforced at runtime.

### DTOs and mappers

A repository returns database rows; a **mapper** — a pure function per resource — converts them to the response **DTO** the contract defines (e.g. collapsing a `_count` and a relation array into `likesCount` / `isLiked`). Mappers live in their own unit so a sibling module can reuse one without importing another module's service (avoiding cross-module cycles). Domain code depends on the DTO, not the raw row — the DTO/Entity/Mapper principle ([Engineering Principles §4](../development/engineering-principles.md)).

## The response envelope

Every successful response is written through one helper — `sendSuccess(res, data, statusCode = 200, meta?)` — which emits the standardized envelope and sends an empty body for `204`. No controller hand-rolls a response shape. The **shape itself** (the success and error bodies, the `meta` fields) is owned by the [API contract](../api/api-contract.md); the convention here is simply that the backend *always* goes through the helper.

## The error model

Errors use one typed shape, end to end ([Engineering Principles §4](../development/engineering-principles.md)):

- Any layer signals failure by **throwing an `AppError`**, created through a factory method (`AppError.notFound`, `.forbidden`, `.conflict`, `.validation`, `.unauthorized`, …) that carries a `type`, an HTTP `statusCode`, and optional field-level `errors`.
- A single **global error handler** (the last middleware) catches everything: an `AppError` becomes the error envelope at its status code; any *unknown* error is logged and returned as a generic `500`.

Business code therefore never builds an error response — it throws a typed error and trusts the handler. The error **type taxonomy and status mapping** are owned by the [API contract](../api/api-contract.md); this document owns the *mechanism* — throw an `AppError`, normalize once at the boundary. The frontend normalization of these errors into a client-side `AppError` is owned by the [frontend error handling](../frontend/error-handling.md) pipeline.

## Request validation

Untrusted input is validated at the boundary before it reaches a controller ([Engineering Principles §7](../development/engineering-principles.md)). A generic `validate(schema, source = "body" | "query")` middleware:

- on success, validates the chosen source against a **Zod** schema and hands the controller the parsed, typed value — so a controller works with clean, coerced data, never raw input;
- on failure, throws `AppError.validation` (`422`) with per-field messages.

Numeric query params (`cursor`, `limit`, `page`) are coerced and bounded in the schema (e.g. `limit` carries a default and a cap), so controllers never parse query strings by hand.

## Pagination

Two conventions, chosen by the shape of the data — the rationale and the supporting indexes are owned by the [data model](../architecture/data-model.md), the `meta` shapes by the [API contract](../api/api-contract.md):

- **Cursor** — for unbounded, chronological lists (the feed, author timelines, follower/following lists). The repository fetches **`limit + 1`** rows from the cursor; the service uses the extra row to set `hasMore`, trims to `limit`, and returns `nextCursor` (the last id) or `null`. This avoids a `COUNT` per page and is stable under inserts and deletes.
- **Offset** — for small, bounded lists (comments on a tweet). The service computes `skip = (page − 1) × limit`, runs the page query and a `count` in parallel, and returns `currentPage` / `totalPages` / `hasNextPage` / `hasPreviousPage` for a page navigator.

Both keep queries **bounded** and fetch related data in one query to avoid N+1 ([Engineering Principles §9](../development/engineering-principles.md)).

## Shared utilities

A few helpers carry these conventions across modules:

- **`parseId`** — parses a route id to a positive integer, throwing a typed validation error on bad input, so controllers never trust a raw param.
- **`isPrismaError`** — duck-types a Prisma error by code (e.g. a unique-constraint violation), so a race resolves to a correct response (a double-like settles idempotently) instead of a `500`.
- **resource mappers** — the pure row → DTO functions described above.

---

> This document owns the backend's cross-cutting conventions and mechanisms. Wire shapes are owned by the API contract, security mechanisms by [Backend Security](security.md), the request lifecycle by the system overview, and the underlying principles by Engineering Principles — linked here, never duplicated.
