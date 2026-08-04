# API Contract — Quick Tweets

> This document defines the request/response shapes for all API endpoints.
> It is the agreement between backend and frontend.
> No implementation should deviate from this contract without updating it first.

**Base URL:** `http://localhost:4000/api/v1`

---

## Versioning Policy

- The API is versioned via the URL path (`/api/v1/`).
- **Breaking changes** (e.g., modifying response shapes, removing fields, renaming endpoints) will result in a new version (`v2`).
- **Additive changes** (e.g., adding new optional fields like `updatedAt` or new endpoints) will be added to the current version and documented here.

### Pre-release Contract Exceptions

`v1` is not yet released to any consumer. Where a change would formally require `v2` but no consumer can possibly depend on the field being removed, it is taken **in `v1` as a recorded exception** rather than forcing a premature version bump. Every such exception is listed here — the deviation is stated, never silent. This section closes once `v1` has a released consumer.

| Change | Why an exception rather than `v2` |
|---|---|
| Tweet responses: `image` removed, superseded by the ordered `media` array | The field was documented as *"Reserved for future use. Always null in v1"* and never had a write path, so it never carried a value anything could depend on. No client reads it — the tweets UI has not been built. |

---

## Migration Note — Flat Route Reform

As of this version, all nested routes have been migrated to a flat, resource-oriented structure.
The old nested paths below are **removed** and will return `404`:

| Old (Removed) | Replaced By |
|---|---|
| `GET  /tweets/:tweetId/comments` | `GET  /comments?tweetId=X` |
| `POST /tweets/:tweetId/comments` | `POST /comments` (body includes `tweetId`) |
| `PATCH /tweets/:tweetId/comments/:commentId` | `PATCH /comments/:id` |
| `DELETE /tweets/:tweetId/comments/:commentId` | `DELETE /comments/:id` |
| `GET  /users/:username/tweets` | `GET  /tweets?author=:username` |
| `POST /users/:username/follow` | `POST /follows/:username` |
| `DELETE /users/:username/follow` | `DELETE /follows/:username` |
| `GET  /users/:username/followers` | `GET  /follows/:username/followers` |
| `GET  /users/:username/following` | `GET  /follows/:username/following` |

**Rationale:** Flat routes simplify client cache organization and resource ownership.
Each resource lives at a predictable, stable prefix that maps 1:1 to an RTK Query tag.

---

## Route Map

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
POST   /api/v1/auth/refresh

GET    /api/v1/tweets
GET    /api/v1/tweets?author=:username
GET    /api/v1/tweets/:id
POST   /api/v1/tweets
PATCH  /api/v1/tweets/:id
DELETE /api/v1/tweets/:id
POST   /api/v1/tweets/:id/like

GET    /api/v1/comments?tweetId=:tweetId
POST   /api/v1/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id

GET    /api/v1/users/:username

POST   /api/v1/follows/:username
DELETE /api/v1/follows/:username
GET    /api/v1/follows/:username/followers
GET    /api/v1/follows/:username/following

POST   /api/v1/channel-verification/challenges          (authenticated)
POST   /api/v1/channel-verification/challenges/confirm  (authenticated)

