# Shared API & Error Layer — Architecture Documentation

## Overview

Two shared layers that handle all HTTP communication and error normalization for the frontend. Every API call flows through these layers before reaching any component or store.

---

## Error Layer (`shared/errors/`)

### Purpose

Converts any caught error (Axios, native, unknown) into a typed `AppError` with a consistent shape. Components never see raw errors.

### Flow

```
caught error → errorNormalizer → (axiosParser | createUnknownError) → AppError
```

### Files

| File | Role |
|---|---|
| `types.ts` | `ErrorType` union (16 types), `httpStatusMap`, `ErrorPayload<T>` generic |
| `AppError.ts` | Error class: `type`, `status`, `errors?`. Extends native `Error` |
| `errorFactory.ts` | `createAppError()` — typed factory. `createUnknownError()` — fallback |
| `errorNormalizer.ts` | Entry point: `unknown → AppError`. Routes to correct parser |
| `parsers/axiosParser.ts` | Maps Axios HTTP status → `ErrorType`. Reads backend error response |
| `index.ts` | Barrel — explicit named exports only |

### ErrorType → HTTP Status Mapping

| Type | Status | Origin |
|---|---|---|
| `bad_request` | 400 | Backend |
| `unauthorized` | 401 | Backend (`authentication`) |
| `forbidden` | 403 | Backend (`authorization`) |
| `not_found` | 404 | Backend |
| `timeout` | 408 | Axios (`ECONNABORTED`) |
| `conflict` | 409 | Backend |
| `payload_too_large` | 413 | Backend |
| `unsupported_media_type` | 415 | Backend |
| `validation` | 422 | Backend (with field-level `errors`) |
| `too_many_requests` | 429 | Backend |
| `canceled` | 499 | Axios (`ERR_CANCELED`) |
| `server` | 500 | Backend (any 5xx) |
| `unknown` | 500 | Fallback for unrecognized errors |
| `service_unavailable` | 503 | Backend |
| `network` | 0 | Axios (`ERR_NETWORK`) |

### Backend Error Contract

The backend sends errors in this shape:

```json
{
  "success": false,
  "error": {
    "type": "validation",
    "message": "Email is required",
    "errors": { "email": ["Email is required"] }
  }
}
```

The parser reads from `response.data.error.message` and `response.data.error.errors`.

### Barrel Exports (public API)

```typescript
export { AppError } from "./AppError";
export { createAppError, createUnknownError } from "./errorFactory";
export { errorNormalizer } from "./errorNormalizer";
export type { ErrorType, ErrorPayload, ValidationErrorsPayload } from "./types";
```

`httpStatusMap` is **not exported** — it's an internal implementation detail consumed only by `AppError`.

---

## API Layer (`shared/api/`)

### Purpose

Provides pre-configured Axios instances with interceptors. Zero domain knowledge — doesn't know about Redux, auth, or any module.

### Clients

| Client | Auth | Credentials | Retry | Refresh | Used By |
|---|---|---|---|---|---|
| `apiClient` | No | No | Yes | No | Public endpoints |
| `authClient` | Yes (via `setupAuthClient`) | `withCredentials: true` | Yes | Yes (401 → refresh) | Authenticated endpoints |

### Interceptor Pipeline

Interceptors execute in registration order for requests, **reverse order for responses**:

```
Request:   attachToken → [send request]
Response:  retryInterceptor → responseInterceptor → [caller receives data or AppError]
```

#### `interceptors/request.ts` — Token Attachment

Attaches `Authorization: Bearer <token>` header. Reads token via callback (no Redux dependency).

#### `interceptors/retry.ts` — Transient Failure Retry

- Retries on: `500`, `502`, `503`, `504`, `ECONNABORTED`, `ERR_NETWORK`
- Does NOT retry: `4xx` (client errors are intentional)
- Max 2 retries (3 total attempts)
- Exponential backoff: 1s → 2s
- Configurable via `RetryOptions`

#### `interceptors/response.ts` — Error Normalization + 401 Refresh

Two modes:
- **Without callbacks** (apiClient): normalizes errors only
- **With callbacks** (authClient): on 401 → refresh token → retry original request

Concurrent 401 handling: if multiple requests fail with 401 simultaneously, only ONE `/auth/refresh` call is made. All others queue and retry with the new token.

Refresh state (`isRefreshing`, `pendingRequests`) is **scoped per client instance**, not shared globally.

### Configuration (`config.ts`)

```typescript
API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1"
API_TIMEOUT  = 10_000
```

Both clients read from this config. To change the API URL for deployment, set `VITE_API_URL` in `.env`.

### Setup Pattern (`setupAuthClient`)

`authClient.ts` has **zero imports** from `@app/store` or `@modules/auth`. It exports a `setupAuthClient()` function that accepts callbacks. The app layer wires it in `app/bootstrap.ts`:

```
main.tsx → bootstrap() → setupAuthClient(getToken, { refresh, onRefreshed, onExpired })
```

This keeps `shared/` free of domain knowledge. The dependency flow is always: `app → shared`, never `shared → app`.

### Barrel Exports (public API)

```typescript
export { apiClient } from "./client";
export { authClient, setupAuthClient } from "./authClient";
```

---

## Changes Made in This Branch (`fix/shared-api-errors`)

### Commit 1: Backend Error Contract Fix

**Problem:** Parser read `response.data.message` but backend sends `response.data.error.message`. Every error showed hardcoded fallback messages.

**Fix:** Updated `BackendErrorResponse` interface and parser paths:
```diff
- const backendMessage = response?.data?.message;
+ const backendMessage = response?.data?.error?.message;
```

### Commit 2: Environment Config

**Problem:** `baseURL: "http://localhost:4000/api/v1"` hardcoded in two files.

**Fix:** Created `config.ts` with `API_BASE_URL` (reads `VITE_API_URL` env var) and `API_TIMEOUT`. Both clients import from config.

### Commit 3: Decouple authClient from Redux

**Problem:** `authClient.ts` imported `reduxStore` and `authActions` directly — shared layer depending on app layer (DIP violation).

**Fix:**
- Removed all Redux imports from `authClient.ts`
- Added `setupAuthClient()` function that accepts callbacks
- Created `app/bootstrap.ts` that wires Redux into authClient
- Called `bootstrap()` in `main.tsx` before rendering
- Fixed logout action: now uses `authActions.authLogout()` instead of `authRequestFulfilled`

### Commit 4: Scope Refresh State

**Problem:** `isRefreshing` and `pendingRequests` were module-level globals shared across all clients.

**Fix:** Moved both variables inside the `responseInterceptor` closure — each client gets its own refresh state.

### Commit 5: Merge econnaborted + Explicit Barrel

**Problem:** `econnaborted` and `timeout` were separate ErrorTypes mapping to the same HTTP 408. Barrel used `export *` leaking `httpStatusMap`.

**Fix:** Removed `econnaborted` from `ErrorType`. Replaced `export *` with explicit named exports.

### Commit 6: Retry Interceptor

**Problem:** No retry logic for transient failures. A single dropped packet killed the request.

**Fix:** Created `interceptors/retry.ts` with exponential backoff. Wired into both clients. Configurable via `RetryOptions`.

### Commit 7: Documentation

Stripped verbose inline JSDoc (1-2 lines per file max). Created this documentation file.
