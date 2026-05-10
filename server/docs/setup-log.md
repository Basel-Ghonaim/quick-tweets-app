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