POST   /api/v1/media            (authenticated)
GET    /media/:token             (top-level, outside /api/v1 — a stable public read URL)
```

> **Health check:** `GET /health` (outside `/api/v1`) returns `{ status, db, timestamp }` — `200` when the database ping (`SELECT 1`) succeeds, `503` when it fails. Used for infrastructure monitoring; not part of the versioned API.

---

## Response Wrapper

Every API response follows this standardized format:

### Success Response

```typescript
{
  success: true,
  data: T,                            // object or array (204 responses have no body)
  meta?: Record<string, unknown>      // pagination, counts, etc.
}
```

### Error Response

```typescript
{
  success: false,
  error: ErrorBody
}
```

The `ErrorBody` shape — the complete `type` taxonomy, the `message`, and optional field-level `errors` — is defined once under [Shared Types](#shared-types) below.

---

## Shared Types

### AuthorEmbed

Embedded in tweets and comments — a lightweight user snapshot.

```typescript
interface AuthorEmbed {
  id: number;
  username: string;
  name: string | null;         // optional profile data; when null, presentation falls back to username
  profileImage: string | null; // DEPRECATED (always null) — author-avatar display migrates
                               // to the Media Reference model in a later Work Item.
}
```

### TweetMediaEmbed

Embedded in tweet responses as an **ordered** array — the array order *is* the display order.

```typescript
interface TweetMediaEmbed {
  token: string; // opaque read handle — GET /media/:token
}
```

The numeric Media Reference and the stored ordering position are deliberately **not** exposed: the reference is internal to Media, and exposing a position alongside array order would give ordering two sources of truth.

Attach media by submitting these tokens on `POST`/`PATCH /tweets` — see those endpoints. Every token returned here is **servable**: a reference that no longer resolves to a readable object is omitted rather than returned, so a client never receives a token it cannot fetch.

### CursorPaginationMeta

The cursor is the `id` of the last item returned. When cursor pagination is used, and why, is owned by the [backend pagination convention](../backend/conventions.md#pagination).

```typescript
interface CursorPaginationMeta {
  nextCursor: string | null;  // id of last item (returned as string), null if no more pages
  limit: number;              // items per page (default: 10, max: 50)
  hasMore: boolean;           // are there more items after this page?
}
```

**Query params:** `?cursor=<id>&limit=10`

**Used by:** `GET /tweets`, `GET /tweets?author=username`, `GET /follows/:username/followers`, `GET /follows/:username/following`

### OffsetPaginationMeta

When offset pagination is used, and why, is owned by the [backend pagination convention](../backend/conventions.md#pagination).

```typescript
interface OffsetPaginationMeta {
  currentPage: number;
  limit: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

**Query params:** `?page=1&limit=20` — `page` defaults to `1`, `limit` defaults to `20` (max `50`)

**Used by:** `GET /comments?tweetId=X`

### Error Response

Consistent across all endpoints. Wrapped in the response wrapper above.

```typescript
// Wrapped shape: { success: false, error: ErrorBody }
interface ErrorBody {
  type:
    | "bad_request"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "gone"
    | "conflict"
    | "validation"
    | "rate_limit"            // emitted by the rate-limiter middleware (429)
    | "too_many_requests"
    | "payload_too_large"
    | "unsupported_media_type"
    | "service_unavailable"
    | "server";
  message: string;
  errors?: Record<string, string[]>;  // field-level validation errors
}
```

| HTTP Status | Error Type              | When                                                                   |
| ----------- | ----------------------- | ---------------------------------------------------------------------- |
| 400         | `bad_request`           | Generic malformed request (missing headers, bad format)                 |
| 401         | `unauthorized`          | Missing or invalid JWT                                                 |
| 403         | `forbidden`             | Authenticated but not authorized (e.g., deleting someone else's tweet) |
| 404         | `not_found`             | Resource doesn't exist                                                 |
| 409         | `conflict`              | Duplicate resource                                                     |
| 410         | `gone`                  | Resource permanently deleted (e.g., media)                             |
| 413         | `payload_too_large`     | File or payload exceeds size limit                                     |
| 415         | `unsupported_media_type`| Wrong file format uploaded                                             |
| 422         | `validation`            | Invalid request body or query params (field-level errors)              |
| 429         | `rate_limit`            | Too many requests — rate limit exceeded (emitted by rate-limiter)      |
| 500         | `server`                | Unexpected server error                                                |
| 503         | `service_unavailable`   | Service temporarily unavailable (maintenance)                          |

> **Note:** `429` responses are produced by the rate-limiter middleware, not the `AppError` pipeline, and carry `type: "rate_limit"`. `AppError` also defines an equivalent `too_many_requests` (429) type, but it is not currently thrown by any route.

**Across the stack:** this error contract is *produced* by the backend error model ([backend conventions](../backend/conventions.md)), *normalized on the client* by the [frontend error handling](../frontend/error-handling.md) pipeline, and rests on the one-typed-error principle ([Engineering Principles §4](../development/engineering-principles.md)).

### Rate Limiting

| Scope | Endpoints | Limit | 429 Message |
|---|---|---|---|
| Auth | `/auth/login`, `/auth/register` | 10 req / 15 min | "Too many login attempts. For your security, please wait 15 minutes before trying again." |
| Refresh | `/auth/refresh` | 30 req / 15 min | "Too many refresh requests. Please wait a few minutes before continuing." |
| API | All other routes | 100 req / 15 min | "You have made too many requests. Please slow down and try again in a few minutes." |

### Auth Modes

| Mode         | Header                                     | Behavior                                                                                 |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Required** | `Authorization: Bearer <token>`            | 401 if missing or invalid                                                                |
| **Optional** | `Authorization: Bearer <token>` (optional) | If present, attaches `userId`. If missing, continues as guest. Used e.g. for `isLiked` / `isFollowing` fields. |
| **None**     | —                                          | No auth needed                                                                           |

---

## Auth

### `POST /auth/register` — Create a new account

**Auth:** None

Registration is **account creation only** (ADR 0008): the request carries account fields
only, and a new account never has an avatar. The avatar is an authenticated User/Profile
action — set later via `PATCH /users/me` after uploading under `POST /media`.

```jsonc
// Request body
{
  "username": "basel",      // 4-20 chars, lowercase alphanumeric/underscores (uppercase rejected, not normalized)
  "email": "test@test.com", // valid email
  "password": "Password1!"  // 8-72 chars, upper, lower, digit, special char
}
// Registration is account-only: no `name`. name is optional profile data set later
// via PATCH /users/me (absent = NULL, never derived from username).

// Response 201
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "basel"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
// Set-Cookie: qt_session=1; Secure; SameSite=Strict; Path=/   (readable session hint — see "Session cookies" below)

// Response 409 — username or email already taken. A username is "taken" if it is a
// current username OR a reserved former handle (freed by a rename but held indefinitely,
// so it can never be re-registered). The username rule is the shared `usernameField`,
// the same one PATCH /users/me enforces on a rename.
{ "success": false, "error": { "type": "conflict", "message": "Username already taken" } }

// Response 422 — validation failed (field-level errors)
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "password": ["Password must contain at least one special character (@$!%*?&#)"] } } }
```

> **Session cookies.** A session sets **two** cookies (on login / register / refresh) and clears both on logout / logout-all:
> - `refreshToken` — `HttpOnly`, the session credential (JS cannot read it), `Path=/api/v1/auth`.
> - `qt_session=1` — a **readable, non-secret hint** (`Path=/`) that a session probably exists, so the SPA can decide whether to attempt a silent restore **without firing a request for guests**. It is **non-authoritative** (auth truth is always the `HttpOnly` cookie + server) and carries no secret; forging it only triggers a refresh that fails harmlessly. Its client-side source is intentionally swappable if the app ever moves to a fully cross-domain FE/BE split (where a readable API-domain cookie would not be visible to the app domain).

### `POST /auth/login` — Authenticate user

**Auth:** None

```jsonc
// Request body
{
  "identifier": "basel",   // username OR email; presence-only. Server normalizes trim().toLowerCase()
  "password": "Password1!" // and routes on '@': contains '@' → email lookup, else username. No fallback.
}

// Response 200 — same shape as /auth/register
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
// Set-Cookie: qt_session=1; Secure; SameSite=Strict; Path=/   (readable session hint — see "Session cookies" below)

// Response 401 — unknown username, unknown email, or wrong password: one generic message, no enumeration
{ "success": false, "error": { "type": "unauthorized", "message": "Invalid credentials" } }
```

### `POST /auth/logout` — Invalidate current session

**Auth:** None (uses cookie)

```jsonc
// Request: reads refreshToken from cookie

// Response 204 (No Content)
// Set-Cookie: refreshToken=; Max-Age=0... (clears cookie)
// Set-Cookie: qt_session=; Max-Age=0; Path=/ (clears the session hint)
```

### `POST /auth/logout-all` — Invalidate all sessions

**Auth:** Required

```jsonc
// Response 204 (No Content)
// Set-Cookie: refreshToken=; Max-Age=0... (clears cookie on current device)
// Set-Cookie: qt_session=; Max-Age=0; Path=/ (clears the session hint)
```

### `POST /auth/refresh` — Get new access token

**Auth:** None (uses cookie)

```jsonc
// Request: reads refreshToken from cookie

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "johndoe"
    }
  }
}
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
// Set-Cookie: qt_session=1; Secure; SameSite=Strict; Path=/   (readable session hint — see "Session cookies" below)
```

> **Auth responses are minimal.** Register / login / refresh carry only the session token and the
> identity `{ id, username }` (ADR 0008 Decision 10 — Auth is Profile-free): never name, email,
> avatar, or bio. Of the two identity fields, **`id` is stable and `username` is mutable** — a
> self-service rename (`PATCH /users/me`) changes the handle but never the `id`, so clients key
> sessions and references on `id`, never on the handle. The authenticated user's full profile is served by the **User** domain,
> `GET /users/me` — the single canonical current-user resource. (`GET /auth/me` was retired: it
> returned only User-owned state and duplicated `/users/me`.) The public `GET /users/:username` (and
> the embedded author shape, [AuthorEmbed](#authorembed)) carry `avatar: { token } | null`, the read
> token resolved at the boundary from an internal numeric Media Reference; `profileImage` is retained
> only for backward compatibility (always `null`) and is retired with the author-avatar migration.

---

## Tweets

### `GET /tweets` — Feed (cursor-paginated)

**Auth:** Optional
**Query params:** `?cursor=<id>&limit=10`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    {
      "id": 5,
      "body": "Hello world!",
      "media": [],                // Ordered media attachments — see TweetMediaEmbed.
      "author": {
        "id": 1,
        "username": "basel",
        "name": "Basel",
        "profileImage": null
      },
      "likesCount": 3,
      "commentsCount": 2,
      "isLiked": true,
      "createdAt": "2026-05-10T12:00:00.000Z",
      "updatedAt": "2026-05-10T12:00:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": "5",
    "limit": 10,
    "hasMore": true
  }
}
```

**Notes:**
- Ordered by `id DESC` (newest first)
- `isLiked` is `false` for unauthenticated users
- `limit` capped at 50
- First request: no cursor. Next page: pass `cursor=<last item id>`

---

### `GET /tweets?author=:username` — Author's tweets (cursor-paginated)

**Auth:** Optional
**Query params:** `?author=basel&cursor=<id>&limit=10`

```jsonc
// Response 200 — same shape as GET /tweets

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

**Notes:**
- Filtered subset of the global feed — same tweet shape
- `isLiked` requires optional auth
- `author` accepts a current **or** a former handle: a former handle resolves transparently to the same author (no redirect on this non-profile locator). Returns `404` only if the handle was never assigned.

---

### `GET /tweets/:id` — Single tweet detail

**Auth:** Optional

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": 5,
    "body": "Hello world!",
    "media": [],
    "author": { "id": 1, "username": "basel", "name": "Basel", "profileImage": null },
    "likesCount": 3,
    "commentsCount": 2,
    "isLiked": true,
    "createdAt": "2026-05-10T12:00:00.000Z",
    "updatedAt": "2026-05-10T12:00:00.000Z"
  }
}

// Response 200 (Guest / Unauthenticated)
{
  "success": true,
  "data": {
    "id": 5,
    "body": "Hello world!",
    "media": [],
    "author": { "id": 1, "username": "basel", "name": "Basel", "profileImage": null },
    "likesCount": 3,
    "commentsCount": 2,
    "isLiked": false,
    "createdAt": "2026-05-10T12:00:00.000Z",
    "updatedAt": "2026-05-10T12:00:00.000Z"
  }
}

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

---

### `POST /tweets` — Create tweet

**Auth:** Required

```jsonc
// Request body
{
  "body": "Hello world!",   // required, 1-280 characters
  "media": ["<token>"]      // optional, ordered; up to 4 media read tokens.
                            // Array order is display order. Each must be an
                            // object you uploaded and have not yet attached
                            // elsewhere; duplicates within one tweet are rejected.
}

// Response 201
{
  "success": true,
  "data": {
    "id": 13,
    "body": "Hello world!",
    "media": [],                // Ordered media attachments — see TweetMediaEmbed.
    "author": { "id": 1, "username": "basel", "name": "Basel", "profileImage": null },
    "likesCount": 0,
    "commentsCount": 0,
    "isLiked": false,
    "createdAt": "2026-05-10T14:30:00.000Z",
    "updatedAt": "2026-05-10T14:30:00.000Z"
  }
}

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 422
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "body": ["Tweet body cannot be empty"] } } }
```

---

### `PATCH /tweets/:id` — Edit own tweet

**Auth:** Required

```jsonc
// Request body (at least one field required)
{
  "body": "Updated tweet!",   // optional, 1-280 characters
  "media": ["<token>"]        // optional — FULL REPLACEMENT, not a delta.
                              // Omit to leave the tweet's media untouched;
                              // send [] to remove all of it. The array you
                              // send becomes the tweet's media, in order.
}

// Response 200
{
  "success": true,
  "data": {
    "id": 5,
    "body": "Updated tweet!",
    "media": [],
    "author": { "id": 1, "username": "basel", "name": "Basel", "profileImage": null },
    "likesCount": 3,
    "commentsCount": 2,
    "isLiked": true,
    "createdAt": "2026-05-10T12:00:00.000Z",
    "updatedAt": "2026-05-10T15:00:00.000Z"
  }
}

// Response 422 (Empty body)
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "body": ["At least one field must be provided"] } } }

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 403
{ "success": false, "error": { "type": "forbidden", "message": "You can only edit your own tweets" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

---

### `DELETE /tweets/:id` — Delete own tweet

**Auth:** Required

```jsonc
// Response 204 (No Content — empty body)

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 403
{ "success": false, "error": { "type": "forbidden", "message": "You can only delete your own tweets" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

---

### `POST /tweets/:id/like` — Toggle like

**Auth:** Required

```jsonc
// Response 200 (toggled ON)
{ "success": true, "data": { "liked": true, "likesCount": 4 } }

// Response 200 (toggled OFF)
{ "success": true, "data": { "liked": false, "likesCount": 3 } }

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

**Notes:**
- Toggle behavior: if already liked → unlike. If not liked → like.
- No separate unlike endpoint — one endpoint handles both.

---

## Comments

### `GET /comments?tweetId=:id` — Comments for a tweet (offset-paginated)

**Auth:** None
**Query params:** `?tweetId=5&page=1&limit=20`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    {
      "id": 1,
      "body": "Nice tweet!",
      "media": null,              // a single media file { "token": "…" }, or null
      "author": {
        "id": 2,
        "username": "ahmed",
        "name": "Ahmed",
        "profileImage": null
      },
      "tweetId": 5,
      "createdAt": "2026-05-10T12:05:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "limit": 20,
    "totalPages": 1,
    "totalRecords": 7,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}

// Response 422 (missing or invalid tweetId)
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "tweetId": ["Tweet ID is required"] } } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

**Notes:**
- `tweetId` is a required query param
- Ordered by `createdAt ASC` (oldest first — like a conversation)
- Returns `404` if the tweet doesn't exist

---

### `POST /comments` — Add comment

**Auth:** Required

```jsonc
// Request body
{
  "tweetId": 5,             // required — which tweet to comment on
  "body": "Nice tweet!",    // required, 1-280 characters
  "media": { "token": "<token>" }  // optional — a single media file you uploaded (its read token)
}

// Response 201
{
  "success": true,
  "data": {
    "id": 8,
    "body": "Nice tweet!",
    "media": { "token": "<token>" },  // the attached file, or null
    "author": { "id": 1, "username": "basel", "name": "Basel", "profileImage": null },
    "tweetId": 5,
    "createdAt": "2026-05-10T14:35:00.000Z"
  }
}

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 422
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "body": ["Comment body cannot be empty"] } } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

---

### `PATCH /comments/:id` — Edit own comment

**Auth:** Required

```jsonc
// Request body (at least one field required)
{
  "body": "Updated comment!",   // optional, 1-280 characters
  "media": { "token": "<token>" }  // optional — full replacement:
                                   //   omit  → media unchanged
                                   //   { token } → set/replace the file
                                   //   null  → remove the file
}

// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "body": "Updated comment!",
    "media": null,                // the comment's single media file, or null
    "author": { "id": 2, "username": "ahmed", "name": "Ahmed", "profileImage": null },
    "tweetId": 5,
    "createdAt": "2026-05-10T12:05:00.000Z"
  }
}

// Response 422 (Empty body)
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "body": ["At least one field must be provided"] } } }

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 403
{ "success": false, "error": { "type": "forbidden", "message": "You can only edit your own comments" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Comment not found" } }
```

**Notes:**
- Comment edits do not track timestamps (`updatedAt`) in this version.

---

### `DELETE /comments/:id` — Delete own comment

**Auth:** Required

```jsonc
// Response 204 (No Content — empty body)

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 403
{ "success": false, "error": { "type": "forbidden", "message": "You can only delete your own comments" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Comment not found" } }
```

---

## Users

### `GET /users/:username` — User profile

**Auth:** Optional

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "username": "basel",
    "name": "Basel",
    "profileImage": null,                 // DEPRECATED (always null) — superseded by "avatar"
    "avatar": { "token": "Nk3v9qYw1kPz-XG27RODaQ" },  // null when unset; render via GET /media/:token
    "bio": "",
    "tweetsCount": 12,
    "likesCount": 34,
    "followersCount": 120,
    "followingCount": 45,
    "isFollowing": true,
    "createdAt": "2026-04-20T10:00:00.000Z"
  }
}

