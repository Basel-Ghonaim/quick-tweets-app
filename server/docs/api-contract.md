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
