# API Contract — Quick Tweets

> This document defines the request/response shapes for all API endpoints.
> It is the agreement between backend and frontend.
> No implementation should deviate from this contract without updating it first.

**Base URL:** `http://localhost:4000/api/v1`

---

## Response Wrapper

Every API response follows this standardized format:

### Success Response

```typescript
{
  success: true,
  data: T,                            // object, array, or null (for 204)
  meta?: Record<string, unknown>      // pagination, counts, etc.
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    type: "validation" | "authentication" | "forbidden" | "not_found" | "conflict" | "server",
    message: string,
    errors?: Record<string, string[]>  // field-level validation errors
  }
}
```

### Examples

```jsonc
// POST /auth/register → 201
{ "success": true, "data": { "user": {...}, "accessToken": "eyJ..." } }

// GET /tweets → 200 with pagination
{ "success": true, "data": [...], "meta": { "cursor": "abc", "hasMore": true } }

// DELETE /tweets/:id → 204 (no body)

// Error → 403
{ "success": false, "error": { "type": "forbidden", "message": "You can only delete your own tweets" } }
```

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

Used for high-growth, chronological data (tweets, followers/following lists).
Cursor is the `id` of the last item — auto-incrementing IDs guarantee chronological order.

```typescript
interface CursorPaginationMeta {
  nextCursor: string | null;  // id of last item, null if no more pages
  limit: number;              // items per page
  hasMore: boolean;           // are there more items after this page?
}
```

**Query params:** `?cursor=<id>&limit=10`

**Used by:** `GET /tweets`, `GET /users/:username/tweets`, `GET /users/:username/followers`, `GET /users/:username/following`

### OffsetPaginationMeta

Used for small, bounded datasets (comments on a tweet).

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

**Query params:** `?page=1&limit=10`

**Used by:** `GET /tweets/:tweetId/comments`


### Error Response

Consistent across all endpoints. Wrapped in the response wrapper above.

```typescript
// Wrapped shape: { success: false, error: ErrorBody }
interface ErrorBody {
  type:
    | "validation"
    | "authentication"
    | "forbidden"
    | "not_found"
    | "conflict"
    | "server";
  message: string;
  errors?: Record<string, string[]>;  // field-level validation errors
}
```