// Response 301 — :username is a FORMER handle (freed by a rename, still reserved):
// permanent redirect to the canonical profile URL. No JSON body; the target is in
// the Location header: /api/v1/users/<current-username>

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

**Notes:**
- `avatar`: `{ token } | null` — the resolved avatar read token (ADR 0008); `profileImage` is retained `null` for backward compatibility and is removed with the #335 tail.
- `tweetsCount`: total tweets authored by this user
- `likesCount`: total likes received across all their tweets
- `followersCount` / `followingCount`: computed via `COUNT()` on follows table
- `isFollowing`: `true` if the authenticated user follows this profile, `false` for guests
- `:username` accepts a current **or** a former handle: a former handle (freed by a rename, held indefinitely) **`301`-redirects** to the current canonical URL, so historical profile links never `404`. Only a handle that was never assigned returns `404`.

### `GET /users/me` — Own profile

**Auth:** Required. Returns the authenticated user's own profile — the `GET /users/:username` shape **plus `email` and `emailVerification`** (self-view-only fields; the public view omits both), with `isFollowing: false`. `me` is a reserved self-alias resolved from the token. This is the canonical current-user resource.

`emailVerification` is `"unproven" | "pending" | "proven"` — a **projection** resolved at read time from [Channel Verification](#channel-verification), which owns the fact. Nothing about it is stored on the account, and changing the address reads as `unproven` because the proof was about the previous value.

### `PATCH /users/me` — Update own profile

**Auth:** Required. Updates any subset of `username`, `name`, `bio`, `avatar` — **atomically** (all requested changes commit together or none do). `name` follows the same three-way rule as the avatar: **omitted = unchanged, `null` = clear, a string = set** (`name` is never derived from `username`). Changing `username` **renames the handle**: the old handle is reserved (see below), the new one becomes current, and because the session is keyed on the immutable `id` (never the handle), the **same access token keeps working with no re-login or refresh** — the response is the authoritative new identity. Returns the updated self profile (the same shape as `GET /users/me`, including `email` and `emailVerification`).

```jsonc
// Request — any subset; at least one field. Avatar is full-replacement:
//   omitted   → unchanged
//   { token } → set / replace   (token from POST /media, uploaded under Bearer)
//   null      → remove
// username, when present, must satisfy the shared rule (see POST /auth/register).
{ "username": "basel_g", "name": "Basel G.", "bio": "hello", "avatar": { "token": "Nk3v9qYw1kPz-XG27RODaQ" } }

// Response 409 — the requested username is taken: a current username OR another
// account's reserved former handle. (Renaming to your OWN current handle is a no-op 200;
// reclaiming your OWN former handle is allowed.)
{ "success": false, "error": { "type": "conflict", "message": "Username already taken" } }

// Response 422 — validation (a username failing the shared rule lands here, exactly as at
// register), or the avatar could not be attached / violates the avatar policy (JPEG or PNG
// only, ≤ 1 MiB). Opaque: never names the token.
{ "success": false, "error": { "type": "validation", "message": "Avatar does not meet the requirements",
    "details": { "avatar": ["Avatar must be a JPEG or PNG image"] } } }
```

**Notes:**
- `username`: optional; validated by the **shared `usernameField`** register uses (one source of truth — lowercase `^[a-z0-9_]{4,20}$`, uppercase rejected not normalized). A rename **reserves the old handle indefinitely** as a former handle: it keeps `301`-redirecting / resolving to you (see `GET /users/:username`) and can never be taken or re-registered by anyone else. Renaming is refused (`409`) if the target is a live username or another account's reserved handle; renaming to your own current handle is a no-op, and reclaiming your own former handle is allowed. Identity is the immutable `id`, so a rename never invalidates the session or a shareable link.
- The avatar is an authenticated Media producer: upload under `POST /media` (Bearer), then submit its `token` here. The **avatar policy** (JPEG/PNG, ≤ 1 MiB) is enforced server-side over Media's authoritative type/size — stricter than the global media limits.
- An uploaded object that is never attached (or is rejected here) is left owned-but-unreferenced and is reclaimed later by the background media reclamation — no request-level deletion.

---

## Follows

> Every `/follows/:username` locator (follow, unfollow, followers, following) resolves a **former handle** transparently to the current account — historical handles keep working, with no redirect on these non-profile locators. Only a never-assigned handle `404`s.

### `POST /follows/:username` — Follow a user

**Auth:** Required

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "isFollowing": true,
    "followersCount": 121
  }
}

