# Backend Setup Log

> This file documents every step taken during the backend setup process.
> It serves as a reference if the conversation is lost or for onboarding new contributors.

---

## Phase 1 — Project Structure (Step 1)

**Date:** 2026-05-03
**Branch:** `chore/backend-foundation`

### What was created

#### 1. Directory Structure

```
server/
├── docs/
│   ├── issues.md              ← GitHub issues for backend work
│   └── setup-log.md           ← this file
├── prisma/
│   └── schema.prisma          ← database schema (User model)
├── src/
│   ├── app.ts                 ← Express app setup (middleware, CORS, routes)
│   ├── server.ts              ← entry point (listen on port)
│   ├── config/
│   │   └── env.ts             ← type-safe environment variables via Zod
│   ├── middleware/
│   │   ├── errorHandler.ts    ← global error handler (catches all errors)
│   │   └── requestLogger.ts   ← logs method + path + status + duration
│   ├── modules/               ← feature modules (auth, posts, etc.)
│   │   └── .gitkeep           ← placeholder until first module
│   └── shared/
│       ├── errors/
│       │   └── AppError.ts    ← typed error class (mirrors frontend AppError)
│       └── types/
│           └── express.d.ts   ← Express Request type extension (userId)
├── .env.example               ← environment template for developers
├── package.json               ← backend-specific dependencies
└── tsconfig.json              ← TypeScript config (ES2022, strict)
```

#### 2. Design Decisions

| Decision | Reasoning | Principle |
|---|---|---|
| Separate `package.json` | Backend deps don't bloat frontend bundle | SRP |
| `config/env.ts` with Zod | Type-safe env, fails fast on missing vars | DIP — abstracts `process.env` |
| `AppError` class | Mirrors frontend error shape, consistent API | Error Normalization |
| `middleware/` directory | Cross-cutting concerns in one place | ISP — each middleware does one thing |
| `modules/` directory | Feature-sliced like frontend | Clean Architecture |
| `shared/` directory | Zero domain knowledge, reusable | Feature-Sliced Architecture |
| Express type extension | `req.userId` available in auth-guarded routes | TypeScript safety |

#### 3. Commits

- `commit 1` — scaffold: server directory structure + docs
- `commit 2` — config: tsconfig.json + package.json + .env.example
- `commit 3` — shared: AppError class + Express type extensions
- `commit 4` — middleware: error handler + request logger
- `commit 5` — core: Express app + server entry point
- `commit 6` — database: Prisma schema with User model

---

## Phase 2 — Package Installation (Step 2)

**Date:** 2026-05-04
**Branch:** `chor/install-backend-package`

### Production Dependencies (8)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP framework |
| `cors` | ^2.8.6 | Cross-origin requests (frontend ↔ backend) |
| `dotenv` | ^17.4.2 | Load `.env` variables |
| `zod` | ^4.4.3 | Request validation schemas |
| `bcrypt` | ^6.0.0 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT token creation & verification |
| `multer` | ^2.1.1 | File upload handling (profile images) |
| `@prisma/client` | ^7.8.0 | Database client (auto-generated) |

### Dev Dependencies (8)

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^6.0.3 | TypeScript compiler |
| `tsx` | ^4.21.0 | Run TypeScript directly (dev server, watch mode) |
| `prisma` | ^7.8.0 | Prisma CLI (migrations, generate, studio) |
| `@types/express` | ^5.0.6 | Express type definitions |
| `@types/cors` | ^2.8.19 | CORS type definitions |
| `@types/bcrypt` | ^6.0.0 | bcrypt type definitions |
| `@types/jsonwebtoken` | ^9.0.10 | JWT type definitions |
| `@types/multer` | ^2.1.0 | Multer type definitions |

### Additional Changes

- Added `server/.env` to root `.gitignore` to prevent committing secrets

### Commits

- `dcd4f44` — install all backend dependencies + update .gitignore

---

## Root-Level Scripts (Step 6)

**Date:** 2026-05-04
**Branch:** `chore/root-server-scripts`

Added convenience scripts to the root `package.json`:

| Script | Command | What it does |
|---|---|---|
| `npm run server` | `npm run dev --prefix server` | Starts backend only |
| `npm run dev:all` | `npm run dev & npm run server` | Starts frontend + backend together |

### Commits

- `3fc891c` — add root-level server convenience scripts

---

## Database Setup — Prisma v7 + PostgreSQL Migration

**Date:** 2026-05-05
**Branch:** `feature/prisma-v7-setup`
**PR:** #123

### Context

Prisma v7 introduced breaking changes from v6. We adapted our setup before running the first migration.

### Prisma v7 Breaking Changes Addressed

| What changed | v6 (old) | v7 (what we did) |
|---|---|---|
| Generator provider | `prisma-client-js` | `prisma-client` |
| Client output | Auto to `node_modules` | Explicit: `src/generated/prisma/` |
| Database URL | `url` field in `schema.prisma` | `prisma.config.ts` file |
| Client instantiation | `new PrismaClient()` | `new PrismaClient({ adapter })` with `@prisma/adapter-pg` |
| Env loading | Automatic | Manual via `import "dotenv/config"` |

### Files Created / Modified

| File | What |
|---|---|
| `prisma.config.ts` [NEW] | Provides `DATABASE_URL` to Prisma CLI via `defineConfig()` |
| `prisma/schema.prisma` [MODIFIED] | Updated generator + datasource + added `bio` + `RefreshToken` model |
| `server/.env` [NEW, gitignored] | Local database credentials |

### Migration: `20260505080727_init`

Creates two tables in PostgreSQL:

**`users` table:**

| Column | Type | Constraints |
|---|---|---|
| `id` | SERIAL | Primary key |
| `username` | TEXT | Unique |
| `email` | TEXT | Unique |
| `name` | TEXT | — |
| `password_hash` | TEXT | — |
| `profile_image` | TEXT | Nullable |
| `bio` | TEXT | Default `""` |
| `created_at` | TIMESTAMP | Default `now()` |
| `updated_at` | TIMESTAMP | Auto-updated |

**`refresh_tokens` table:**

| Column | Type | Constraints |
|---|---|---|
| `id` | SERIAL | Primary key |
| `token` | TEXT | Unique |
| `user_id` | INTEGER | FK → `users.id` (cascade delete) |
| `expires_at` | TIMESTAMP | — |
| `created_at` | TIMESTAMP | Default `now()` |

### New Package

| Package | Purpose |
|---|---|
| `@prisma/adapter-pg` | PostgreSQL driver adapter required by Prisma v7 |

### Gitignore Additions

- `server/.env` — database credentials (never commit)
- `server/src/generated` — auto-generated Prisma Client (regenerated via `npx prisma generate`)

### Commits

- `330b99b` — Prisma v7 config + schema changes
- `8b36de2` — migration (tables created) + gitignore

---

## Phase 3 — Auth Module

### Step 1 — Repository Layer

**Date:** 2026-05-05
**Branch:** `feature/auth-module-step1-repository`
**Parent Issue:** #2 (Auth Module)
**Sub-Issue:** #2.1 (Repository Layer)

