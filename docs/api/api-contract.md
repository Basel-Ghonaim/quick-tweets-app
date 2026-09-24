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
| `POST /channel-verification/challenges`: the boolean `delivered` removed, superseded by the three-state `delivery` | The boolean asserted something no sender can promise. A relay's acceptance is not arrival, and a timeout leaves the outcome genuinely undetermined, so the field was **renamed rather than redefined** — a shape that kept its name while losing its meaning is the failure that makes a contract untrustworthy. No client reads it: no frontend calls channel verification. |
| `AuthorEmbed`, the follower and following list items, and the user profile: `profileImage` removed, superseded by `avatar` | The field was deprecated and always `null` once the avatar became a Media Reference, so it never carried a value anything could depend on. No client reads it: nothing in the frontend references the field. |
| `POST /auth/register` and `POST /auth/password-reset/apply`: a password containing any character outside printable ASCII is refused with `422` | A rule tightened on input rather than a shape removed, but a request valid before is refused after, so it is recorded. No consumer can depend on the wider rule: `v1` has no released consumer, the only client applies the same rule in the same change, and login still accepts any password set before it. |
| `GET /comments`: offset pagination replaced by cursor pagination, and the default page size moves from 20 to 10 | The thread loads by infinite scroll, and a page number shifts every later page when a comment is added or removed mid-scroll, so comments are skipped or shown twice. The meta shape had to change for the list to be correct at all. No client reads it: nothing in the frontend calls `/comments`. |
| `POST /tweets/:id/like` replaced by `PUT` and `DELETE /tweets/:id/like` | A toggle cannot be repeat-safe, which the product requires of liking: with the like shown before the server answers, a double press or a retry cancels what the reader meant. The fix is the verb, not the payload — `PUT` and `DELETE` carry idempotence by definition. The response shape is unchanged. No client reads it: nothing in the frontend calls the endpoint. |
| `GET /comments?tweetId=`: returns top-level comments only, no longer every comment on the tweet | A comment may now answer another comment. Returning both levels in one flat list would give the client no way to tell them apart, and the thread is drawn as two. The replies have their own list, `?parentId=`. No client reads it, for the same reason. |
| `POST` and `PATCH` on `/tweets` and `/comments`: a `body` of white space alone is refused with `422` | A rule tightened on input rather than a shape removed. Such a body used to pass the length check before it was trimmed, and was stored empty. No consumer can depend on that: nothing in the frontend writes a post or a comment. Counting code points instead of UTF-16 units only admits more, so it needs no exception. |
| Text safety, on the `body` of `/tweets` and `/comments` and on `PATCH /users/me`'s `name` and `bio`: a direction control is refused with `422`; a body or a name made only of invisible characters is refused; a name of white space alone is refused rather than stored empty; and text is stored in NFC | Rules tightened on input rather than shapes removed. Each refuses text that no reader should be shown, or that was being stored empty. No consumer can depend on the looser rules. Nothing in the frontend writes a post or a comment, and the profile form already sends `null` for a blank name and meets any other refusal with its own words. |

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
POST   /api/v1/auth/password-reset          (unauthenticated)
POST   /api/v1/auth/password-reset/resend   (unauthenticated)
POST   /api/v1/auth/password-reset/confirm  (unauthenticated)
POST   /api/v1/auth/password-reset/apply    (unauthenticated)
GET    /api/v1/auth/password-reset/session  (unauthenticated)

GET    /api/v1/tweets
GET    /api/v1/tweets?author=:username
GET    /api/v1/tweets/:id
POST   /api/v1/tweets
PATCH  /api/v1/tweets/:id
DELETE /api/v1/tweets/:id
PUT    /api/v1/tweets/:id/like
DELETE /api/v1/tweets/:id/like