// Response 422
{ "success": false, "error": { "type": "validation", "message": "You cannot follow yourself" } }

// Response 409
{ "success": false, "error": { "type": "conflict", "message": "Already following this user" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

**Design Note:**
- Follow uses separate POST/DELETE endpoints rather than an idempotent toggle to prevent race conditions and UX bugs (e.g., accidental double-clicks causing an unfollow).

---

### `DELETE /follows/:username` — Unfollow a user

**Auth:** Required

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "isFollowing": false,
    "followersCount": 120
  }
}

// Response 409
{ "success": false, "error": { "type": "conflict", "message": "You are not following this user" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

---

### `GET /follows/:username/followers` — Follower list (cursor-paginated)

**Auth:** None
**Query params:** `?cursor=<id>&limit=20`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    {
      "id": 2,
      "username": "ahmed",
      "name": "Ahmed",
      "profileImage": null,
      "bio": "Developer"
    }
  ],
  "meta": {
    "nextCursor": "2",
    "limit": 20,
    "hasMore": false
  }
}

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

---

### `GET /follows/:username/following` — Following list (cursor-paginated)

**Auth:** None
**Query params:** `?cursor=<id>&limit=20`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    {
      "id": 3,
      "username": "sara",
      "name": "Sara",
      "profileImage": null,
      "bio": "Designer"
    }
  ],
  "meta": {
    "nextCursor": "3",
    "limit": 20,
    "hasMore": true
  }
}

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