#### Files Created

| File | Purpose | Principle |
|---|---|---|
| `shared/database/prisma.ts` | Prisma Client singleton with `PrismaPg` adapter | SRP — one connection pool for all modules |
| `shared/database/index.ts` | Barrel export | ISP — only exposes `prisma` |
| `modules/auth/auth.types.ts` | `IAuthRepository` + `ITokenRepository` interfaces + data shapes | DIP — service depends on abstractions |
| `modules/auth/auth.repository.ts` | Prisma implementation of both interfaces | LSP — swappable, Factory Pattern |

#### Design Decisions

| Decision | Reasoning | Principle |
|---|---|---|
| Two separate interfaces (user + token) | User queries and token queries are consumed by different parts | ISP |
| Factory functions instead of classes | Matches frontend pattern (`restAuth()`, `authMapper()`) | Factory Pattern |
| Default parameter `db = prisma` | Production uses singleton, tests inject mocks | DIP, testability |
| `PrismaInstance` type alias | Avoids importing `PrismaClient` type everywhere | SRP |
| Barrel export in `shared/database/` | Controls public API, hides implementation | ISP |

#### Commits

- `4395227` — issues: parent issue #2 + sub-issue #2.1
- `b64dcbc` — Prisma Client singleton with PrismaPg adapter
- `c798809` — IAuthRepository + ITokenRepository interfaces
- `76ce22f` — Prisma implementation of both interfaces

---

### Step 2 — Auth Service (Business Logic)

**Date:** 2026-05-05
**Branch:** `feature/auth-module-step2-service`
**Sub-Issue:** #2.2 (Auth Service)

#### Files Created / Modified

| File | Action | Purpose | Principle |
|---|---|---|---|
| `shared/utils/jwt.ts` | NEW | `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken` | SRP — only token operations |
| `shared/utils/index.ts` | NEW | Barrel export | ISP |
| `modules/auth/auth.types.ts` | MODIFIED | Added `IAuthService`, `AuthResult`, `TokenRefreshResult`, `LoginInput`, `RegisterInput` | DIP — controller depends on abstraction |
| `modules/auth/auth.service.ts` | NEW | Business logic: register, login, logout, refreshToken | SRP, DIP, Factory Pattern |

#### Error Handling Strategy

| Scenario | AppError Method | Status Code | Security Note |
|---|---|---|---|
| Username taken | `AppError.conflict()` | 409 | — |
| Email taken | `AppError.conflict()` | 409 | — |
| Wrong username | `AppError.authentication()` | 401 | Generic "Invalid credentials" — prevents username enumeration |
| Wrong password | `AppError.authentication()` | 401 | Same generic message |
| Invalid refresh token | `AppError.authentication()` | 401 | — |
| Expired refresh token | `AppError.authentication()` | 401 | Token deleted from DB on expiry |

#### Design Decisions

| Decision | Reasoning | Principle |
|---|---|---|
| bcrypt salt rounds = 12 | ~250ms per hash — secure yet responsive | Security |
| Refresh token = crypto UUID | Opaque — validated by DB lookup, not decoding | Security |
| Token rotation on refresh | Old token deleted, new one created — stolen tokens become invalid | Security |
| Generic "Invalid credentials" | Same message for wrong username and wrong password | Security (no enumeration) |
| `createAuthService(authRepo?, tokenRepo?)` | Injectable repos for testing | DIP, Factory Pattern |
| JWT type cast for `expiresIn` | `@types/jsonwebtoken` uses `StringValue`, not plain `string` | TypeScript compatibility |

#### Commits

- `d997e33` — issues: sub-issue #2.2
- `98b7737` — JWT utility (generateAccessToken, generateRefreshToken, verifyAccessToken)
- `cd3cfe2` — IAuthService interface + JWT type fix
- `bf7aee8` — auth service implementation (register, login, logout, refreshToken)

---

### Step 3 — API Layer (Routes, Controller, Validators, Middleware)

**Date:** 2026-05-05
**Branch:** `feature/auth-module-step3-api`
**Sub-Issue:** #2.3 (API Layer)

#### Endpoints

| Method | Path | Middleware | Status |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `validate(registerSchema)` | 201 Created |
| `POST` | `/api/v1/auth/login` | `validate(loginSchema)` | 200 OK |
| `POST` | `/api/v1/auth/logout` | `validate(logoutSchema)` | 204 No Content |
| `POST` | `/api/v1/auth/refresh` | `validate(refreshSchema)` | 200 OK |
| `GET` | `/api/v1/auth/me` | `authGuard` | 200 OK |

#### Files Created / Modified

| File | Action | Purpose | Principle |
|---|---|---|---|
| `middleware/validate.ts` | NEW | Generic Zod validation middleware | SRP, OCP — works with any schema |
| `middleware/authGuard.ts` | NEW | JWT verification, attaches `userId` to request | SRP, Middleware Pattern |
| `modules/auth/auth.validator.ts` | NEW | Zod v4 schemas for all auth endpoints | SRP — only schema definitions |
| `modules/auth/auth.controller.ts` | NEW | Parse request → call service → format response | SRP, DIP, Factory Pattern |
| `modules/auth/auth.routes.ts` | NEW | Express router wiring | SRP — only route definitions |
| `app.ts` | MODIFIED | Mount auth routes at `/api/v1/auth` | OCP — extend by import |

#### Design Decisions

| Decision | Reasoning | Principle |
|---|---|---|
| Zod v4 `{ error: "..." }` syntax | Project uses Zod 4.4.3, not v3 | Compatibility |
| `toUserResponse()` strips `passwordHash` | Never send password hash to client | Security |
| `next(err)` in controller catch blocks | Delegates all errors to `errorHandler` middleware | Middleware Pattern |
| Generic `validate()` middleware | Same middleware for auth, posts, comments — just pass different schema | OCP |
| `AuthenticatedRequest` extends `Request` | Type-safe `userId` access in protected controllers | TypeScript |

#### Commits

- `d70d2b6` — issues: sub-issue #2.3
- `16fd0bb` — generic Zod validation middleware
- `a3b633e` — authGuard middleware (JWT verification)
- `c3c2276` — Zod v4 schemas for auth endpoints
- `ca5cea4` — auth controller (HTTP handlers)
- `bfb8fc6` — auth routes + mount in app.ts

---

### Step 4a — Cookie Security (httpOnly Refresh Token)

**Date:** 2026-05-06
**Branch:** `feature/auth-module-step4a-cookie-security`
**Sub-Issue:** #2.4a (Cookie Security)

#### Problem

Step 3 sent the refresh token in the JSON response body:
```json
{ "user": {...}, "accessToken": "eyJ...", "refreshToken": "550e8400-..." }
```
This means any JavaScript on the page (including XSS-injected scripts) could steal the refresh token via `response.data.refreshToken`. Since the refresh token is long-lived (7 days), a stolen one grants persistent access.

#### Solution — Hybrid Token Storage

| Token | Where | Why |
|---|---|---|
| Access Token | Response body → Frontend memory (Redux) | Short-lived (15min), acceptable risk |
| Refresh Token | httpOnly cookie (server-set) | Long-lived (7 days), JS **cannot** read it |
| User data | Response body → localStorage | Not sensitive, for UI hydration |