GET    /api/v1/comments?tweetId=:tweetId    (a tweet's top-level comments)
GET    /api/v1/comments?parentId=:commentId (one comment's replies)
POST   /api/v1/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
PUT    /api/v1/comments/:id/like
DELETE /api/v1/comments/:id/like

GET    /api/v1/users/:username
GET    /api/v1/users/me
PATCH  /api/v1/users/me

POST   /api/v1/follows/:username
DELETE /api/v1/follows/:username
GET    /api/v1/follows/:username/followers
GET    /api/v1/follows/:username/following

GET    /api/v1/onboarding/journey                       (authenticated)
POST   /api/v1/onboarding/journey/advance               (authenticated)

GET    /api/v1/channel-verification/challenges/current  (authenticated)
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
  avatar: { token: string } | null; // the read token (render via GET /media/:token); null when unset or unservable
}
```

**It deliberately carries no follow state.** A *post's* author does — see
[FollowState](#followstate) — because the post's ⋯ menu draws a Follow button. A
*comment's* author does not, because a comment row has no such button, and a
follow-list row carries the pair on the row itself. Putting the fields here would
make every thread page resolve a relation nothing renders.

### FollowState

The two facts a **Follow button** needs, from the reading account's side. Carried
by the user profile, by each follower/following list row, and by a post's author.

```typescript
interface FollowState {
  isFollowing: boolean;   // the reader follows this person
  followsYou: boolean;    // this person follows the reader — what "Follow back" is drawn from
}
```

**Both are `false` for a guest**, and both are `false` on the reader's own row —
following yourself is refused, so the pair cannot say otherwise.

**There is no third field, and that is deliberate.** Which of the four states the
button draws is the client's to derive: *Following* from `isFollowing`, *Follow
back* from `followsYou` alone, *Follow* from neither, and **nothing at all** on
your own row, which the client recognises by comparing ids with
`GET /users/me`. A relation computed on the server would put a presentation
choice in the payload.

### "Edited" — `editedAt`

Posts and comments carry `editedAt: string | null` — **when the text was last
changed**, or `null` if it never was. The client shows its marker when the field
is not null; nothing displays the time itself today, but a time is carried so
that "edited 2h ago" needs no second migration.

**An edit is a change to the text, and only to the text.** An image added,
replaced, removed or reordered is **not** an edit, and neither is re-submitting
the same words — in both cases nothing a reader sees has changed. Once set, it is
never cleared.

**It is not `updatedAt`, and could not be.** Prisma maintains `updatedAt`
whenever an update carries a field, so re-saving identical text moves it; a
marker derived from it would announce an edit that never happened. `updatedAt`
stays exactly as it was and keeps its own meaning — *this row was written*.

**Comments carry `editedAt` and no `updatedAt`.** They never had one, and this
did not add one: the only question a reader's interface asks is whether the text
was edited.

### Body text

The `body` of a post, a comment and a reply follows **one rule**, on create and
on edit, applied in this order:

1. **Normalised to NFC**, and **refused if it carries a direction control**,
   as [Text safety](#text-safety) states.
2. **Trimmed**, and what is left is what is measured and stored. Trimming
   removes Unicode white space and line ends from both ends.
3. **Not empty.** A body of white space alone, or of invisible characters
   alone, is refused with `422` and *"… cannot be empty"*, so a body is never
   stored empty.
4. **At most 280 characters, where a character is a Unicode code point.** An
   emoji counts once, not as its two UTF-16 units; a sequence that draws as one
   symbol counts each code point in it. Past 280, the answer is `422` with
   *"… must be at most 280 characters"*.

A client counting what it sends — `Array.from(text.normalize("NFC").trim()).length`
in JavaScript — counts what the server counts. **Normalising first matters:** a
few letters split in two under NFC (U+0958 becomes two code points), so a count
taken before normalising can accept a body the server refuses.

### Text safety

Text other readers see is made safe to show among their words: the `body` of
a post, a comment and a reply, and a profile's `name` and `bio`. A `username`
is not included; it keeps its own rule. The reasoning is
[backend security](../backend/security.md#text-safety)'s.

- **Stored in NFC.** What is stored and returned is the composed form, so
  `e` followed by a combining acute accent comes back as `é`. Rows written
  before this rule are left as they were.
- **Direction controls are refused:** the embeddings, overrides and isolates,
  U+202A–U+202E and U+2066–U+2069. The answer is `422` with one message for
  the field, *"<Field> cannot contain text-direction control characters"*
  (for example *"Tweet body cannot contain …"*). **The character never appears
  in the response.** The direction marks U+200E, U+200F and U+061C are
  accepted.
- **Invisible text is empty text.** Text made only of Unicode white space and
  default-ignorable characters — zero-width spaces and joiners, the direction
  marks, variation selectors — counts as empty. What empty means is the
  field's: a body and a name are refused, a bio is cleared.

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

**Used by:** `GET /tweets`, `GET /tweets?author=username`, `GET /comments?tweetId=X`, `GET /comments?parentId=X`, `GET /follows/:username/followers`, `GET /follows/:username/following`

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

**Used by:** no endpoint today. `GET /comments` was its last reader and is now cursor-paginated; the shape and the convention are kept for the bounded lists they are meant for ([backend pagination convention](../backend/conventions.md#pagination)), and whether a convention with no reader should stay documented is [Finding 0038](../architecture/findings/open/0038-offset-pagination-has-no-endpoint-left.md)'s.

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

> **Note:** two different `429`s exist, and they mean different things. Every per-IP limiter answers through the rate-limiter middleware with `type: "rate_limit"`. `too_many_requests` is Channel Verification's own per-address cooldown, raised through the `AppError` pipeline and carrying `Retry-After`. What conflating them costs a reader is stated under Rate Limiting below.

**Across the stack:** this error contract is *produced* by the backend error model ([backend conventions](../backend/conventions.md)), *normalized on the client* by the [frontend error handling](../frontend/error-handling.md) pipeline, and rests on the one-typed-error principle ([Engineering Principles §4](../development/engineering-principles.md)).

### Rate Limiting

Every limiter below is **per IP**, over a fixed window, and answers with `type: "rate_limit"`. Routes are limited by prefix **except** where a route's own cost earns it something tighter — which is why `/media` and `/channel-verification` carry a limiter per route rather than one across the prefix. Their writes therefore fall outside the general cap; the verification read names that cap explicitly, since a route in a prefix with no blanket limiter has none unless it says so.

| Scope | Endpoints | Limit | 429 Message |
|---|---|---|---|
| Auth | `/auth/login`, `/auth/register` | 10 req / 15 min | "Too many login attempts. For your security, please wait 15 minutes before trying again." |
| Refresh | `/auth/refresh` | 30 req / 15 min | "Too many refresh requests. Please wait a few minutes before continuing." |
| Verification issue | `POST /channel-verification/challenges` | **10 req / 15 min** | "Too many verification requests. Please wait 15 minutes before trying again." |
| Verification confirm | `POST /channel-verification/challenges/confirm` | **10 req / 15 min** | "Too many confirmation attempts. Please wait 15 minutes before trying again." |
| API | `/tweets`, `/comments`, `/users`, `/follows`, `/onboarding`, `POST /media`, and `GET /channel-verification/challenges/current` | 100 req / 15 min | "You have made too many requests. Please slow down and try again in a few minutes." |
| Reset request | `POST /auth/password-reset` **and** `POST /auth/password-reset/resend` | **10 req / 15 min, shared** | "Too many password reset requests. Please wait 15 minutes before trying again." |
| Reset confirm | `POST /auth/password-reset/confirm` | **10 req / 15 min** | "Too many attempts. Please wait 15 minutes before trying again." |
| Reset apply | `POST /auth/password-reset/apply` | **5 req / 15 min** | "Too many attempts. Please wait 15 minutes before trying again." |

> **The verification endpoints return two different `429`s, and they mean different things.** `type: "rate_limit"` is the per-IP limiter above — a fifteen-minute lockout. `type: "too_many_requests"` is Channel Verification's own **per-address cooldown**, measured in seconds and carrying `Retry-After`. The first says *this client is asking too often*; the second says *this address was sent a code moments ago*. A client that conflates them will make a user wait fifteen minutes for a sixty-second throttle.

### Auth Modes

| Mode         | Header                                     | Behavior                                                                                 |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Required** | `Authorization: Bearer <token>`            | 401 if missing or invalid                                                                |
| **Optional** | `Authorization: Bearer <token>` (optional) | If present, attaches `userId`. If missing, continues as guest. Used e.g. for `isLiked` and for follow state ([FollowState](#followstate)). |
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
  "email": "test@test.com", // ASCII only: letters, digits and _ ' + - . before the @ (no leading,
                            // trailing or doubled dot); ASCII domain labels (punycode allowed)
                            // under a letters-only top-level domain
  "password": "Password1!"  // 8-72 chars, printable ASCII only (space allowed, never trimmed);
                            // upper, lower, digit, special char
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

> **The password is checked for presence only.** Registration's password rules bind where a password is set — `POST /auth/register` and `POST /auth/password-reset/apply` — and never at login, so a password set under an earlier rule still signs in.

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
> returned only User-owned state and duplicated `/users/me`.) The public `GET /users/:username`, the
> embedded author shape ([AuthorEmbed](#authorembed)) and the follow lists' items carry
> `avatar: { token } | null`, the read token resolved at the boundary from an internal numeric Media
> Reference.

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
        "avatar": null,
        "isFollowing": false,   // see FollowState — both false for a guest
        "followsYou": true      // so this row's menu offers "Follow back"
      },
      "likesCount": 3,
      "commentsCount": 2,
      "isLiked": true,
      "createdAt": "2026-05-10T12:00:00.000Z",
      "updatedAt": "2026-05-10T12:00:00.000Z",
      "editedAt": null            // see "Edited" above — null until the text changes
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
- `editedAt` is `null` until the **text** changes; see ["Edited"](#edited--editedat).
  Nothing here is breaking — it is an added optional field, and `updatedAt` keeps
  its meaning and its place
- **The author carries [FollowState](#followstate)**, so the row's ⋯ menu can draw
  Follow, Following or Follow back without a second request. It is resolved once
  for the whole page, never once per post, and a guest costs no lookup at all.
  A **comment's** author does not carry it
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
    "author": { "id": 1, "username": "basel", "name": "Basel", "avatar": null },
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
    "author": { "id": 1, "username": "basel", "name": "Basel", "avatar": null },
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

**`body`** follows [Body text](#body-text).

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
    "media": [{ "token": "<token>" }], // Ordered media attachments — see TweetMediaEmbed.
    "author": { "id": 1, "username": "basel", "name": "Basel", "avatar": null },
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

**`body`** follows [Body text](#body-text).

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
    "media": [{ "token": "<token>" }],
    "author": { "id": 1, "username": "basel", "name": "Basel", "avatar": null },
    "likesCount": 3,
    "commentsCount": 2,
    "isLiked": true,
    "createdAt": "2026-05-10T12:00:00.000Z",
    "updatedAt": "2026-05-10T15:00:00.000Z",
    "editedAt": "2026-05-10T15:00:00.000Z"   // the text changed in this edit
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

### `PUT /tweets/:id/like` — Like a tweet

**Auth:** Required

```jsonc
// Response 200
{ "success": true, "data": { "liked": true, "likesCount": 4 } }

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

---

### `DELETE /tweets/:id/like` — Unlike a tweet

**Auth:** Required

```jsonc
// Response 200
{ "success": true, "data": { "liked": false, "likesCount": 3 } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

**Notes on both — and on `PUT`/`DELETE …/like` wherever it appears:**
- **`liked` is the state now, not what this call changed.** Both endpoints are
  **idempotent**: liking something already liked answers `200` with `liked: true`,
  and unliking something not liked answers `200` with `liked: false`. Neither is
  ever a `409` or a `404` *for being redundant* — only a missing resource is `404`.
- **That is the reason these replaced a toggle.** A client shows the like before
  the server answers, so with a toggle a double press or a retry cancels what the
  reader meant. Here, repeating a call cannot reverse it.
- `likesCount` is read after the write, so it is the count as it stands.
- **Follows are deliberately different.** `POST /follows/:username` answers `409`
  on a repeat. Nothing requires repeat-safety there, and the asymmetry is
  recorded rather than smoothed over.

---

## Comments

### `GET /comments?tweetId=:id` — A tweet's top-level comments (cursor-paginated)

**Auth:** Optional — a signed-in reader gets their own `isLiked`; a guest reads the thread all the same
**Query params:** `?tweetId=5&cursor=<id>&limit=10`

Exactly one of `tweetId` or `parentId` is required. `tweetId` asks for the thread —
the tweet's **top-level comments only**. Replies are not mixed in; each one is
reached through its parent, below.

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
        "avatar": null
      },
      "tweetId": 5,
      "parentId": null,           // null — this is a top-level comment
      "repliesCount": 3,          // top-level comments only; see the note below
      "likesCount": 12,
      "isLiked": false,           // this reader's own state; always false for a guest
      "editedAt": null,           // see "Edited" — the text, and only the text
      "createdAt": "2026-05-10T12:05:00.000Z"
    }
  ],
  "meta": {
    "nextCursor": "1",
    "limit": 10,
    "hasMore": false
  }
}

// Response 422 (neither tweetId nor parentId, or both)
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "tweetId": ["Provide exactly one of tweetId or parentId"] } } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

**Notes:**
- Ordered by `id ASC` (oldest first — like a conversation). `id` rises with
  creation, so it is both the order and a unique, stable cursor.
- `repliesCount` is present on **top-level comments only**. A reply cannot be
  answered, so the field is absent rather than zero on a reply.
- `likesCount` is on **every** comment at both levels, and is public. `isLiked` is
  the **reading** account's own state and is `false` for a guest — who still sees
  the count. Both come from the same query as the comment.
- Returns `404` if the tweet doesn't exist.
- The tweet's own `commentsCount` counts **both levels** — comments and replies
  together — so it does not match the length of this list.

---

### `GET /comments?parentId=:id` — One comment's replies (cursor-paginated)

**Auth:** Optional — as above
**Query params:** `?parentId=1&cursor=<id>&limit=10`

The second and last level. A replies list is fetched separately from the thread,
so the interface can keep it collapsed until a reader asks for it.

```jsonc
// Response 200 — the same comment shape, with parentId set and no repliesCount
{
  "success": true,
  "data": [
    {
      "id": 8,
      "body": "@ahmed which edge case?",
      "media": null,
      "author": { "id": 3, "username": "rania", "name": "Rania", "avatar": null },
      "tweetId": 5,
      "parentId": 1,
      "likesCount": 2,
      "isLiked": true,
      "editedAt": null,
      "createdAt": "2026-05-10T12:09:00.000Z"
    }
  ],
  "meta": { "nextCursor": "8", "limit": 10, "hasMore": false }
}

// Response 404 (no such comment)
{ "success": false, "error": { "type": "not_found", "message": "Comment not found" } }
```

**Notes:**
- Ordered by `id ASC`, and paginated exactly as the thread is.
- A reply carries no `repliesCount`: the thread is two levels and stops here. It
  does carry `likesCount` and `isLiked` — a reply can be liked like anything else.

---


### `POST /comments` — Add comment

**Auth:** Required

**`body`** follows [Body text](#body-text).

```jsonc
// Request body
{
  "tweetId": 5,             // required — which tweet to comment on
  "body": "Nice tweet!",    // required, 1-280 characters
  "parentId": 1,            // optional — the comment this one answers; omit for a top-level comment
  "media": { "token": "<token>" }  // optional — a single media file you uploaded (its read token)
}

// Response 201
{
  "success": true,
  "data": {
    "id": 8,
    "body": "Nice tweet!",
    "media": { "token": "<token>" },  // the attached file, or null
    "author": { "id": 1, "username": "basel", "name": "Basel", "avatar": null },
    "tweetId": 5,
    "parentId": 1,                     // null for a top-level comment
    "repliesCount": 0,                 // present only when parentId is null
    "likesCount": 0,
    "isLiked": false,
    "editedAt": null,            // a comment is never born edited
    "createdAt": "2026-05-10T14:35:00.000Z"
  }
}

// Response 401
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 422
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "body": ["Comment body cannot be empty"] } } }