---

## Media

Media upload follows the **upload-then-submit-reference** pattern: a client uploads bytes to Media's ingest endpoint (`POST /media`), receives an opaque **media token** (the stable reference), and submits *that token* — never file bytes — to feature attach endpoints (`POST`/`PATCH /tweets` `media`, `POST`/`PATCH /comments` `media`, and `PATCH /users/me` `avatar`). Feature endpoints do not accept multipart. The token is publicly resolvable through the read endpoint (`GET /media/:token`). Governing decisions: [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md) (boundary) and [ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) (authenticated-only ingest; the pre-auth upload grant is retired). The subsystem's mechanisms are owned by [`backend/media.md`](../backend/media.md).

### `POST /media` — Upload a media object (multipart)

**Auth:** Required (`Authorization: Bearer <token>`). A request without a valid Bearer token is rejected `401`. Every uploaded object is owned by the authenticated uploader — there is no unauthenticated or grant-evidenced ingest path (ADR 0008: authenticated-only ownership).

**Request:** `multipart/form-data` with a single file field named `file`. The declared content type and file extension are **advisory only** — the effective type is derived server-side from the file's bytes. Allowed types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`. Size limit: **5 MiB** (inclusive). The 16 kB JSON body cap does not apply to this route.

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "token": "Nk3v9qYw1kPz-XG27ROD_Q",   // the stable media reference — submit this to feature endpoints
    "contentType": "image/png",           // the verified, content-derived type (authoritative)
    "size": 34712                          // bytes stored
  }
}