#### Cookie Configuration

```typescript
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,                          // JS cannot read
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "strict",                      // blocks CSRF
  path: "/api/v1/auth",                   // only sent to auth endpoints
  maxAge: 7 * 24 * 60 * 60 * 1000,       // 7 days
};
```

#### Files Modified

| File | Change | Principle |
|---|---|---|
| `package.json` | Added `cookie-parser` + `@types/cookie-parser` | — |
| `app.ts` | `cookieParser()` middleware + `credentials: true` in CORS | SRP — middleware concern |
| `auth.controller.ts` | `res.cookie()` sets token, `req.cookies` reads it | SRP — HTTP concern |
| `auth.validator.ts` | Removed `refreshSchema` / `logoutSchema` | YAGNI — no body to validate |
| `auth.routes.ts` | Removed `validate()` from `/logout` and `/refresh` | Follows validator removal |

#### Endpoint Changes

| Endpoint | Before | After |
|---|---|---|
| `POST /register` | Body: `{ user, accessToken, refreshToken }` | Body: `{ user, accessToken }` + Set-Cookie |
| `POST /login` | Body: `{ user, accessToken, refreshToken }` | Body: `{ user, accessToken }` + Set-Cookie |
| `POST /logout` | Body: `{ refreshToken }` → service | Cookie → service + clearCookie |
| `POST /refresh` | Body: `{ refreshToken }` → service | Cookie → service + new Set-Cookie |
| `GET /me` | No change | No change |

#### Commits

- `8e22cbb` — docs: update plan — split Step 4 into 4a + 4b
- `c44acca` — chore: install cookie-parser
- `ca2f488` — feat: cookie-parser middleware + CORS credentials
- `f9ef9be` — refactor: controller uses res.cookie / req.cookies
- `4967eea` — refactor: remove refreshSchema / logoutSchema
- `a2fffa6` — refactor: remove validate() from /logout and /refresh routes

---

### Step 4b — Frontend Data Model (Types, DTOs, Mapper, Store, API Clients)

**Date:** 2026-05-06
**Branch:** `feature/auth-module-step4b-frontend-model`
**Sub-Issue:** #2.4b (Frontend Data Model)

#### What Changed

Aligned every frontend type, DTO, mapper, store slice, and API client with the new backend response format (camelCase, cookie-based auth, no counts).

#### Files Modified

| File | Change | Phase |
|---|---|---|
| `shared/types/user.ts` | Add `bio`, `createdAt`, nullable `profileImage`, remove `Counts` | A |
| `entity/AuthResponse.ts` | `token` → `accessToken` | B |
| `dto/AuthResponse.ts` | `UserDto` camelCase, `accessToken` only | B |
| `dto/AuthRequest.ts` | `image` → `profileImage` | B |
| `mapper/authMapper.ts` | Remove snake_case conversion, `accessToken` | C |
| `shared/storage/AppStorage.ts` | `TOKEN` → `ACCESS_TOKEN` | D |
| `services/authSessionService.ts` | `getToken` → `getAccessToken` | D |
| `interceptors/request.ts` | `STORAGE_KEYS.ACCESS_TOKEN` | D |
| `interceptors/response.ts` | `STORAGE_KEYS.ACCESS_TOKEN` | D |
| `store/state/AuthState.ts` | `token` → `accessToken` | E |
| `store/types/AuthPayloads.ts` | `token` → `accessToken` | E |
| `store/state/initialState.ts` | `ACCESS_TOKEN` key | E |
| `store/authSlice.ts` | Reducer: `accessToken` | E |
| `shared/api/client.ts` | `baseURL` → localhost:4000 | F |
| `shared/api/authClient.ts` | `baseURL` → localhost:4000, `withCredentials: true` | F |
| `repository/restAuth.ts` | `/auth/*` paths, JSON body | G |
| `hooks/useAuthState.ts` | `token` → `accessToken` | G |
| `hooks/useAuthActions.ts` | `res.token` → `res.accessToken` | G |

#### Commits

- `7cd83a5` — Phase A: User entity update
- `3adfd64` — Phase B: entity + DTOs
- `e900c03` — Phase C: mapper simplification
- `89eda72` — Phase D: storage + session + interceptors
- `b6714d0` — Phase E: Redux store
- `501407a` — Phase F: API clients → localhost
- `8592c07` — Phase G: consumers (restAuth, hooks)

---

### Step 5 — Frontend Integration (Logout, Refresh Interceptor, Hybrid Storage, Silent Refresh)

**Date:** 2026-05-07
**Branch:** `feature/auth-module-step5-frontend-integration`
**Sub-Issue:** #2.5 (Frontend Integration)

#### Hybrid Token Model

| Data | Storage | Why |
|---|---|---|
| Access Token | Redux memory ONLY | Never touches localStorage — safe from XSS |
| Refresh Token | httpOnly cookie (server-set) | JS cannot read it |
| User data | localStorage | Not sensitive — UI hydration hint |

#### What Changed

| File | Change | Task |
|---|---|---|
| `dto/RefreshResponse.ts` | NEW — DTO for `/refresh` response | 1 |
| `repository/AuthRepository.ts` | Added `refresh(): Promise<string>` | 1 |
| `repository/restAuth.ts` | Implemented `refresh()` via authApi | 1 |
| `hooks/useAuthActions.ts` | Logout calls backend API first (try/finally) | 2 |
| `interceptors/response.ts` | 401 → refresh → retry with concurrent queue, callback injection | 3 |
| `interceptors/request.ts` | Accepts `getAccessToken` callback instead of localStorage | 3 |
| `api/authClient.ts` | Wiring layer — provides Redux callbacks to interceptors | 3 |
| `api/client.ts` | Simple error normalization (no refresh) | 3 |
| `storage/AppStorage.ts` | Removed ACCESS_TOKEN from STORAGE_KEYS | 4 |
| `services/authSessionService.ts` | Saves only user data (no token) | 4 |
| `store/state/initialState.ts` | accessToken always null on startup | 4 |
| `hooks/useInitAuth.ts` | NEW — silent refresh on startup | 5 |
| `hooks/index.ts` | Exported useInitAuth | 5 |
| `app/routes/App.tsx` | Loading screen during initialization | 5 |

#### Architecture Decisions

- **Callback injection**: Interceptors accept callbacks instead of importing Redux directly. The `shared/api` layer stays generic and doesn't know about the application's state management.
- **Concurrent request queue**: When multiple requests fail with 401 simultaneously, only ONE `/refresh` call is made. All others wait and retry with the new token.
- **Logout guarantee**: `try/finally` ensures local session is ALWAYS cleared, even if the backend API call fails.

---

### Step 6 — End-to-end Verification

_To be documented when executed._

---
---

# Phase 3 — Data Models (Issue #3)

> This section documents the expansion of the database schema to support tweets, comments, and likes.
> Separated from Phase 2 (Auth) documentation above.

---

## Step 0 — Prisma Schema (Tweet, Comment, Like)