// Response 422 (the parent sits on a different tweet)
{ "success": false, "error": { "type": "validation", "message": "Comment could not be saved", "errors": { "parentId": ["The comment being replied to belongs to a different post"] } } }

// Response 422 (the parent is itself a reply — the thread is two levels)
{ "success": false, "error": { "type": "validation", "message": "Comment could not be saved", "errors": { "parentId": ["A reply cannot be answered; reply to the comment it sits under"] } } }

// Response 404 (no such tweet, or no such parent comment)
{ "success": false, "error": { "type": "not_found", "message": "Tweet not found" } }
```

**Notes on `parentId`:**
- Omit it for a top-level comment. Give it to answer a comment.
- **The thread is two levels and no more.** A `parentId` naming a reply is
  refused `422` rather than silently re-pointed at the top-level comment above
  it — the server never moves a row the caller did not name. To answer a reply,
  send the **top-level** comment's id and address the person in the body, which
  is what the interface does.
- A `parentId` that does not exist is `404`, the same answer a missing tweet
  gets. A parent that exists but is wrong — another tweet, or another reply — is
  `422`, because what is wrong is the request's meaning rather than the resource.
- A reply keeps its tweet's id, which is why the tweet's `commentsCount` covers
  both levels.

---

### `PATCH /comments/:id` — Edit own comment

**Auth:** Required

**`body`** follows [Body text](#body-text).

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
    "media": { "token": "<token>" },  // the comment's single media file, or null
    "author": { "id": 2, "username": "ahmed", "name": "Ahmed", "avatar": null },
    "tweetId": 5,
    "parentId": null,
    "repliesCount": 2,
    "likesCount": 7,
    "isLiked": true,                   // the editor's own state, not a flat false
    "editedAt": "2026-05-10T12:40:00.000Z",  // this edit changed the text
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
- `editedAt` is set **only** when this edit changed the **text**. Attaching,
  replacing or removing the image does not set it, and neither does submitting
  the same words; once set it is never cleared. See ["Edited"](#edited--editedat).
- Comments carry no `updatedAt`, by design — see the same section.

---

### `DELETE /comments/:id` — Delete own comment

**Auth:** Required

**Deleting a top-level comment deletes its replies too**, in one transaction —
the reader is told so before confirming. Nothing the removed comments referenced
is left behind: every media reference ends before its row does, and the objects
themselves survive unreferenced for reclamation to take.

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

### `PUT /comments/:id/like` — Like a comment

**Auth:** Required

Works on a comment and on a reply alike — a reply is a comment.

```jsonc
// Response 200
{ "success": true, "data": { "liked": true, "likesCount": 13 } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Comment not found" } }
```

---

### `DELETE /comments/:id/like` — Unlike a comment

**Auth:** Required

```jsonc
// Response 200
{ "success": true, "data": { "liked": false, "likesCount": 12 } }

// Response 404
{ "success": false, "error": { "type": "not_found", "message": "Comment not found" } }
```

**Notes:** idempotent in both directions, exactly as the tweet's are — see the
notes under [`PUT /tweets/:id/like`](#put-tweetsidlike--like-a-tweet). Deleting a
comment takes its likes with it, and deleting a tweet takes the likes of its
comments at both levels.

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
    "avatar": { "token": "Nk3v9qYw1kPz-XG27RODaQ" },  // null when unset; render via GET /media/:token
    "bio": "",
    "tweetsCount": 12,
    "likesCount": 34,
    "followersCount": 120,
    "followingCount": 45,
    "isFollowing": true,
    "followsYou": false,
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
- `avatar`: `{ token } | null` — the resolved avatar read token (ADR 0008).
- `tweetsCount`: total tweets authored by this user
- `likesCount`: total likes received across all their tweets
- `followersCount` / `followingCount`: computed via `COUNT()` on follows table
- `isFollowing` / `followsYou`: the pair a Follow button needs — see
  [FollowState](#followstate). Both `false` for a guest, and both `false` on your
  own profile
- `:username` accepts a current **or** a former handle: a former handle (freed by a rename, held indefinitely) **`301`-redirects** to the current canonical URL, so historical profile links never `404`. Only a handle that was never assigned returns `404`.

### `GET /users/me` — Own profile

**Auth:** Required. Returns the authenticated user's own profile — the `GET /users/:username` shape **plus `email` and `emailVerification`** (self-view-only fields; the public view omits both), with `isFollowing: false` and `followsYou: false` — you cannot follow yourself. `me` is a reserved self-alias resolved from the token. This is the canonical current-user resource.

`emailVerification` is `"unproven" | "pending" | "proven"` — a **projection** resolved at read time from [Channel Verification](#channel-verification), which owns the fact. Nothing about it is stored on the account, and changing the address reads as `unproven` because the proof was about the previous value.

### `PATCH /users/me` — Update own profile

**Auth:** Required. Updates any subset of `username`, `name`, `bio`, `avatar` — **atomically** (all requested changes commit together or none do). `name` follows the same three-way rule as the avatar: **omitted = unchanged, `null` = clear, a string = set** (`name` is never derived from `username`). **`name` and `bio` are text other readers see**, so both follow [Text safety](#text-safety). Their lengths are counted in UTF-16 units **before trimming**, on the normalised text: at most 50 for `name` and 160 for `bio`. **A name must have something in it:** `""`, white space alone and invisible characters alone are refused with *"Name is required"*, and a name is cleared with `null`. **A bio is cleared with `""`**, and white space or invisible characters alone become `""`; a bio **refuses `null`**. Changing `username` **renames the handle**: the old handle is reserved (see below), the new one becomes current, and because the session is keyed on the immutable `id` (never the handle), the **same access token keeps working with no re-login or refresh** — the response is the authoritative new identity. Returns the updated self profile (the same shape as `GET /users/me`, including `email` and `emailVerification`).

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
    "errors": { "avatar": ["Avatar must be a JPEG or PNG image"] } } }
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

**Auth:** Optional — a signed-in reader gets each row's follow state; a guest reads the list all the same
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
      "avatar": null,
      "bio": "Developer",
      "isFollowing": false,   // see FollowState — both false for a guest
      "followsYou": true
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

**Auth:** Optional — as above
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
      "avatar": null,
      "bio": "Designer",
      "isFollowing": true,
      "followsYou": false
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

**Notes on both lists:**
- Each row carries [FollowState](#followstate), so its Follow button can be drawn
  without a request per row. Both fields are `false` for a guest, and `false` on
  the reader's own row.
- **Resolved once for the whole page**, alongside the avatars — a page of fifty
  costs the same two lookups as a page of one, and a guest costs none.
- Adding these fields and widening the auth mode are **additive**: no field was
  removed or redefined, so no `v2` and no pre-release exception.

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

## Onboarding Journey

The registration journey a client presents after the account exists: profile, then verification. It decides **only which onboarding screens a reader may reach**; nothing an account may do is gated on it ([ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) Decision 2, as revised). Every endpoint remains open to a reader whose journey is closed or absent.

A journey is created by **`POST /auth/register` alone**, once per account, in the same transaction as the account. Signing in never creates one, which is what makes these screens unreachable to anyone who did not just register. Nothing deletes the row: a closed journey stays closed permanently.

**Phase** is derived at read time and never stored. **How a step was left is stored**, because it cannot be derived: saving a profile and skipping it end the same transition and leave indistinguishable data behind, so the reader's own choice is the only witness and the client asserts it.

The phases:

| Value | Meaning |
|---|---|
| `profile` | registered; the profile step is where the reader belongs |
| `verify` | the profile step is settled, by saving or by skipping |
| `code` | the code screen has been reached — terminal, and the reader does not return |
| `none` | no journey, or a closed one. The two are deliberately indistinguishable |

`none` collapses *closed* and *never had one* because the difference tells a client nothing it can act on — both mean "not in the journey" — and the same uniform-answer posture the verification failure takes.

### `GET /api/v1/onboarding/journey` — Where this reader belongs

**Auth:** Required. **Rate limit:** the general API limiter (100 req / 15 min per IP).

Answers for every authenticated caller and writes nothing. **There is no `404`:** a missing journey is a legitimate answer, so a client never reads a status code to decide where to send a reader.

`profileOutcome` is `"saved" | "skipped"` once the profile step has been left, and `null` before it — including for a journey settled before the field existed.

```jsonc
// Response 200
{ "success": true, "data": { "phase": "profile", "profileOutcome": null } }

// Response 401 — no valid Bearer token
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }
```

### `POST /api/v1/onboarding/journey/advance` — Move the journey

**Auth:** Required. **Rate limit:** the general API limiter.

Moves the reader's own journey forward, or refuses. **Answers with the same shape the read does, either way**, so a client re-syncs from every response rather than keeping half the answer from its own request.

A journey moves forward or not at all. A request to go *backwards* is a **no-op**, not an error — the reader is already past it, and the true state is returned. Refusal is reserved for a move that would **skip** a step.

**The body is discriminated on `to`.** Leaving the profile step carries how it was left; **no other move may carry an outcome**, and one sent with `code` or `completed` is refused rather than ignored. The verification step's outcome is not the client's to state — it is derived from the capability that owns it.

```jsonc
// Request — leaving the profile step, whether saved or skipped
{ "to": "verify", "outcome": "saved" | "skipped" }

