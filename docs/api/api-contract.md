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
GET    /api/v1/auth/me

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
  name: string;
  profileImage: string | null;
}
```

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
| **Optional** | `Authorization: Bearer <token>` (optional) | If present, attaches `userId`. If missing, continues as guest. Used for `isLiked` / `isFollowing` fields. |
| **None**     | —                                          | No auth needed                                                                           |

---

## Auth

### `POST /auth/register` — Create a new account

**Auth:** None

```jsonc
// Request body
{
  "username": "basel",      // 4-20 chars, alphanumeric/underscores
  "name": "Basel",          // 1-50 chars
  "email": "test@test.com", // valid email
  "password": "Password1!"  // 8-72 chars, upper, lower, digit, special char
}

// Response 201
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "basel",
      "name": "Basel",
      "email": "test@test.com",
      "profileImage": null,
      "bio": "",
      "createdAt": "2026-05-10T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth

// Response 409 — username or email already taken
{ "success": false, "error": { "type": "conflict", "message": "Username already taken" } }

// Response 422 — validation failed (field-level errors)
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "password": ["Password must contain at least one uppercase letter"] } } }
```

### `POST /auth/login` — Authenticate user

**Auth:** None

```jsonc
// Request body
{
  "username": "basel",
  "password": "Password1!"
}

// Response 200 — same shape as /auth/register
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth

// Response 401 — wrong username or password (generic message, no user enumeration)
{ "success": false, "error": { "type": "unauthorized", "message": "Invalid credentials" } }
```

### `POST /auth/logout` — Invalidate current session

**Auth:** None (uses cookie)

```jsonc
// Request: reads refreshToken from cookie

// Response 204 (No Content)
// Set-Cookie: refreshToken=; Max-Age=0... (clears cookie)
```

### `POST /auth/logout-all` — Invalidate all sessions

**Auth:** Required

```jsonc
// Response 204 (No Content)
// Set-Cookie: refreshToken=; Max-Age=0... (clears cookie on current device)
```

### `POST /auth/refresh` — Get new access token

**Auth:** None (uses cookie)

```jsonc
// Request: reads refreshToken from cookie

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
```

### `GET /auth/me` — Get current user profile

**Auth:** Required

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "basel",
      "name": "Basel",
      "email": "test@test.com",
      "profileImage": null,
      "bio": "",
      "createdAt": "2026-05-10T12:00:00.000Z"
    }
  }
}
```

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
      "image": null,              // Reserved for future use (file uploads). Always null in v1.
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
- Returns `404` if username does not exist

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
    "image": null,
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
    "image": null,
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
  "body": "Hello world!"    // required, 1-280 characters
}

// Response 201
{
  "success": true,
  "data": {
    "id": 13,
    "body": "Hello world!",
    "image": null,              // Reserved for future use. Always null in v1.
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
  "body": "Updated tweet!"    // optional, 1-280 characters
}

// Response 200
{
  "success": true,
  "data": {
    "id": 5,
    "body": "Updated tweet!",
    "image": null,
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
  "body": "Nice tweet!"     // required, 1-280 characters
}

// Response 201
{
  "success": true,
  "data": {
    "id": 8,
    "body": "Nice tweet!",
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
// Request body
{
  "body": "Updated comment!"    // required, 1-280 characters
}

// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "body": "Updated comment!",
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
    "profileImage": null,
    "bio": "",
    "tweetsCount": 12,
    "likesCount": 34,
    "followersCount": 120,
    "followingCount": 45,
    "isFollowing": true,
    "createdAt": "2026-04-20T10:00:00.000Z"
  }
}

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

**Notes:**
- `tweetsCount`: total tweets authored by this user
- `likesCount`: total likes received across all their tweets
- `followersCount` / `followingCount`: computed via `COUNT()` on follows table
- `isFollowing`: `true` if the authenticated user follows this profile, `false` for guests
- **Future Scope:** Profile modification (`PATCH /users/:username`) is outside the scope of v1.

---

## Follows

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