// Response 400 — malformed request. One of:
//   "Expected a multipart/form-data request"      (wrong Content-Type)
//   "A multipart field named 'file' is required"  (multipart, but no file part)
//   "Malformed multipart request"                 (parse error)
//   "Upload stream ended before completing"        (client aborted / truncated mid-upload)
{ "success": false, "error": { "type": "bad_request", "message": "A multipart field named 'file' is required" } }

// Response 401 — no valid Bearer token presented
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 413 — file exceeds the size limit
{ "success": false, "error": { "type": "payload_too_large", "message": "File exceeds the media size limit" } }

// Response 415 — content does not verify as an allowed image type
{ "success": false, "error": { "type": "unsupported_media_type", "message": "File content is not an allowed image type" } }
```

### `GET /media/:token` — Read a media object

**Auth:** None (public). Mounted **top-level, outside `/api/v1`** so the URL is stable and embeddable (e.g. in `<img src>`). The `:token` is the opaque reference returned by `POST /media`.

Resolves the token and streams the bytes under a fixed security envelope. Not rate-limited (cacheable, high-volume by design).

**Success `200`** — the object's bytes, with headers:

| Header | Value | Why |
|---|---|---|
| `Content-Type` | the object's **content-derived** verified type (e.g. `image/png`) | never a client-declared type |
| `X-Content-Type-Options` | `nosniff` | the browser can't sniff to active content |
| `Cross-Origin-Resource-Policy` | `cross-origin` | public-by-token, embeddable asset — route-scoped override of the global `same-origin` default; not an authorization control (a direct GET bypasses it) |
| `Content-Disposition` | `inline` | displayed in-page |
| `Content-Length` | byte size | |
| `Cache-Control` | `public, max-age=3600` | media bytes are immutable, so a short-lived cached copy is always correct; the bounded (non-`immutable`) window lets a future deletion propagate out of caches |

```jsonc
// Response 404 — unknown token, malformed token, not-yet-servable, or bytes unavailable
{ "success": false, "error": { "type": "not_found", "message": "Media not found" } }

