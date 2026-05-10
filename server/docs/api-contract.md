# API Contract — Quick Tweets

> This document defines the request/response shapes for all API endpoints.
> It is the agreement between backend and frontend.
> No implementation should deviate from this contract without updating it first.

**Base URL:** `http://localhost:4000/api/v1`

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

### PaginationMeta

Included in every paginated list response.

```typescript
interface PaginationMeta {
  currentPage: number; // current page (1-indexed)
  limit: number; // items per page
  totalPages: number; // total count of records
  totalRecords: number; // total count of records 
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Error Response

Consistent across all endpoints. Matches the existing `AppError` pattern.

```typescript
interface ErrorResponse {
  type:
    | "validation"
    | "authentication"
    | "forbidden"
    | "not_found"
    | "conflict"
    | "unknown";
  message: string;
}
```

| HTTP Status | Error Type       | When                                                                   |
| ----------- | ---------------- | ---------------------------------------------------------------------- |
| 400         | `validation`     | Invalid request body or query params                                   |
| 401         | `authentication` | Missing or invalid JWT                                                 |
| 403         | `forbidden`      | Authenticated but not authorized (e.g., deleting someone else's tweet) |
| 404         | `not_found`      | Resource doesn't exist                                                 |
| 409         | `conflict`       | Duplicate resource                                                     |
| 500         | `unknown`        | Unexpected server error                                                |

### Auth Modes

| Mode         | Header                                     | Behavior                                                                                 |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Required** | `Authorization: Bearer <token>`            | 401 if missing or invalid                                                                |
| **Optional** | `Authorization: Bearer <token>` (optional) | If present, attaches `userId`. If missing, continues as guest. Used for `isLiked` field. |
| **None**     | —                                          | No auth needed                                                                           |

---

## Tweets

### `GET /tweets` — Feed (paginated)

**Auth:** Optional
**Query params:** `?page=1&limit=10`

```jsonc
// Response 200
{
  "tweets": [
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
  "pagination": {
    "currentPage": 1,
    "limit": 10,
    "totalPages": 5,
    "totalRecords": 42,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Notes:**
- Ordered by `createdAt DESC` (newest first)
- `isLiked` is `false` for unauthenticated users
- `limit` capped at 50

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

### `PATCH /comments/:id` — Edit own comment

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

### `DELETE /comments/:id` — Delete own comment

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
- Standalone route (`/comments/:id`), not nested under tweets.
- Only the comment author can delete it.

---

## Users

### `GET /users/:username` — User profile

**Auth:** None

```jsonc
// Response 200
{
  "user": {
    "id": 1,
    "username": "basel",
    "name": "Basel",
    "email": "basel@test.com",
    "profileImage": null,
    "bio": "",
    "tweetsCount": 12,
    "likesCount": 34,
    "createdAt": "2026-04-20T10:00:00.000Z"
  }
}

// Response 404
{ "type": "not_found", "message": "User not found" }
```

**Notes:**
- `tweetsCount`: total tweets authored by this user
- `likesCount`: total likes received across all their tweets

---

### `GET /users/:username/tweets` — User's tweets (paginated)

**Auth:** Optional
**Query params:** `?page=1&limit=10`

```jsonc
// Response 200
{
  "tweets": [
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
  "pagination": {
    "currentPage": 1,
    "limit": 10,
    "totalPages": 2,
    "totalRecords": 12,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}

// Response 404
{ "type": "not_found", "message": "User not found" }
```

**Notes:**
- Same tweet shape as feed — reuses `AuthorEmbed`
- `isLiked` requires optional auth
- Ordered by `createdAt DESC`