// Request — every other move
{ "to": "code" }
{ "to": "completed" }

// Response 200 — the state after the move (or the unchanged state, for a no-op)
{ "success": true, "data": { "phase": "verify", "profileOutcome": "saved" } }

// Response 409 — the move would skip a step, or the account has no journey
// and asked for something other than `completed`. Deliberately says no more:
// a caller learns that it cannot move, never why.
{ "success": false, "error": { "type": "conflict", "message": "That step is not available." } }

// Response 422 — `to` is not one of the three targets
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "to": ["Choose a step to move to."] } } }

// Response 422 — `to: "verify"` without an outcome, or with one the journey does not know
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "outcome": ["Say whether the profile was saved or skipped."] } } }

// Response 422 — an outcome asserted for a move that does not carry one
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "outcome": ["This step's outcome is not the client's to state."] } } }
```

**The transitions, and what each enforces:**

| From | `to` | Result |
|---|---|---|
| `profile` | `verify` | `200` `verify` — profile's only exit, whether saved or skipped, and the move records which |
| `profile` | `code` or `completed` | **`409`** — the profile step cannot be skipped past |
| `verify` | `code` | `200` `code`, **only if a verification challenge is currently outstanding**; otherwise `409` |
| `verify` | `completed` | `200` `none` — the reader declined verification |
| `code` | `completed` | `200` `none` |
| any | a step already passed | `200` with the current phase, unchanged |
| `none` | `completed` | `200` `none` — a repeated close is idempotent, so a lost response is safe to retry |
| `none` | anything else | **`409`** |

> **`verify → code` consults [Channel Verification](#channel-verification).** The code screen is terminal, and it is the one state nothing walks back — so it may not be reached unless there is a live challenge to type into it. The journey reads that fact through the capability's published query and owns none of it.

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

**Auth:** Required. **Rate limit:** 10 requests / 15 min per IP, *and* a durable **per-address cooldown** — the cooldown is the real control, since the per-IP limiter cannot stop an address being targeted from rotating addresses. Its length is a server setting (60 seconds by default); a client reads what remains of it from `resendAvailableInSeconds` on the `202` and from `Retry-After` on the cooldown `429`, and never hardcodes it.

**Request:** no body. The address is the authenticated account's own.

Issuing **rotates**: any outstanding challenge is superseded, so only the newest code works. The challenge is persisted before delivery is attempted, and a delivery failure is **reported, never destructive** — the code remains valid and can be resent.

**The response reports what is known, not that mail arrived.** No sender can promise delivery: a relay's acceptance means it took responsibility, and a timeout means the outcome is genuinely undetermined — the message may or may not have gone. `delivery` therefore carries three values rather than a boolean, and a client should treat `unknown` as it treats `accepted`: the code may well be on its way, so offer a resend rather than declaring failure.

```jsonc
// Response 202 — the challenge exists; delivery was attempted
{
  "success": true,
  "data": {
    // What the send is KNOWN to have achieved — never a claim of delivery.
    //   "accepted" — the backend took responsibility for the message
    //   "refused"  — it definitely was not sent
    //   "unknown"  — the attempt did not complete; it may or may not have been sent
    // The challenge stands in every case and can be resent.
    "delivery": "accepted",

    // Whole seconds until this address may be issued another code. Derived from
    // the record's own cooldown anchor and read as the answer is produced, so a
    // slow send SHORTENS it rather than inflating it. Use this for a resend
    // countdown; do not hardcode the cooldown, which is a server setting.
    "resendAvailableInSeconds": 60
  }
}