**Date:** 2026-05-10
**Branch:** `feature/data-models-schema`
**Issue:** #3 (Data Models)
**Migration:** `20260510140834_add_tweets_comments_likes`

### New Models

| Model | Table | Purpose |
|---|---|---|
| Tweet | `tweets` | User posts, 280 chars max |
| Comment | `comments` | Replies to tweets |
| Like | `likes` | User-tweet like (unique pair) |

### Tweet Model

| Column | Type | Constraint |
|---|---|---|
| id | Int | PK, auto-increment |
| body | VarChar(280) | Required |
| image | String | Optional (URL) |
| author_id | Int | FK → users.id, CASCADE |
| created_at | DateTime | Default: now() |
| updated_at | DateTime | Auto-update |

**Indexes:** `author_id` (profile queries), `created_at DESC` (feed ordering)

### Comment Model

| Column | Type | Constraint |
|---|---|---|
| id | Int | PK, auto-increment |
| body | VarChar(280) | Required |
| author_id | Int | FK → users.id, CASCADE |
| tweet_id | Int | FK → tweets.id, CASCADE |
| created_at | DateTime | Default: now() |

**Indexes:** `tweet_id` (comments for a tweet), `author_id` (user's comments)

### Like Model

| Column | Type | Constraint |
|---|---|---|
| id | Int | PK, auto-increment |
| user_id | Int | FK → users.id, CASCADE |
| tweet_id | Int | FK → tweets.id, CASCADE |
| created_at | DateTime | Default: now() |

**Constraints:** `UNIQUE(user_id, tweet_id)` — one like per user per tweet
**Indexes:** `tweet_id` (count likes for a tweet)

### User Model Updates

Added relation arrays: `tweets Tweet[]`, `comments Comment[]`, `likes Like[]`

### Cascade Delete Chain

```
Delete User → deletes all their tweets, comments, likes, refresh tokens
Delete Tweet → deletes all its comments and likes
```

### Design Decisions

- **VarChar(280)**: Enforced at DB level, not just application level. Double safety.
- **Like as separate model**: Instead of a counter field, a Like table allows us to know WHO liked, prevent duplicates via DB constraint, and easily toggle.
- **No soft delete**: YAGNI — we can add `deletedAt` later if needed.
- **image as URL string**: File storage is a separate concern (future Multer integration). The DB stores the URL.

---

## Step 1 — API Contract

**Date:** 2026-05-10
**Branch:** `docs/api-contract`
**Issue:** #4 (API Contract)
**File:** `server/docs/api-contract.md`

### Endpoints Summary

| Group | Method | Endpoint | Auth |
|---|---|---|---|
| Tweets | GET | `/tweets` | Optional |
| Tweets | GET | `/tweets/:id` | Optional |
| Tweets | POST | `/tweets` | Required |
| Tweets | PATCH | `/tweets/:id` | Required |
| Tweets | DELETE | `/tweets/:id` | Required |
| Tweets | POST | `/tweets/:id/like` | Required |
| Comments | GET | `/tweets/:tweetId/comments` | None |
| Comments | POST | `/tweets/:tweetId/comments` | Required |
| Comments | PATCH | `/comments/:id` | Required |
| Comments | DELETE | `/comments/:id` | Required |
| Users | GET | `/users/:username` | None |
| Users | GET | `/users/:username/tweets` | Optional |

**Total: 12 endpoints** (6 tweets, 4 comments, 2 users)

### Shared Types

- **AuthorEmbed**: `{ id, username, name, profileImage }` — embedded in tweets and comments
- **PaginationMeta**: `{ currentPage, limit, totalPages, totalRecords, hasNextPage, hasPreviousPage }`
- **ErrorResponse**: `{ type, message }` — matches existing AppError pattern

### Key Design Decisions

- **Optional auth**: Feed and tweet detail accept auth optionally — `isLiked` is `false` for guests
- **PATCH for edits**: partial update (not PUT) — only send fields that changed
- **Like toggle**: one endpoint handles both like and unlike — no separate endpoints
- **Comments ordered ASC**: oldest first (conversation style), unlike tweets which are newest first
- **Standalone delete routes**: `DELETE /comments/:id` is not nested under tweets
- **User profile counts**: `tweetsCount` + `likesCount` (received) — aggregated server-side

---
---

# Phase 4 — Server Foundations Reform (Issue #5)

> This section documents infrastructure fixes identified during the project review.
> These set the patterns that ALL future modules follow.
> Reference: `Gaps-and-shortcomings-map.md`

---

## Fix #5.1 — Response Wrapper (Standardize API Responses)

**Date:** 2026-05-11
**Branch:** `fix/response-wrapper`
**Issue:** #5.1 (Response Wrapper)
**Gap:** #5 from Gaps-and-shortcomings-map.md

### Problem

Responses had inconsistent shapes:
- Register/login: `{ user, accessToken }`
- Refresh: `{ accessToken }`
- Errors: `{ type, message }`
- Me: `{ user }`

Frontend had to guess the structure of each response.

### Solution

Standardized ALL responses to:

```
Success: { success: true, data: T, meta?: {...} }
Error:   { success: false, error: { type, message } }
```

### Files Changed

| File | What Changed |
|---|---|
| `shared/response/sendSuccess.ts` | New utility — `sendSuccess(res, data, statusCode?, meta?)` |
| `shared/response/index.ts` | Barrel export |
| `middleware/errorHandler.ts` | Wraps errors in `{ success: false, error: {...} }` |
| `modules/auth/auth.controller.ts` | All 5 handlers refactored to use `sendSuccess()` |
| `docs/api-contract.md` | Added Response Wrapper section |

### Design Decisions

- **`sendSuccess()` handles 204**: If `statusCode === 204`, it sends `res.status(204).send()` with no body.
- **Inline error removal**: Auth controller no longer has `res.status(401).json(...)` — all errors thrown as `AppError`, handled by `errorHandler`.
- **`meta` is optional**: Only included when there's pagination or extra info. Keeps simple responses clean.

---

## Fix #5.2 — Rate Limiting (Protect Endpoints from Abuse)

**Date:** 2026-05-12
**Branch:** `fix/rate-limiting`
**Issue:** #5.2 (Rate Limiting)
**Gap:** #2 from Gaps-and-shortcomings-map.md

### Problem

No rate limiting. Anyone could:
- Brute-force login with thousands of password attempts
- Spam POST endpoints creating garbage content
- Overload the server with requests (DoS)

### Solution

Three rate limiters with different thresholds:

| Limiter | Endpoints | Limit | Why |
|---|---|---|---|
| `authLimiter` | `/login`, `/register` | 10 / 15 min | Brute force protection (passwords) |
| `refreshLimiter` | `/refresh` | 30 / 15 min | Generous — silent refresh is automated |
| `apiLimiter` | Future routes | 100 / 15 min | General protection |

### Files Changed

| File | What Changed |
|---|---|
| `package.json` | Added `express-rate-limit@8.5.1` |
| `middleware/rateLimiter.ts` | New — 3 limiters with user-friendly 429 messages |
| `app.ts` | Added `trust proxy = 1` for correct IP behind proxies |
| `modules/auth/auth.routes.ts` | Applied authLimiter on login/register, refreshLimiter on refresh |
| `docs/api-contract.md` | Added 429 status + rate limiting section |

### Design Decisions

- **Per-route limiters (not global)**: authLimiter only on login/register. Refresh has its own generous limit. Logout/me have no rate limit — they're single-call endpoints.
- **Refresh excluded from authLimiter**: Silent refresh is automated. Sharing the strict 10-request auth limit would lock users out of login during normal browsing.
- **`trust proxy = 1`**: Required for production. Without it, all users behind a reverse proxy share one IP counter.
- **`standardHeaders: "draft-8"`**: Sends `RateLimit-*` headers so the frontend can show time-remaining info.
- **User-friendly messages**: Each limiter has a clear, specific message explaining what happened and when to retry.

---

## Fix #5.3 — optionalAuth Middleware (Soft Auth for Public Endpoints)

**Date:** 2026-05-12
**Branch:** `fix/optional-auth`
**Issue:** #5.3 (optionalAuth Middleware)
**Gap:** #9 from Gaps-and-shortcomings-map.md

### Problem

Two issues:
1. No middleware for endpoints that work for both guests and logged-in users (feed, tweet detail)
2. `authGuard` used a redundant `AuthenticatedRequest` interface + type cast instead of the global type

### Solution

Created `optionalAuth` middleware and simplified `authGuard`:

| Middleware | Behavior | userId after |
|---|---|---|
| `authGuard` | STRICT — 401 if no valid token | `number` (guaranteed) |
| `optionalAuth` | SOFT — never rejects | `number \| undefined` |

### Files Changed

| File | What Changed |
|---|---|
| `middleware/optionalAuth.ts` | New — soft auth with fast JWT format check |
| `middleware/authGuard.ts` | Removed `AuthenticatedRequest` interface, uses `req.userId` directly |
| `modules/auth/auth.controller.ts` | Removed cast, uses `req.userId!` directly |
| `shared/types/express.d.ts` | Updated docs for both middleware |

### Design Decisions

- **Fast JWT format check**: `token.split(".").length !== 3` — skips `jwt.verify()` for obviously malformed tokens. One `split()` call saves CPU on high-traffic public endpoints.
- **Removed `AuthenticatedRequest`**: Global `userId?: number` on Express Request already existed. The custom interface + cast was redundant boilerplate.
- **`req.userId!` in authGuard routes**: After `authGuard` runs, `userId` is guaranteed to exist. The non-null assertion (`!`) is safe because `authGuard` throws 401 before the controller if the token is invalid.
- **Never throws, never responds**: `optionalAuth` only enriches the request. All errors are silently caught — a guest with a bad token is still a guest.

---

## Fix #5.4 — Follow Model + API Contract Final Update

**Date:** 2026-05-12
**Branch:** `fix/follow-model-and-api-contract`
**Issue:** #5.4 (Follow Model + API Contract)
**Gaps:** #1, #3, #6, #7 from Gaps-and-shortcomings-map.md

### Part A — Follow Model

Added `Follow` model to Prisma schema for the social graph.

**Schema:**

```
follows table:
  id, follower_id, following_id, created_at
  UNIQUE(follower_id, following_id) — can't follow twice
  INDEX(follower_id) — fast "who am I following?" (feed)
  INDEX(following_id) — fast "who follows me?" (count)
  ON DELETE CASCADE — user deletion cleans relationships
```

**User model updated:**
- `followers: Follow[] @relation("following")` — people who follow ME
- `following: Follow[] @relation("followers")` — people I follow

### Part B — API Contract Updates

Three major changes reflected:

**1. Cursor Pagination (Gap #3)**
- Feed and user tweets use cursor (`?cursor=<id>&limit=10`)
- Comments keep offset (`?page=1&limit=20`) — small, bounded dataset
- Split `PaginationMeta` into `CursorPaginationMeta` + `OffsetPaginationMeta`

**2. Nested Comment Routing (Gap #6)**
- `PATCH/DELETE /comments/:id` → `PATCH/DELETE /tweets/:tweetId/comments/:commentId`
- Server validates comment belongs to the specified tweet

**3. Follow Endpoints (Gap #1)**
- `POST /users/:username/follow` — follow user
- `DELETE /users/:username/follow` — unfollow user
- `GET /users/:username/followers` — cursor-paginated follower list
- `GET /users/:username/following` — cursor-paginated following list
- User profile updated: +`followersCount`, +`followingCount`, +`isFollowing`

### Design Decisions

- **Cursor = id only**: Auto-increment IDs guarantee chronological order. No compound cursor needed.
- **COUNT() for follower counts**: No denormalization. COUNT() on indexed columns is O(log n) — fast for reasonable data sizes. Denormalize only if needed later.
- **Self-follow prevention**: Not enforced at schema level. Will be a Service Layer check in Phase E: `if (followerId === followingId) throw AppError.validation("Cannot follow yourself")`
- **Follow spam**: Already covered by apiLimiter (100 req/15min) + `@@unique` constraint.

### Files Changed

| File | What Changed |
|---|---|
| `prisma/schema.prisma` | Added Follow model + User relations |
| `prisma/migrations/add_follow_model` | Creates follows table |
| `docs/api-contract.md` | Cursor pagination, nested comments, follow endpoints |
| `docs/issues.md` | Sub-Issue #5.4 |

---

## Tweets Data Layer — Types, Validator, Repository

**Date:** 2026-05-13
**Branch:** `feat/tweets-data-layer`

### What was built

The data foundation for the tweets module — three files that define shapes, validation, and database queries.

### Files

| File | Purpose |
|---|---|
| `tweet.types.ts` | DTOs (TweetResponse, AuthorEmbed), cursor types, ITweetRepository, ITweetService |
| `tweet.validator.ts` | Zod schemas: createTweetSchema, updateTweetSchema, cursorQuerySchema |
| `tweet.repository.ts` | Prisma queries: CRUD with cursor pagination + like operations |

### Design Decisions

- **Cursor pagination (n+1 trick)**: Fetch `limit+1` items. If we get `limit+1` back, `hasMore=true` and we slice to `limit`. Avoids a separate COUNT query on every page.
- **`buildTweetInclude(userId?)`**: Shared helper builds the Prisma include for author embed, counts, and user's like. Every query uses the same include, ensuring consistent response shape.
- **`isLiked` via conditional include**: If `userId` is provided (logged in), includes `likes: { where: { userId } }`. If guest, skips the include entirely (empty array = not liked).
- **Compound unique key for likes**: `findLike/deleteLike` use `where: { userId_tweetId: { userId, tweetId } }` — Prisma's auto-generated compound unique key from `@@unique([userId, tweetId])`.
- **All types in one file**: Follows auth module pattern. All tweet types change together (same reason to change = SRP compliant).

---

## Tweets Service — Business Logic

**Date:** 2026-05-14
**Branch:** `feat/tweet-service`

### What was built

`tweet.service.ts` — implements `ITweetService` with 6 methods + a DTO transformer.

### Methods

| Method | What it does |
|---|---|
| `toTweetResponse()` | Transforms raw DB tweet → frontend DTO |
| `getFeed()` | n+1 slice, cursor meta, DTO map |
| `getById()` | Lookup + 404 |
| `create()` | Create + DTO |
| `update()` | Ownership check → update → DTO |
| `delete()` | Ownership check → delete |
| `toggleLike()` | Exists? → unlike, else → like → return new count |

### Design Decisions

- **`toTweetResponse()` is a plain function, not a method**: It's stateless — doesn't need `this` or the repository. Extracted outside the factory for reuse and clarity.
- **Ownership checks in update/delete**: Service verifies `tweet.authorId === userId` before mutating. The repository has no concept of "who is doing this" — that's a business rule.
- **`toggleLike` uses check-then-act**: `findLike()` → exists? delete : create. The `@@unique` constraint protects against race conditions (duplicate like INSERT fails).
- **`AppError.authorization()`** for ownership violations (403), **`AppError.notFound("Tweet")`** for missing resources (404).

---

## Tweets HTTP Layer — Controller, Routes, App Wiring

**Date:** 2026-05-14
**Branch:** `feat/HTTP-layer`

### What was built

Connected the tweets module to HTTP — controller handlers, route wiring, and app registration.

### Files

| File | What Changed |
|---|---|
| `tweet.service.ts` | Hardened `toggleLike` against race conditions (P2002/P2025) |
| `validate.ts` | Extended to support `"query"` source in addition to `"body"` |
| `tweet.controller.ts` | 6 handlers using `sendSuccess()` |
| `tweet.routes.ts` | Middleware wiring: optionalAuth, authGuard, validate |
| `app.ts` | Registered `/api/v1/tweets` with apiLimiter |

### Route Map

```
GET    /api/v1/tweets          → apiLimiter → optionalAuth → validate(query) → getFeed
GET    /api/v1/tweets/:id      → apiLimiter → optionalAuth → getById
POST   /api/v1/tweets          → apiLimiter → authGuard → validate(body) → create
PATCH  /api/v1/tweets/:id      → apiLimiter → authGuard → validate(body) → update
DELETE /api/v1/tweets/:id      → apiLimiter → authGuard → delete
POST   /api/v1/tweets/:id/like → apiLimiter → authGuard → toggleLike
```

### Security Review (pre-implementation checklist)

| Point | Status | How |
|---|---|---|
| Race condition in likes | ✅ Fixed | Catch Prisma P2002/P2025 gracefully |
| Pagination hard cap | ✅ Already covered | Zod max(50) in cursorQuerySchema |
| Cascade deletion | ✅ Already covered | onDelete: Cascade in schema |
| N+1 query problem | ✅ Already covered | Prisma `include` (JOINs, not N queries) |
| Select optimization | ✅ Fine as-is | Author uses select, tweet cols are minimal |

### Design Decisions

- **`validate(schema, "query")`**: Extended validate middleware with a `source` parameter. Default is `"body"` (backward compatible). Feed uses `"query"` for cursor/limit.
- **`isPrismaError()` helper**: Uses duck-typing to check Prisma error codes without importing Prisma's error class — keeps the service layer decoupled from Prisma internals.
- **apiLimiter on route group**: Applied at `app.use()` level, not per-route. All 6 tweet endpoints share the 100 req/15min limit.

---

## Shared Type Extraction + Comments Data & Service

**Date:** 2026-05-14
**Branch:** `feat/comments-data-and-service`

### Shared Type Extraction

Moved `AuthorEmbed`, `CursorParams`, `CursorMeta` from `tweet.types.ts` to `shared/types/common.ts`. Both tweets and comments (and future modules) import from the shared location. `tweet.types.ts` re-exports them for backward compatibility.

### Comments Module — Data Layer + Service

| File | Purpose |
|---|---|
| `comment.types.ts` | CommentResponse, OffsetParams, OffsetMeta, ICommentRepository, ICommentService |
| `comment.validator.ts` | Zod schemas: create, update, offset query (page/limit with coerce) |
| `comment.repository.ts` | Prisma queries with offset pagination (skip/take), ASC order |
| `comment.service.ts` | Double ownership checks, pagination math, parallel count+findMany |

### Design Decisions

- **Offset pagination (not cursor)**: Comments are bounded per tweet. Frontend needs `totalPages` + `currentPage` for a page navigator. `skip = (page-1) * limit`, `totalPages = ceil(totalRecords / limit)`.
- **`Promise.all([count, findMany])`**: Runs count and data queries in parallel — halves the latency for list requests.
- **Double ownership validation**: Update/delete checks 3 things: comment exists → comment.tweetId matches route param → comment.authorId matches userId. Prevents URL manipulation.
- **`assertTweetExists()`**: Lightweight helper uses `select: { id: true }` to check tweet existence without loading full tweet data. Used by `getComments` and `create`.
- **ASC ordering**: Comments ordered oldest first (`createdAt: "asc"`) — conversation order, unlike tweets which are newest first.

---

## Comments HTTP Layer — Controller, Routes, App Wiring

**Date:** 2026-05-14
**Branch:** `feat/comments-http`

### What was built

Connected the comments module to HTTP — controller handlers, route wiring, app registration.

### Files

| File | What Changed |
|---|---|
| `comment.controller.ts` | 4 handlers using `sendSuccess()` |
| `comment.routes.ts` | Route wiring with `mergeParams: true` |
| `app.ts` | Registered `/api/v1/tweets/:tweetId/comments` with apiLimiter |

### Route Map

```
GET    /api/v1/tweets/:tweetId/comments              → apiLimiter → validate(query) → getComments
POST   /api/v1/tweets/:tweetId/comments              → apiLimiter → authGuard → validate(body) → create
PATCH  /api/v1/tweets/:tweetId/comments/:commentId   → apiLimiter → authGuard → validate(body) → update
DELETE /api/v1/tweets/:tweetId/comments/:commentId   → apiLimiter → authGuard → delete
```

### Design Decisions

- **`Router({ mergeParams: true })`**: Required because the comment router is a child of `/api/v1/tweets/:tweetId/comments`. Without it, `req.params.tweetId` would be undefined.
- **No optionalAuth on GET**: Comments don't have an `isLiked` or similar field that requires the user's identity. Unlike the tweet feed, the comments list is fully public.
- **Phase C complete**: Comments module is fully functional — 4 endpoints live at `/api/v1/tweets/:tweetId/comments`.

---

## Users Module — Profile + User Tweets

**Date:** 2026-05-14
**Branch:** `feat/users-module`

### What was built

Two read-only endpoints: user profile with aggregated counts and user's tweets with cursor pagination.

### Files

| File | What Changed |
|---|---|
| `user.types.ts` | UserProfileResponse, UserWithCounts, IUserRepository, IUserService |
| `user.repository.ts` | Profile query with `_count`, `isFollowing` via compound unique, `countLikesReceived` |
| `tweet.types.ts` | Added `findByAuthor` to ITweetRepository |
| `tweet.repository.ts` | Implemented `findByAuthor(authorId, params, userId?)` |
| `user.service.ts` | Profile DTO with parallel queries, cross-module tweet orchestration |
| `user.controller.ts` | 2 handlers using sendSuccess |
| `user.routes.ts` | Route wiring with optionalAuth, reusing cursorQuerySchema |
| `app.ts` | Registered `/api/v1/users` with apiLimiter |

### Route Map

```
GET /api/v1/users/:username         → apiLimiter → optionalAuth → getProfile
GET /api/v1/users/:username/tweets  → apiLimiter → optionalAuth → validate(query) → getUserTweets
```

### Design Decisions

- **`likesCount` two-step query**: Prisma's `_count` can't compute nested aggregates. `countLikesReceived()` uses `db.like.count({ where: { tweet: { authorId } } })` — Prisma compiles this to an efficient SQL JOIN.
- **Parallel queries in profile**: `isFollowing` + `countLikesReceived` run via `Promise.all` — halves latency.
- **`isFollowing` as separate method**: Avoids conditional `select` in profile query that would require `as any`. Uses the `@@unique([followerId, followingId])` compound index.
- **`findByAuthor` in tweet repo**: Receives `authorId` (number), not `username`. User service resolves `username → authorId`, then delegates. No user-domain leak.
- **Cross-module reuse**: User tweets reuse `cursorQuerySchema`, `buildTweetInclude`, `toTweetResponse`, and `TweetResponse` from the tweets module.

---

## Follow Module — Follow/Unfollow + Follower/Following Lists

**Date:** 2026-05-15
**Branch:** `feat/follow-module`

### What was built

Four endpoints: separate follow/unfollow mutations, cursor-paginated follower/following lists. Self-follow prevention and idempotent error handling.

### Files

| File | Purpose |
|---|---|
| `follow.types.ts` | FollowActionResponse, FollowUserItem, IFollowRepository, IFollowService |
| `follow.repository.ts` | Follow CRUD, cursor-paginated lists, user lookup |
| `follow.service.ts` | Self-follow prevention, user existence, separate mutation logic |
| `follow.controller.ts` | 4 handlers using sendSuccess |
| `follow.routes.ts` | Route wiring with mergeParams, authGuard for mutations |
| `app.ts` | Registered follow routes at `/api/v1/users` (before user routes) |

### Route Map

```
POST   /api/v1/users/:username/follow      → apiLimiter → authGuard → follow
DELETE /api/v1/users/:username/follow      → apiLimiter → authGuard → unfollow
GET    /api/v1/users/:username/followers   → apiLimiter → validate(query) → getFollowers
GET    /api/v1/users/:username/following   → apiLimiter → validate(query) → getFollowing
```

### Design Decisions

- **Separate POST/DELETE (not toggle)**: Explicit intent, no ambiguity, no race conditions. Client knows exactly what action is being performed.
- **Follow routes before user routes in app.ts**: Both mount on `/api/v1/users`. More specific patterns (`:username/follow`, `:username/followers`) must register first to avoid the double-apiLimiter issue.
- **`resolveUser()` helper**: Shared between follow/unfollow/getFollowers/getFollowing — resolves username → userId or throws 404.
- **Cursor pagination for lists**: Follower/following lists are unbounded (unlike comments). Cursor pagination with n+1 trick — same pattern as tweet feed.
- **Self-follow prevention**: `AppError.validation("You cannot follow yourself")` — checked before any DB operation.
- **Error semantics**: Already following → 409 Conflict. Not following → 400 Validation. Matches API contract exactly.

### Backend Phases Complete 🎉

All five backend phases are now implemented:

| Phase | Module | Endpoints |
|---|---|---|
| A | Auth | register, login, refresh, logout, me |
| B | Tweets | feed, getById, create, update, delete, toggleLike |
| C | Comments | getComments, create, update, delete |
| D | Users | getProfile, getUserTweets |
| E | Follow | follow, unfollow, getFollowers, getFollowing |

---

## Security Hardening — Audit Response

**Date:** 2026-05-15
**Branch:** `fix/security-hardening`

### What was fixed

10 findings from Stage 1 security audit — infrastructure-level hardening.

### Fixes Applied

| # | Finding | Fix |
|---|---|---|
| C-1 | CORS hardcoded to localhost | Added `CORS_ORIGIN` env var, `app.ts` uses `env.CORS_ORIGIN` |
| C-2 | No helmet middleware | Installed `helmet@8.1.0`, added `app.use(helmet())` before all routes |
| C-3 | No JSON body size limit | Changed to `express.json({ limit: "16kb" })` |
| C-5 | No graceful shutdown | Added SIGTERM/SIGINT handlers in `server.ts`, 10s forced exit timeout |
| C-6 | No Prisma connection management | Added explicit `prisma.$connect()` on startup, fail-fast on DB failure |
| C-7 | Shallow health check | Health endpoint now pings DB with `SELECT 1`, returns 503 on failure |
| E-2 | JWT_EXPIRES_IN defaults to 7d | Changed default to `"15m"` — short-lived access tokens |
| E-3 | No NODE_ENV in env validation | Added `NODE_ENV` with enum validation and `"development"` default |
| S-3 | passwordHash not excluded at DB | `findById` now uses `userSafeSelect` — passwordHash never leaves DB for /me |
| — | Multer installed but unused | Removed `multer` + `@types/multer` from dependencies |

### Files Modified

| File | Changes |
|---|---|
| `config/env.ts` | Added `CORS_ORIGIN`, `NODE_ENV`, fixed `JWT_EXPIRES_IN` default |
| `app.ts` | helmet(), JSON limit, dynamic CORS, health check with DB ping |
| `server.ts` | Graceful shutdown, Prisma connect, environment logging |
| `auth.types.ts` | Added `UserSafe` type (User without passwordHash) |
| `auth.repository.ts` | `findById` uses `userSafeSelect`, defense-in-depth |
| `package.json` | Added helmet, removed multer |

---

## Auth Hardening — Stage 2 Audit Response

**Date:** 2026-05-16
**Branch:** `fix/auth-hardening`

### What was fixed

8 findings from Stage 2 auth audit. Cookie security, JWT algorithm, password policy, architecture, token safety.

### Fixes Applied

| ID | Finding | Fix |
|---|---|---|
| AUTH-1 | `clearCookie` missing flags — logout fails in production | Split into `REFRESH_COOKIE_BASE` + `REFRESH_COOKIE_OPTIONS`, clearCookie uses base |
| AUTH-2 | Token rotation not atomic — crash = lockout | Added `rotateRefreshToken` using `$transaction([delete, create])` |
| AUTH-4 | No "logout everywhere" feature | Added `logoutAll` service method + `POST /auth/logout-all` endpoint (authGuard) |
| AUTH-6 | Password max(16) too restrictive, no complexity | Max raised to 72 (bcrypt limit), added lowercase/uppercase/digit/special char regex |
| AUTH-7 | Username allows special chars / unicode | Added `regex(/^[a-zA-Z0-9_]+$/)` — letters, numbers, underscores only |
| AUTH-8 | JWT algorithm not explicitly enforced | Added `algorithm: "HS256"` to sign, `algorithms: ["HS256"]` to verify |
| AUTH-9 | `/me` handler bypasses service layer (DIP violation) | Added `getMe` to `IAuthService`, controller now calls `service.getMe()` |
| AUTH-10 | `deleteRefreshToken` throws on missing token | Changed `.delete()` to `.deleteMany()` — no P2025 on already-deleted tokens |

### New Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/logout-all` | Required | Invalidates all refresh tokens for the user (all devices) |

### Files Modified

| File | Changes |
|---|---|
| `auth.types.ts` | Added `rotateRefreshToken` to `ITokenRepository`, `logoutAll`/`getMe` to `IAuthService` |
| `auth.repository.ts` | `rotateRefreshToken` with `$transaction`, `deleteRefreshToken` uses `deleteMany` |
| `auth.service.ts` | Atomic rotation via `rotateRefreshToken`, `logoutAll`, `getMe` |
| `auth.controller.ts` | Cookie base/options split, `logoutAll` handler, `/me` uses `service.getMe()` |
| `auth.routes.ts` | Added `POST /logout-all` with `authGuard` |
| `auth.validator.ts` | Password max 72, complexity regex, username alphanumeric regex |

---

## Data Integrity — Stage 3 Audit Response

**Date:** 2026-05-17
**Branch:** `fix/data-integrity`

### What was fixed

5 findings from Stage 3 audit. Input validation, response accuracy, query optimization.

### Fixes Applied

| ID | Finding | Fix |
|---|---|---|
| W1 | Route params never validated (`Number("abc")` → NaN) | Created `parseId()` utility — validates positive integer, throws clean 400. Applied to all controllers. |
| W5 | `update()` returns stale `isLiked: false` | Added `userId?` param to `repo.update()` → passes to `buildTweetInclude(userId)` |
| W4 | Ownership check fetches full tweet with all relations | Added `findOwner(id)` → `select: { authorId: true }` to tweet repo |
| W6 | Same pattern in comment ownership checks | Added `findOwner(id)` → `select: { authorId, tweetId }` to comment repo |
| W7 | `create()` passes `authorId` as userId to `buildTweetInclude` | Changed to `buildTweetInclude()` — no userId needed on create |

### New Shared Utility

| File | Purpose |
|---|---|
| `shared/utils/parseId.ts` | Safe param parsing: validates positive integer, rejects NaN/0/floats with 400 |

### Files Modified

| File | Changes |
|---|---|
| `shared/utils/parseId.ts` | **[NEW]** parseId utility |
| `shared/utils/index.ts` | Export parseId |
| `tweet.controller.ts` | All `Number(req.params)` → `parseId()` |
| `comment.controller.ts` | All `Number(req.params)` → `parseId()` |
| `tweet.types.ts` | Added `findOwner`, `userId?` to `update` |
| `tweet.repository.ts` | `findOwner`, `update(userId?)`, `create` intent fix |
| `tweet.service.ts` | Uses `findOwner` for ownership, passes `userId` to update |
| `comment.types.ts` | Added `findOwner` to interface |
| `comment.repository.ts` | `findOwner` implementation |
| `comment.service.ts` | Uses `findOwner` for ownership checks |

---

## Code Quality — DRY, Cleanup & Consistency

**Date:** 2026-05-17
**Branch:** `fix/code-quality`

### What was fixed

5 findings from audit. DRY violations, redundant queries, missing middleware.

### Fixes Applied

| ID | Finding | Fix |
|---|---|---|
| W1 | User profile routes missing `apiLimiter` | Added `apiLimiter` to `userRoutes` mount in `app.ts` |
| W2 | Duplicated `toTweetResponse` in user service | Extracted to `tweet.mapper.ts` — both services import from mapper |
| W3 | Unfollow uses `.delete()` (throws P2025) | Changed to `.deleteMany()` — idempotent, removed try/catch |
| W4 | Follower/following queries fetch both sides | Split includes — each query fetches only its relevant side |
| W5 | `isPrismaError` duplicated in 2 services | Extracted to `shared/utils/prismaError.ts` |

### New Files

| File | Purpose |
|---|---|
| `shared/utils/prismaError.ts` | **[NEW]** Shared Prisma error detection utility |
| `tweets/tweet.mapper.ts` | **[NEW]** Tweet DTO mapper — shared across modules |

### Files Modified

| File | Changes |
|---|---|
| `app.ts` | Added `apiLimiter` to user profile routes |
| `shared/utils/index.ts` | Export `isPrismaError` |
| `tweet.service.ts` | Removed inline `isPrismaError` + `toTweetResponse`, imports from shared |
| `user.service.ts` | Removed duplicate `toTweetResponse`, imports from `tweet.mapper` |
| `follow.repository.ts` | `.delete()` → `.deleteMany()`, split includes |
| `follow.service.ts` | Removed inline `isPrismaError`, removed P2025 try/catch |
| `follow.types.ts` | `FollowWithUser.follower/following` now optional |

### Known Remaining Issue

| ID | Finding | Status |
|---|---|---|
| W6 | User service accesses tweet repository cross-module | ✅ Fixed |

---

## Module Architecture — Import & Export Paths

**Date:** 2026-05-17
**Branch:** `fix/module-architecture`

### What was fixed

4 findings from module architecture audit. Cross-module boundary violations, type export issues, import misdirection.

### Fixes Applied

| # | Finding | Fix |
|---|---|---|
| 1 | `cursorQuerySchema` in tweet validator (cross-module) | Extracted to `shared/validators/cursor.ts` |
| 2 | User service → tweet repository (cross-module) | Added `getByAuthor()` to `ITweetService`, user service delegates through service layer |
| 3 | `shared/types/index.ts` uses value export for interfaces | Changed to `export type` |
| 4 | Module types re-export shared types (import misdirection) | Removed re-exports, consumers import from `shared/types` directly |

### New Files

| File | Purpose |
|---|---|
| `shared/validators/cursor.ts` | **[NEW]** Shared cursor pagination Zod schema |
| `shared/validators/index.ts` | **[NEW]** Validators barrel |

### Files Modified

| File | Changes |
|---|---|
| `tweet.validator.ts` | Removed `cursorQuerySchema` (moved to shared) |
| `tweet.types.ts` | Added `getByAuthor` to `ITweetService`, removed re-exports |
| `tweet.service.ts` | Implemented `getByAuthor`, imports shared types directly |
| `tweet.repository.ts` | Imports `CursorParams` from shared/types |
| `tweet.routes.ts` | Imports `cursorQuerySchema` from shared/validators |
| `user.service.ts` | Replaced `ITweetRepository` with `ITweetService`, removed mapper import |
| `user.types.ts` | Removed re-exports, direct import of `TweetResponse` |
| `user.routes.ts` | Imports `cursorQuerySchema` from shared/validators |
| `follow.routes.ts` | Imports `cursorQuerySchema` from shared/validators |
| `follow.types.ts` | Removed re-exports |
| `follow.service.ts` | Imports shared types directly |
| `comment.types.ts` | Removed `AuthorEmbed` re-export |
| `shared/types/index.ts` | Changed to `export type` |
