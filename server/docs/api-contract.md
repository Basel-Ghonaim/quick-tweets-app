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
  totalRecords: number;
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