// Response 401 — no valid Bearer token
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 404 — the authenticated account no longer exists
{ "success": false, "error": { "type": "not_found", "message": "Account not found" } }

// Response 429 — a code was requested for this ADDRESS too recently (the
// per-address cooldown, measured in seconds). Carries `Retry-After` with the
// whole seconds remaining, from the same anchor the 202 reports its window from.
//   Retry-After: 40
{ "success": false, "error": { "type": "too_many_requests", "message": "A verification code was requested too recently. Please wait before requesting another." } }

// Response 429 — too many requests from this IP (the per-IP limiter, 10 / 15 min).
// A DIFFERENT refusal from the one above: a fifteen-minute lockout on the client,
// not a seconds-long throttle on the address. Distinguish them by `type`.
{ "success": false, "error": { "type": "rate_limit", "message": "Too many verification requests. Please wait 15 minutes before trying again." } }
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

// Response 429 — too many confirmations from this IP (the per-IP limiter, 10 / 15 min).
// Sized for people mistyping rather than for attackers: a single-use code of this
// length is out of brute-force reach whatever this limiter says. There is no
// per-address cooldown on confirm, so `too_many_requests` never appears here.
{ "success": false, "error": { "type": "rate_limit", "message": "Too many confirmation attempts. Please wait 15 minutes before trying again." } }
```

> **One failure shape, deliberately.** Uniform opacity is auditable; a carve-out is not. The moment one cause reports itself it acquires its own message, then its own status, and the guarantee decays by increments — the same reasoning as the generic `401` on login. A code is **single-use**, so replaying a confirmed one is refused identically; a *wrong* value, by contrast, leaves the challenge usable, so one mistyped character cannot deny a holder their own verification.

### `GET /channel-verification/challenges/current` — Where the holder stands

**Auth:** Required. **Rate limit:** the general cap, 100 req / 15 min per IP. This prefix carries no blanket limiter, so the read names one rather than having none.

Answers what the capability knows about the authenticated account's own endpoint, and how long until another challenge may be issued. **There is no `404`:** nothing outstanding is a legitimate answer meaning *there is nothing to wait for*, so a client never reads a status code to decide a screen — the same posture the password reset session's read takes.

**The subject is the caller's own**, resolved server-side exactly as it is for the two writes. A body or a query naming another address is ignored.

**`resendAvailableInSeconds` is the same number the `202` and the cooldown `429` report**, derived from the same anchor on the record at the moment the answer is produced. It is `0` when no window is running — never challenged, or the wait has passed — so a client offers a resend rather than a countdown. The cooldown stays a server setting, and a client that hardcoded it would be wrong whenever an operator changed it.

**`status` is the projection the self-view also exposes** as [`emailVerification`](#get-usersme--own-profile), resolved on read from the record and its challenge. The read writes nothing, so an expired challenge answers correctly whether or not anything has cleaned it up.

```jsonc
// Response 200 — a challenge is outstanding, and its window is still running
{ "success": true, "data": { "status": "pending", "resendAvailableInSeconds": 42 } }

