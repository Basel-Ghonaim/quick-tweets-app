# Frontend Error Handling

> **Status:** Active.
> **Authority:** The authoritative source for the frontend **error-normalization pipeline** — how any caught error, from either transport stack or from native code, becomes one typed `AppError` before it reaches the UI. It owns the *mechanism* of convergence. It does **not** own the wire error taxonomy, status codes, or error-body shape (the [API contract](../api/api-contract.md)), the transport **call sites** that invoke it (the [frontend API client](api-client.md)), the backend error model that produces the errors ([backend conventions](../backend/conventions.md)), or the one-typed-error **principle** ([Engineering Principles §4](../development/engineering-principles.md)).
> **Scope:** The shared error layer in `src/shared/errors/`. The end-to-end request lifecycle these errors travel lives in the [system overview](../architecture/system-overview.md).
> **Maturity:** This document describes the **currently implemented** pipeline, which is mature. It extends only if a new error *source* or *type* is added; anything not covered here is not yet handled, not deliberately excluded.
> **Version:** 1.0
> **Last Updated:** 2026-06-30
> **Owner:** Basel Ghonaim

## One typed error, everywhere

The whole point of the layer is a single guarantee: **no component, hook, or business-logic path ever sees a raw error.** Every failure is converted to one typed `AppError` first, so the rest of the app reasons about errors in one vocabulary and never branches on where an error came from or which library produced it.

## Convergence: one normalizer, many sources

A single entry point normalizes **any** value into an `AppError`. It recognizes each source in turn — an already-normalized `AppError` passes straight through, an Axios error and an RTK Query error each go to their source parser, and anything unrecognized becomes a safe `unknown` error rather than leaking out. The effect is that **both transport stacks** (Axios and RTK Query `fetchBaseQuery`) and native/unexpected failures **collapse to the same shape**. The transport layer that calls the normalizer is the [frontend API client](api-client.md)'s; this document owns the conversion itself.

## The role of the transport-specific parsers

Each transport reports failure in its own dialect — Axios distinguishes an HTTP response from transport-level codes (network, timeout, cancellation); RTK Query distinguishes its own string transport statuses from numeric HTTP results. A **parser per transport** translates that dialect into the shared error type, and both parsers then delegate HTTP responses to **one common builder** that reads the standard backend error body. The parsers exist so the normalizer stays source-agnostic: supporting a new transport means adding a parser, not editing the core. (Their individual cases are implementation, not documented here.)

## Why a centralized registry

A single registry maps each error type to its HTTP status and a **frontend-owned default message**, and provides the reverse status→type lookup used when a response carries no recognizable type. It is the one source of truth for "what status and what user-facing message each type carries." The important consequence is that **messages are frontend-driven**: the backend supplies the error *type* and any field-level validation errors — not display text — so the UI owns wording (consistent, localizable) and still degrades gracefully when only a status code is available. The type set mirrors the contract's taxonomy plus a few types the client **synthesizes when no HTTP response is available** (network, timeout, cancellation) or when the error is unrecognized (unknown); the authoritative taxonomy and status codes remain the [API contract](../api/api-contract.md)'s.

## The `AppError` shape and the public API

`AppError` extends the native error with a `type`, a `status` (derived from the registry, never hand-set), and optional field-level `errors` for validation. The layer's **public surface** is deliberately narrow — the `AppError` type, its factories, the error-type definitions, and the normalizer — while the registry and the parsers are internal implementation reached only through the normalizer.

## Where it sits in the stack

This pipeline is the client end of a cross-stack error chain: errors are **produced** by the backend error model ([backend conventions](../backend/conventions.md)), travel over the wire in the shape the [API contract](../api/api-contract.md) defines, are **invoked** at the transport call sites in the [frontend API client](api-client.md), and are **consumed** as a uniform `AppError` by the UI. The whole chain rests on one principle — a single typed error shape end to end ([Engineering Principles §4](../development/engineering-principles.md)).

---

> This document owns the frontend error-normalization pipeline. The wire error taxonomy and shapes are owned by the [API contract](../api/api-contract.md), the transport call sites by the [frontend API client](api-client.md), the backend error model by the [backend conventions](../backend/conventions.md), and the underlying principle by [Engineering Principles §4](../development/engineering-principles.md) — linked here, never duplicated.