| HTTP Status | Error Type       | When                                                                   |
| ----------- | ---------------- | ---------------------------------------------------------------------- |
| 400         | `validation`     | Invalid request body or query params                                   |
| 401         | `authentication` | Missing or invalid JWT                                                 |
| 403         | `forbidden`      | Authenticated but not authorized (e.g., deleting someone else's tweet) |
| 404         | `not_found`      | Resource doesn't exist                                                 |
| 409         | `conflict`       | Duplicate resource                                                     |
| 429         | `rate_limit`     | Too many requests — rate limit exceeded                                |
| 500         | `server`         | Unexpected server error                                                |

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
| **Optional** | `Authorization: Bearer <token>` (optional) | If present, attaches `userId`. If missing, continues as guest. Used for `isLiked` field. |
| **None**     | —                                          | No auth needed                                                                           |

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
      "image": null,
      "author": {
        "id": 1,
        "username": "basel",
        "name": "Basel",
        "profileImage": null
      },
      "likesCount": 3,
      "commentsCount": 2,
      "isLiked": true,
      "createdAt": "2026-05-10T12:00:00.000Z"
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
- Ordered by `id DESC` (newest first — auto-increment = chronological)
- `isLiked` is `false` for unauthenticated users
- `limit` capped at 50
- First request: no cursor. Next page: pass `cursor=<last item id>`

---

### `GET /tweets/:id` — Single tweet detail

**Auth:** Optional

```jsonc
// Response 200
{
  "tweet": {
    "id": 5,
    "body": "Hello world!",
    "image": null,
    "author": {
      "id": 1,
      "username": "basel",
      "name": "Basel",
      "profileImage": null
    },
    "likesCount": 3,
    "commentsCount": 2,
    "isLiked": true,
    "createdAt": "2026-05-10T12:00:00.000Z"
  }
}

// Response 404
{ "type": "not_found", "message": "Tweet not found" }
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
  "tweet": {
    "id": 13,
    "body": "Hello world!",
    "image": null,
    "author": {
      "id": 1,
      "username": "basel",
      "name": "Basel",
      "profileImage": null
    },
    "likesCount": 0,
    "commentsCount": 0,
    "isLiked": false,
    "createdAt": "2026-05-10T14:30:00.000Z"
  }
}

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 400
{ "type": "validation", "message": "body must be between 1 and 280 characters" }
```

---

### `PATCH /tweets/:id` — Edit own tweet

**Auth:** Required

```jsonc
// Request body (all fields optional, at least one required)
{
  "body": "Updated tweet!"    // optional, 1-280 characters
}

// Response 200
{
  "tweet": {
    "id": 5,
    "body": "Updated tweet!",
    "image": null,
    "author": {
      "id": 1,
      "username": "basel",
      "name": "Basel",
      "profileImage": null
    },
    "likesCount": 3,
    "commentsCount": 2,
    "isLiked": true,
    "createdAt": "2026-05-10T12:00:00.000Z"
  }
}

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 403
{ "type": "forbidden", "message": "You can only edit your own tweets" }

// Response 404
{ "type": "not_found", "message": "Tweet not found" }

// Response 400
{ "type": "validation", "message": "body must be between 1 and 280 characters" }
```

---

### `DELETE /tweets/:id` — Delete own tweet

**Auth:** Required

```jsonc
// Response 204 (No Content — empty body)

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 403
{ "type": "forbidden", "message": "You can only delete your own tweets" }

// Response 404
{ "type": "not_found", "message": "Tweet not found" }
```

---

### `POST /tweets/:id/like` — Toggle like

**Auth:** Required

```jsonc
// Response 200 (toggled ON)
{ "liked": true, "likesCount": 4 }

// Response 200 (toggled OFF)
{ "liked": false, "likesCount": 3 }

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 404
{ "type": "not_found", "message": "Tweet not found" }
```

**Notes:**
- Toggle behavior: if already liked → unlike. If not liked → like.
- No separate unlike endpoint — one endpoint handles both.

---

## Comments

### `GET /tweets/:tweetId/comments` — Comments for a tweet (paginated)

**Auth:** None
**Query params:** `?page=1&limit=20`

```jsonc
// Response 200
{
  "comments": [
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
  "pagination": {
    "currentPage": 1,
    "limit": 20,
    "totalPages": 1,
    "totalRecords": 7,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}

// Response 404
{ "type": "not_found", "message": "Tweet not found" }
```

**Notes:**
- Ordered by `createdAt ASC` (oldest first — like a conversation)
- Returns 404 if the tweet doesn't exist

---

### `POST /tweets/:tweetId/comments` — Add comment

**Auth:** Required

```jsonc
// Request body
{
  "body": "Nice tweet!"    // required, 1-280 characters
}

// Response 201
{
  "comment": {
    "id": 8,
    "body": "Nice tweet!",
    "author": {
      "id": 1,
      "username": "basel",
      "name": "Basel",
      "profileImage": null
    },
    "tweetId": 5,
    "createdAt": "2026-05-10T14:35:00.000Z"
  }
}

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 400
{ "type": "validation", "message": "body must be between 1 and 280 characters" }

// Response 404
{ "type": "not_found", "message": "Tweet not found" }
```

---

### `PATCH /tweets/:tweetId/comments/:commentId` — Edit own comment

**Auth:** Required

```jsonc
// Request body
{
  "body": "Updated comment!"    // required, 1-280 characters
}

// Response 200
{
  "comment": {
    "id": 1,
    "body": "Updated comment!",
    "author": {
      "id": 2,
      "username": "ahmed",
      "name": "Ahmed",
      "profileImage": null
    },
    "tweetId": 5,
    "createdAt": "2026-05-10T12:05:00.000Z"
  }
}

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 403
{ "type": "forbidden", "message": "You can only edit your own comments" }

// Response 404
{ "type": "not_found", "message": "Comment not found" }

// Response 400
{ "type": "validation", "message": "body must be between 1 and 280 characters" }
```

---

### `DELETE /tweets/:tweetId/comments/:commentId` — Delete own comment

**Auth:** Required

```jsonc
// Response 204 (No Content — empty body)

// Response 401
{ "type": "authentication", "message": "Missing or invalid authorization header" }

// Response 403
{ "type": "forbidden", "message": "You can only delete your own comments" }

// Response 404
{ "type": "not_found", "message": "Comment not found" }
```

**Notes:**
- Fully nested under tweets (`/tweets/:tweetId/comments/:commentId`).
- Only the comment author can delete it.
- Server validates that the comment belongs to the specified tweet.

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
    "email": "basel@test.com",
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
- `followersCount`: computed via `COUNT()` on follows table (indexed)
- `followingCount`: computed via `COUNT()` on follows table (indexed)
- `isFollowing`: `true` if the authenticated user follows this profile, `false` for guests

---

### `GET /users/:username/tweets` — User's tweets (cursor-paginated)

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
      "image": null,
      "author": {
        "id": 1,
        "username": "basel",
        "name": "Basel",
        "profileImage": null
      },
      "likesCount": 3,
      "commentsCount": 2,
      "isLiked": true,
      "createdAt": "2026-05-10T12:00:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": "5",
    "limit": 10,
    "hasMore": true
  }
}

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

**Notes:**
- Same tweet shape as feed — reuses `AuthorEmbed`
- `isLiked` requires optional auth
- Ordered by `id DESC` (newest first)
- Uses cursor pagination (same as feed)

---

## Follow

### `POST /users/:username/follow` — Follow a user

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

// Response 400
{ "success": false, "error": { "type": "validation", "message": "You cannot follow yourself" } }

// Response 409
{ "success": false, "error": { "type": "conflict", "message": "Already following this user" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

---

### `DELETE /users/:username/follow` — Unfollow a user

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

// Response 400
{ "success": false, "error": { "type": "validation", "message": "You are not following this user" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "User not found" } }
```

---

### `GET /users/:username/followers` — Follower list (cursor-paginated)

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

### `GET /users/:username/following` — Following list (cursor-paginated)

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