// Response 410 — the object was permanently deleted (the token is never reissued)
{ "success": false, "error": { "type": "gone", "message": "This media has been deleted" } }
```

> A `410` appears only after **reclamation** (M11) has tombstoned the object — a
> background, Media-owned operation, never a client action. An unreferenced object
> stays `200`-servable until then; reclamation runs **report-only** until the
> destructive gate is met. The reclamation model is owned by
> [`backend/media.md`](../backend/media.md).

---

## Channel Verification

Proof that the account holder controls a communication channel endpoint. The capability owns the fact, not the address: the account row holds the email, and whether it has been proven lives entirely inside the capability, read back as a **projection**. Governing decision: [ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md). Email is the only implemented channel.

The subject is **never taken from the request**. Both endpoints act on the authenticated account's own current address, resolved server-side; a body naming another address is ignored. Accepting one would let a caller aim a challenge at an inbox they do not own.

**Verification state** is exposed only on the self-view, as [`emailVerification`](#get-usersme--own-profile):

| Value | Meaning |
|---|---|
| `unproven` | No valid proof for the current address — including after the address changes, since the proof was about the old value |
| `pending` | A challenge is outstanding and has not expired |
| `proven` | Control was demonstrated for the address currently on the account |

It is **derived at read time**, never stored. An expired challenge therefore reads correctly whether or not anything has cleaned it up.

### `POST /channel-verification/challenges` — Request a code

**Auth:** Required. **Rate limit:** 10 requests / 15 min per IP, *and* a durable per-address cooldown of 60 seconds — the cooldown is the real control, since the per-IP limiter cannot stop an address being targeted from rotating addresses.

**Request:** no body. The address is the authenticated account's own.

Issuing **rotates**: any outstanding challenge is superseded, so only the newest code works. The challenge is persisted before delivery is attempted, and a delivery failure is **reported, never destructive** — the code remains valid and can be resent.

```jsonc
// Response 202 — the challenge exists; delivery was attempted
{
  "success": true,
  "data": {
    "delivered": true    // false when the delivery backend refused; the challenge still stands
  }
}