// Response 200 — nothing outstanding, and nothing to wait for
{ "success": true, "data": { "status": "unproven", "resendAvailableInSeconds": 0 } }

// Response 200 — control is proven; a window from the last issue may still be running
{ "success": true, "data": { "status": "proven", "resendAvailableInSeconds": 0 } }

// Response 401 — no valid Bearer token
{ "success": false, "error": { "type": "unauthorized", "message": "Missing or invalid authorization header" } }

// Response 404 — the authenticated account no longer exists
{ "success": false, "error": { "type": "not_found", "message": "Account not found" } }
```

---

## Password Reset

Recovering access to an account whose password its owner no longer has. The capability owns one fact — that the bearer of a code is currently authorized to set a new password — and it is **not** Channel Verification: different subject, different actor, different lifetime, different consequence. Governing decision: [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md).

**Every endpoint here is unauthenticated**, and that is the point rather than an oversight. The actor is whoever holds the code; requiring a session would exclude precisely the people recovery exists for.

The flow is **request → confirm → apply**, with **resend** available from the code step, and a **reset session** carries a reader's position across it ([ADR 0017](../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)).

A request opens a session and answers with an `HttpOnly` cookie — **for every address alike**, since one issued only for a real account would answer, by its presence, the question this capability refuses to answer. `confirm` reports whether a code is usable and binds it to the caller's session; `apply` reads the credential **from the session** and never from the request. The client therefore stops holding a password-change credential the moment one is confirmed, and a code sent to `apply` is refused rather than ignored.

The session's lifetime is the credential's, a second request supersedes the first outright, and the cookie is cleared when the reset completes.

### Why these responses look different from Channel Verification's

The two capabilities both mint an emailed code and otherwise share almost nothing on the wire. The differences are deliberate, so they are listed rather than left to be inferred:

| | Channel Verification | Password Reset |
|---|---|---|
| `delivery` on the `202` | reported | **absent** — reporting it would confirm a send happened, and a send happens only for an address that exists |
| `resendAvailableInSeconds` | reported | **absent** — the account's cooldown exists only for a real account, so reporting it discloses that the account is real. The session's own `retryAfterSeconds` is a different number: seeded when the session opens, for every address alike |
| `Retry-After` on a cooldown | sent | **never** — a cooldown produces no refusal to carry one. The per-IP limiter's own `429` does send one, and it reports that limiter's window, not the account's |
| A cooldown refusal | a distinct `429` | **indistinguishable** from every other outcome |
| A session cookie | none | **set on every branch alike**, so its presence says nothing |

Channel Verification can report all of these safely because it is **authenticated**: the caller has already proved who they are, so nothing is disclosed. These endpoints are anonymous, and every one of those fields would answer the single question the capability refuses to answer.

### `POST /auth/password-reset` — Request a code

**Auth:** None. **Rate limit:** 10 requests / 15 min per IP, **shared with `POST /auth/password-reset/resend`** and sized for a whole recovery rather than one call. The durable controls sit beneath it and are the real answer: a per-account resend cooldown (60 seconds by default), and the mail mechanism's per-recipient cap with its reserved recovery floor ([`backend/mail.md`](../backend/mail.md)).

**The response is a constant for a given submitted address.** It is byte-for-byte identical whether that address belongs to no account, belongs to an account eligible for a fresh code, or belongs to an account still inside its cooldown. No field, header or status varies with any of that, and none is planned to: existence is never revealed, and never by advancing to a further step either.

**It answers with the session**, in exactly the shape `GET /session` returns — so a client never holds the step from one answer and the window from another. Every field in it is settled before the account is looked up: the mask is derived from what the caller typed, and the window is seeded when the session is opened.

```jsonc
// Request
{ "email": "holder@example.test" }