// Response 401 — no valid Bearer token
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 404 — the authenticated account no longer exists
{ "success": false, "error": { "type": "not_found", "message": "Account not found" } }

// Response 429 — a code was requested for this address too recently (the per-address cooldown)
{ "success": false, "error": { "type": "too_many_requests", "message": "A verification code was requested too recently. Please wait before requesting another." } }
```

### `POST /channel-verification/challenges/confirm` — Submit a code

**Auth:** Required. **Rate limit:** 10 requests / 15 min per IP.

**Validation is presence-only.** The code's shape is deliberately *not* checked at the boundary: rejecting a malformed value with a `422` and field errors would tell a caller something a wrong value does not, and that distinction is exactly what must not leak.

The presence check itself still applies, and it is the one case that answers differently: an **absent or empty** `code` is a malformed *request* rather than a failed verification, so it returns the standard `422` with field errors. Every value that is actually present — however malformed — reaches the capability and collapses into the single `400` below.

```jsonc
// Request
{ "code": "7QK3MNP2XVZB" }

// Response 204 — confirmed. No body. The address is now `proven`.

// Response 400 — the single failure. Malformed, wrong, expired, superseded,
// already used, and never-existed are ALL reported identically: same status,
// same message, no field errors. The cause is retained internally for
// diagnostics and never reaches the caller.
{ "success": false, "error": { "type": "bad_request", "message": "That verification code is not valid." } }

// Response 401 — no valid Bearer token
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }
```

> **One failure shape, deliberately.** Uniform opacity is auditable; a carve-out is not. The moment one cause reports itself it acquires its own message, then its own status, and the guarantee decays by increments — the same reasoning as the generic `401` on login. A code is **single-use**, so replaying a confirmed one is refused identically; a *wrong* value, by contrast, leaves the challenge usable, so one mistyped character cannot deny a holder their own verification.