// Response 202 — always this, whatever happened. It does NOT mean a code was
// sent; it means the request was accepted and, if an account exists and is
// eligible, a code is on its way.
//
// Set-Cookie: qt_reset=<opaque>; Max-Age=<credential lifetime>; HttpOnly;
//   SameSite=Strict; Path=/api/v1/auth/password-reset; Secure in production
// Issued on every branch. A browser already holding one supersedes it.
{ "success": true, "data": { "step": "code", "maskedEndpoint": "h•••••@example.test", "retryAfterSeconds": 60, "canResend": true } }

// Response 422 — the address is not a well-formed email. A malformed REQUEST,
// not an answer about the account, so it is the one case that differs — and it
// discloses nothing, since the caller knows what they typed.
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "email": ["Invalid email format"] } } }

// Response 429 — too many requests from this IP. Retry-After IS sent here, by
// the limiter, and reports the IP window rather than anything about the account.
{ "success": false, "error": { "type": "rate_limit", "message": "Too many password reset requests. Please wait 15 minutes before trying again." } }
```

> **The mail is dispatched after this response is written**, never before it. Only one of the three branches has a message to send, so awaiting the send would put a measurable duration where the constant body denies one. A send that fails is not reported: there is nothing in it for a caller to learn, and a fresh request supersedes a lost code.

### `POST /auth/password-reset/resend` — Ask the session for another code

**Auth:** None. **Rate limit:** the **request limiter, shared** — 10 requests / 15 min per IP across this endpoint and `POST /auth/password-reset` together. Minting from here is the same act, and a second budget would make the real ceiling the sum of the two rather than either figure. The figure covers a whole recovery: one request, its resends, and a correction if the address was mistyped.

**The body is empty, and that is the whole request.** The address is read from the session, so a reader who reloaded — and therefore holds a mask rather than an address — can still ask. **A supplied `email` is refused with a `422`**, not ignored: a caller able to supply one would be a second source for a fact the session owns, and a mint path behind the wrong limiter.

**The ask is recorded before anything about the account is read**, so the window and the bound move whether or not a message follows. One that moved only when mail left would report whether mail left.

**The per-account cooldown beneath it stays silent**, exactly as on the request path: inside it nothing is minted, nothing is sent, and nothing in this response differs.

**A session may ask a bounded number of times.** Past the bound the endpoint refuses, and `canResend` on the session read has already said so — a client should not have called. Refused identically, too, for no session at all and for a session that has already confirmed a code: each is a fact about the caller's own browser rather than about any account.

**A successful ask does not rotate the previous code.** Earlier codes stay usable until they expire or are spent, so a reader holding two of them may use either. This differs from Channel Verification, whose resend supersedes.

```jsonc
// Request — no body. The session travels in the cookie.
{}

// Response 202 — always this, whatever happened, and the session cookie is
// re-set to the position's new expiry.
{ "success": true, "data": { "step": "code", "maskedEndpoint": "h•••••@example.test", "retryAfterSeconds": 60, "canResend": true } }

// Response 400 — no session, a session past the code step, or one whose asks
// are spent. The same single failure every unusable code produces.
{ "success": false, "error": { "type": "bad_request", "message": "That reset code is not valid." } }

// Response 422 — an address or a code was supplied
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "email": ["The address is not the caller's to supply here."] } } }

// Response 429 — too many requests from this IP, against the shared budget.
{ "success": false, "error": { "type": "rate_limit", "message": "Too many password reset requests. Please wait 15 minutes before trying again." } }
```

### `POST /auth/password-reset/confirm` — Check a code

**Auth:** None. **Rate limit:** 10 requests / 15 min per IP. Sized for someone retyping from an inbox on a phone rather than for an attacker: a 12-character code drawn from Crockford Base32 is out of brute-force reach whatever this limiter says.

**It consumes nothing.** The same code confirmed twice from one session reports usable both times; spending it is `apply`'s. What it does change is the session: a usable code is bound to it, which is what moves the reader to the password step.

**A usable code with no session is refused**, identically to every other failure — a session is where a confirmed credential is held, so without one there is nowhere for a success to go.

**Validation is presence-only**, exactly as Channel Verification's confirm is and for the same reason: rejecting a malformed value with a `422` and field errors would tell a caller something a wrong value does not. An **absent or empty** `code` is a malformed request and returns `422`; every value that is actually present — however malformed — reaches the capability and collapses into the single `400`.

```jsonc
// Request
{ "code": "7QK3MNP2XVZB" }

// Response 204 — the code is currently usable. No body. Nothing was consumed.

// Response 400 — the single failure. Never issued, expired, already used and
// simply wrong are ALL reported identically: same status, same message, no
// field errors.
{ "success": false, "error": { "type": "bad_request", "message": "That reset code is not valid." } }

// Response 429 — too many attempts from this IP.
{ "success": false, "error": { "type": "rate_limit", "message": "Too many attempts. Please wait 15 minutes before trying again." } }
```

### `GET /auth/password-reset/session` — Where the reader stands

**Auth:** None. **Rate limit:** none of its own; it spends nothing and checks no secret.

Answers the step, the masked address, and the session's resend window. **There is no `404`:** an absent or lapsed session is a legitimate answer meaning *start at the beginning*, so a client never reads a status code to decide a screen — the same posture the onboarding journey's read takes.

The address is masked where it is held; the unmasked value never reaches a response.

**`retryAfterSeconds` is the session's own window, not the account's cooldown**, and the distinction is what makes reporting it safe. It is seeded when the session is opened — for every submitted address alike, before any account is looked up — so it counts down from this session's own history and never answers whether an account holds the address. The per-account cooldown beneath it stays silent: inside it, nothing here changes and no message leaves.

The two clocks can therefore disagree, and only in one direction: this window may say *wait* when the account's cooldown would in fact allow a send, never the reverse. A client that waits it out always gets a real send.

**`canResend` is `false` once the session has spent its asks**, and where there is no session at all. A session may ask a bounded number of times, which is what stops a held key being renewed indefinitely; a client that finds it `false` offers *start over* rather than a control that would do nothing.

```jsonc
// Response 200 — no session, or one that has lapsed
{ "success": true, "data": { "step": "request", "maskedEndpoint": null, "retryAfterSeconds": 0, "canResend": false } }

// Response 200 — a session with no confirmed code yet, inside its window
{ "success": true, "data": { "step": "code", "maskedEndpoint": "h•••••@example.test", "retryAfterSeconds": 42, "canResend": true } }

// Response 200 — a code has been confirmed into it, and its asks are spent
{ "success": true, "data": { "step": "password", "maskedEndpoint": "h•••••@example.test", "retryAfterSeconds": 0, "canResend": false } }
```

### `POST /auth/password-reset/apply` — Set the new password

**Auth:** None. **Rate limit:** 5 requests / 15 min per IP — the tightest of the three, because this endpoint hashes the submitted password before the code is examined, so even a rejected request costs real work.

The new password is held to **exactly** registration's rules; the two share one schema rather than two copies of it.

On success the code is spent, the password is written, and **every session for the account is revoked** in one transaction — including the caller's own, if they had one. No tokens are returned and no session is established: the flow ends at Login. A credential change that left old sessions alive would leave whoever it was invoked against still signed in.

**The code is not sent here.** It is read from the session, and a request carrying one is refused with a `422` rather than having it ignored — a caller able to supply one silently would be a second source for a credential the session owns.

```jsonc
// Request — the session travels in the cookie
{ "newPassword": "N3wPassw0rd!" }

// Response 422 — a code was supplied
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "code": ["The code is not the caller's to supply here."] } } }

// Response 204 — the password is changed and every session is gone. No body,
// no tokens, no cookie. The client goes to Login.

// Response 400 — the same single failure as confirm's, including a code that
// was valid a moment ago and has since been spent or superseded.
{ "success": false, "error": { "type": "bad_request", "message": "That reset code is not valid." } }

// Response 422 — the new password fails the policy, or a required field is
// absent. Field errors are returned, exactly as on register.
{ "success": false, "error": { "type": "validation", "message": "Validation failed", "errors": { "newPassword": ["Password must contain at least one digit"] } } }

// Response 429 — too many attempts from this IP.
{ "success": false, "error": { "type": "rate_limit", "message": "Too many attempts. Please wait 15 minutes before trying again." } }
```

> **Single use is decided by the write, not the read.** Two callers racing on one code cannot both succeed: the update marking it used is conditional on it still being unused, and the transaction fails before any password is written if it loses. A code that is merely *wrong*, by contrast, leaves the credential usable — one mistyped character cannot deny a holder their own recovery.

> **These endpoints are additive** and appear in `v1` without a Pre-release Exception: nothing was removed or reshaped, so no consumer can have depended on a prior form.
