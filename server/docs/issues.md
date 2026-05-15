# Backend Foundation — Issues

---

## Issue #1: Backend Foundation — Project Structure & Configuration

- **Title:** chore(server): scaffold backend project structure with Express + Prisma + TypeScript
- **Labels:** [backend, setup, infrastructure]
- **Branch:** `chore/backend-foundation`
- **Description:**

Set up the backend skeleton inside the existing monorepo under `/server`.
This includes project structure creation, TypeScript configuration, Express app skeleton,
Prisma schema with User model, environment config, and middleware foundation.

**Acceptance Criteria:**

- [ ] `/server` directory created with modular structure following SOLID principles
- [ ] `package.json` with all required dependencies
- [ ] `tsconfig.json` configured for ES2022 + strict mode
- [ ] Prisma schema with `User` model + PostgreSQL datasource
- [ ] Express app with health check endpoint (`/health`)
- [ ] Global error handler middleware
- [ ] Request logger middleware
- [ ] Type-safe environment config via Zod
- [ ] `.env.example` template for developers
- [ ] Documentation file tracking all setup decisions

**Related:** WorkingPrinciples.md (SOLID, Repository Pattern, Clean Architecture)

---

## Issue #2: Auth Module — Complete Authentication System (Parent)

- **Title:** feat(server): implement auth module — login, register, logout, token refresh
- **Labels:** [backend, auth, feature, epic]
- **Description:**

Build a complete authentication system on the backend and integrate it with the frontend.
This replaces the disabled external API with a fully owned custom backend.

**Steps:**

- [x] **Step 1** — Repository Layer: Prisma Client singleton + `IAuthRepository` / `ITokenRepository` interfaces + Prisma implementation
- [x] **Step 2** — Auth Service: Business logic (bcrypt password hashing, JWT dual tokens, validation rules)
- [x] **Step 3** — API Layer: Routes, controller, Zod validators, authGuard middleware
- [x] **Step 4a** — Cookie Security: Refactor backend to send refresh token via httpOnly cookie instead of JSON body
- [x] **Step 4b** — Frontend Data Model: Update User entity, AuthResponse, DTOs, mappers, store, session
- [ ] **Step 5** — Frontend Integration: Logout API call, token refresh interceptor, Hybrid storage, silent refresh on startup
- [ ] **Step 6** — End-to-end verification: register → login → refresh → logout

**Principles:** SOLID, Repository Pattern, Factory Pattern, Clean Architecture, Error Normalization
**Related:** WorkingPrinciples.md, Issue #1 (foundation)

---

### Sub-Issue #2.1: Repository Layer — Prisma Client + Interfaces + Implementation

- **Title:** feat(server): add auth repository layer (IAuthRepository, ITokenRepository, Prisma implementation)
- **Labels:** [backend, auth, repository]
- **Branch:** `feature/auth-module-step1-repository`
- **Parent:** Issue #2
- **Description:**

Create the data access layer for the auth module following DIP and SRP.
This step provides the foundation that Step 2 (service) will consume through interfaces.

**Files:**

| File | Purpose | Principle |
|---|---|---|
| `shared/database/prisma.ts` | Prisma Client singleton with PG adapter | SRP — one connection pool |
| `modules/auth/auth.types.ts` | `IAuthRepository` + `ITokenRepository` interfaces | DIP — abstractions for service layer |
| `modules/auth/auth.repository.ts` | Prisma implementation of both interfaces | LSP — swappable implementation |

**Acceptance Criteria:**

- [ ] Prisma Client singleton created with `@prisma/adapter-pg`
- [ ] `IAuthRepository` interface: `findByUsername`, `findByEmail`, `findById`, `create`
- [ ] `ITokenRepository` interface: `createRefreshToken`, `findRefreshToken`, `deleteRefreshToken`, `deleteAllUserTokens`
- [ ] Factory functions: `createAuthRepository(db?)`, `createTokenRepository(db?)`
- [ ] Default parameter injection for testability
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #2 (parent), WorkingPrinciples.md (DIP, SRP, ISP, Factory Pattern)

---

### Sub-Issue #2.2: Auth Service — Business Logic (bcrypt, JWT, error handling)

- **Title:** feat(server): add auth service with password hashing, JWT tokens, and error handling
- **Labels:** [backend, auth, service]
- **Branch:** `feature/auth-module-step2-service`
- **Parent:** Issue #2
- **Description:**

Implement the business logic layer for authentication.
This layer consumes `IAuthRepository` and `ITokenRepository` (from Step 1) via dependency injection.
It handles password hashing, JWT generation, token rotation, and throws typed `AppError` instances.

**Files:**

| File | Purpose | Principle |
|---|---|---|
| `shared/utils/jwt.ts` | JWT utility: `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken` | SRP — only token operations |
| `modules/auth/auth.types.ts` [MODIFY] | Add `IAuthService` interface | DIP — controller depends on abstraction |
| `modules/auth/auth.service.ts` | Business logic: register, login, logout, refreshToken | SRP — only auth rules |

**Error Handling in the Service:**

| Scenario | Error Thrown | Status Code |
|---|---|---|
| Username already exists | `AppError.conflict("Username already taken")` | 409 |
| Email already exists | `AppError.conflict("Email already in use")` | 409 |
| Username not found | `AppError.authentication("Invalid credentials")` | 401 |
| Password mismatch | `AppError.authentication("Invalid credentials")` | 401 |
| Refresh token not found | `AppError.authentication("Invalid refresh token")` | 401 |
| Refresh token expired | `AppError.authentication("Refresh token expired")` | 401 |

**Acceptance Criteria:**

- [ ] `generateAccessToken(userId)` — JWT signed with `JWT_SECRET`, expires in `JWT_EXPIRES_IN`
- [ ] `generateRefreshToken()` — crypto random UUID
- [ ] `verifyAccessToken(token)` — returns decoded payload or throws
- [ ] `IAuthService` interface added to `auth.types.ts`
- [ ] `createAuthService(authRepo, tokenRepo)` — factory function
- [ ] `register()` — check uniqueness → hash password → create user → generate tokens
- [ ] `login()` — find user → compare password → generate tokens
- [ ] `logout(refreshToken)` — delete refresh token from DB
- [ ] `refreshToken(token)` — validate → rotate → return new tokens
- [ ] All errors use `AppError` static methods (never raw `throw new Error()`)
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #2 (parent), Sub-Issue #2.1 (repository), WorkingPrinciples.md (SRP, DIP, Factory Pattern, Error Normalization)

---

### Sub-Issue #2.3: API Layer — Routes, Controller, Validators, Middleware

- **Title:** feat(server): add auth API layer — routes, controller, Zod validators, authGuard
- **Labels:** [backend, auth, api]
- **Branch:** `feature/auth-module-step3-api`
- **Parent:** Issue #2
- **Description:**

Build the HTTP layer that exposes the auth service (Step 2) as REST endpoints.
This step connects the client to the business logic via Express routes, Zod validation, and JWT middleware.

**Endpoints:**

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Create new account | No |
| `POST` | `/api/v1/auth/login` | Authenticate user | No |
| `POST` | `/api/v1/auth/logout` | Invalidate refresh token | No (token in body) |
| `POST` | `/api/v1/auth/refresh` | Get new token pair | No (refresh token in body) |
| `GET` | `/api/v1/auth/me` | Get current user profile | Yes (access token) |

**Files:**

| File | Purpose | Principle |
|---|---|---|
| `middleware/validate.ts` | Generic Zod validation middleware | SRP — only validates, reusable across all modules |
| `middleware/authGuard.ts` | JWT verification middleware, attaches `userId` to `req` | SRP — only auth checking |
| `modules/auth/auth.validator.ts` | Zod schemas: `registerSchema`, `loginSchema`, `refreshSchema`, `logoutSchema` | SRP — only schema definitions |
| `modules/auth/auth.controller.ts` | Parse request → call service → format response | SRP — only HTTP concerns |
| `modules/auth/auth.routes.ts` | Express router with endpoint definitions | SRP — only route wiring |
| `app.ts` [MODIFY] | Mount auth routes at `/api/v1/auth` | OCP — extend by adding routes |

**Acceptance Criteria:**

- [ ] Zod schemas validate all auth endpoints with proper constraints
- [ ] `validate()` middleware rejects invalid requests with 400 + field-level errors
- [ ] `authGuard` middleware verifies JWT and attaches `userId` to request
- [ ] Controller calls service and returns proper HTTP status codes (200, 201, 204)
- [ ] Routes wire validators, guards, and controller together
- [ ] Auth routes mounted in `app.ts` at `/api/v1/auth`
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #2 (parent), Sub-Issue #2.2 (service), WorkingPrinciples.md (SRP, OCP, Layered Architecture)

---

### Sub-Issue #2.4a: Cookie Security — httpOnly refresh token (backend refactor)

- **Title:** refactor(server): send refresh token via httpOnly cookie instead of JSON body
- **Labels:** [backend, auth, security]
- **Branch:** `feature/auth-module-step4a-cookie-security`
- **Parent:** Issue #2
- **Description:**

Refactor the backend so the refresh token is never exposed to JavaScript.
Instead of sending it in the response body, the server sets it as an httpOnly cookie.
This eliminates XSS-based token theft — the most critical auth vulnerability.

**Security model (Hybrid):**

| Token | Storage | Why |
|---|---|---|
| Access Token | Frontend memory (Redux) | Short-lived (15min), acceptable XSS risk |
| Refresh Token | httpOnly cookie (server-set) | Long-lived (7 days), JS cannot read it |
| User data | localStorage | Not sensitive, used for UI hydration |

**Files:**

| File | Action | Change |
|---|---|---|
| `app.ts` | MODIFY | Add `cookie-parser` middleware + `credentials: true` in CORS |
| `auth.controller.ts` | MODIFY | `res.cookie()` for refresh token, `req.cookies` to read it |
| `auth.validator.ts` | MODIFY | Remove `refreshSchema` / `logoutSchema` (token from cookie, not body) |
| `auth.routes.ts` | MODIFY | Remove `validate()` middleware from `/refresh` and `/logout` routes |
| `package.json` | MODIFY | Add `cookie-parser` + `@types/cookie-parser` |

**Acceptance Criteria:**

- [ ] `cookie-parser` installed and registered in `app.ts`
- [ ] CORS configured with `credentials: true`
- [ ] Register/login/refresh: refresh token set via `res.cookie()` with `httpOnly`, `secure`, `sameSite`, `path`
- [ ] Logout: `res.clearCookie()` removes the refresh token cookie
- [ ] Refresh/logout: read token from `req.cookies.refreshToken` instead of `req.body`
- [ ] Refresh token is NOT present in any JSON response body
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #2 (parent), Sub-Issue #2.3 (API layer), WorkingPrinciples.md (Security)

---

### Sub-Issue #2.4b: Frontend Data Model — Update types, DTOs, mappers, store, session

- **Title:** feat(frontend): update auth data model for custom backend (cookie-based, new User shape)
- **Labels:** [frontend, auth, refactor]
- **Branch:** `feature/auth-module-step4b-frontend-model`
- **Parent:** Issue #2
- **Depends on:** Sub-Issue #2.4a (cookie security must be merged first)
- **Description:**

Update the frontend data model to match the new backend response format.
The old API returned `{ user, token }` with snake_case.
Our backend returns `{ user, accessToken }` in body + refresh token in httpOnly cookie.

**Key difference from original plan:** The frontend does NOT store or manage the refresh token.
The browser handles it automatically via cookies. This simplifies the frontend significantly.

**Axes of change:**

| Axis | What Changes | Why |
|---|---|---|
| User entity | Add `bio`, `createdAt`, remove `counts`, nullable `profileImage` | New backend shape |
| AuthResponse entity | `token` → `accessToken` only (no refreshToken) | Refresh token is in cookie |
| Response DTO | `UserDto` camelCase, no snake_case fields | Backend uses camelCase |
| Request DTO | `image` → `profileImage` | Backend field name |
| Mapper | Remove snake_case→camelCase transform | Backend already sends camelCase |
| Storage | Remove `REFRESH_TOKEN` key (not needed) | Cookie handles it |
| Session service | Store only `accessToken` + `user` | Refresh token is in cookie |
| Auth state | `token` → `accessToken` only | Refresh token is in cookie |
| API clients | `baseURL` → `localhost:4000/api/v1` | Point to our backend |

**Acceptance Criteria:**

- [ ] `User` entity updated: add `bio`, `createdAt`, make `profileImage` nullable, remove `counts`
- [ ] `AuthResponse` entity: `accessToken` only (no refreshToken)
- [ ] `AuthResponseDto` + `UserDto` match backend JSON shape (camelCase)
- [ ] `RegisterRequestDto.image` → `profileImage`
- [ ] Mapper simplified: no snake_case conversion, single accessToken mapping
- [ ] `authSessionService` stores only `accessToken` + `user`
- [ ] `AuthState` has `accessToken` instead of `token`
- [ ] API clients point to `http://localhost:4000/api/v1`
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #2 (parent), Sub-Issue #2.4a (cookie security), WorkingPrinciples.md (DTO Pattern, Mapper Pattern)

---

### Sub-Issue #2.5: Frontend Integration — Logout, refresh interceptor, Hybrid storage, silent refresh

- **Title:** feat(frontend): complete auth integration — logout API, refresh interceptor, Hybrid token model
- **Labels:** [frontend, auth, integration, security]
- **Branch:** `feature/auth-module-step5-frontend-integration`
- **Parent:** Issue #2
- **Depends on:** Sub-Issue #2.4a (cookie), Sub-Issue #2.4b (frontend model)
- **Description:**

Connect all frontend auth pieces to make login, logout, refresh, and session restoration work end-to-end.

**Hybrid token model:**

| Data | Storage | Why |
|---|---|---|
| Access Token | Redux memory ONLY | Never touches localStorage — safe from XSS |
| Refresh Token | httpOnly cookie (server-set) | JS cannot read it |
| User data | localStorage | Not sensitive — UI hydration hint |

**Tasks:**

| # | Task | What |
|---|---|---|
| 1 | Add `refresh()` to repository | New DTO, interface method, restAuth implementation |
| 2 | Fix logout flow | Call backend API → invalidate cookie → then clear local |
| 3 | Token refresh interceptor | On 401 → call /refresh → retry request (with concurrent queue) |
| 4 | Hybrid storage | Remove accessToken from localStorage, interceptor reads from Redux store |
| 5 | Silent refresh on startup | useInitAuth hook + loading screen in App.tsx |
| 6 | Update consumers + docs | useAuthActions, setup-log.md |

**Acceptance Criteria:**

- [ ] `AuthRepository` has `refresh()` method returning `Promise<string>`
- [ ] `restAuth.refresh()` calls `/auth/refresh` with `authApi` (sends cookie)
- [ ] Logout calls backend API before clearing local session
- [ ] Response interceptor: 401 → refresh → retry (with concurrent request queue)
- [ ] `accessToken` is NEVER stored in localStorage
- [ ] Request interceptor reads token from `store.getState().auth.accessToken`
- [ ] `useInitAuth` hook: checks localStorage user → calls /refresh → loading screen
- [ ] App.tsx shows loading screen during initialization
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #2 (parent), Sub-Issue #2.4b (frontend model), WorkingPrinciples.md (SRP, DIP)

---

## Issue #3: Data Models — Prisma Schema (Tweet, Comment, Like)

- **Title:** schema(server): add Tweet, Comment, Like models with relations and indexes
- **Labels:** [backend, database, schema, infrastructure]
- **Branch:** `feature/data-models-schema`
- **Description:**

Expand the Prisma schema to support the core social features: tweets, comments, and likes.
This is the foundation for the tweets, comments, and users backend modules.

**Models:**

| Model | Purpose | Key Fields |
|---|---|---|
| Tweet | User posts (280 chars max) | body, image?, authorId |
| Comment | Replies to tweets | body, authorId, tweetId |
| Like | User-tweet like (unique pair) | userId, tweetId |

**Relations:**

| Relation | Type | Cascade |
|---|---|---|
| User → Tweet | 1:N | Delete user → delete tweets |
| User → Comment | 1:N | Delete user → delete comments |
| User → Like | 1:N | Delete user → delete likes |
| Tweet → Comment | 1:N | Delete tweet → delete comments |
| Tweet → Like | 1:N | Delete tweet → delete likes |

**Steps:**

- [ ] Add Tweet model to schema
- [ ] Add Comment model to schema
- [ ] Add Like model to schema
- [ ] Update User model with new relations
- [ ] Run migration
- [ ] Documentation in `setup-log.md`

**Acceptance Criteria:**

- [ ] Tweet model: body (varchar 280), image (optional), authorId, timestamps, indexes
- [ ] Comment model: body (varchar 280), authorId, tweetId, timestamps, indexes
- [ ] Like model: userId, tweetId, `@@unique` constraint, timestamps
- [ ] User model: tweets, comments, likes relations added
- [ ] All cascade deletes configured
- [ ] Migration runs successfully
- [ ] Prisma Client generated without errors
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #1 (foundation), Issue #2 (auth — existing User model)

---

## Issue #4: API Contract — Request/Response Shapes for All Endpoints

- **Title:** docs(server): define API contract — request/response shapes for tweets, comments, users
- **Labels:** [backend, documentation, api-design]
- **Branch:** `docs/api-contract`
- **Description:**

Define the complete API contract before writing any implementation code.
This is the agreement between backend and frontend — every endpoint's request body,
query params, response shape, and error cases documented in one place.

**Endpoints:**

| Group | Endpoints | Count |
|---|---|---|
| Tweets | GET /tweets, GET /tweets/:id, POST /tweets, DELETE /tweets/:id, POST /tweets/:id/like | 5 |
| Comments | GET /tweets/:tweetId/comments, POST /tweets/:tweetId/comments, DELETE /comments/:id | 3 |
| Users | GET /users/:username, GET /users/:username/tweets | 2 |

**Steps:**

- [ ] Define shared types (AuthorEmbed, PaginationMeta, ErrorResponse)
- [ ] Define tweets endpoints (5 endpoints)
- [ ] Define comments endpoints (3 endpoints)
- [ ] Define users endpoints (2 endpoints)
- [ ] Documentation in `setup-log.md`

**Acceptance Criteria:**

- [ ] Every endpoint has: method, path, auth requirement, request shape, response shape
- [ ] Error responses defined for each endpoint (400, 401, 403, 404, 422)
- [ ] Pagination shape consistent across all list endpoints
- [ ] AuthorEmbed shape consistent across tweets and comments
- [ ] `isLiked` field documented with optionalAuth requirement
- [ ] Contract file created at `server/docs/api-contract.md`

**Related:** Issue #3 (schema), Issue #1 (foundation — error handler pattern)

---

## Issue #5: Server Foundations Reform (Parent)

- **Title:** fix(server): address infrastructure gaps before building feature modules
- **Labels:** [backend, fix, infrastructure, epic]
- **Description:**

Address foundational gaps identified in the project review (`Gaps-and-shortcomings-map.md`).
These fixes set the patterns that ALL future modules must follow. Building features on top of
inconsistent patterns creates technical debt that compounds with every new module.

**Sub-Issues:**

- [ ] **#5.1** — Response Wrapper: standardize all API responses to `{ success, data, meta? }`
- [ ] **#5.2** — Rate Limiting: protect auth and POST endpoints
- [ ] **#5.3** — optionalAuth Middleware: for isLiked on public endpoints
- [ ] **#5.4** — Follow Model: schema + migration for followers system

**Already solved (no action needed):**
- ~~Cascade Delete~~ → already `onDelete: Cascade` in schema
- ~~Global Error Handler~~ → already exists in `app.ts`
- ~~Database Indexes~~ → already added in schema

**Deferred to feature branches:**
- Comment routing → addressed when building comments module
- Repository duplication → addressed when building users module

**Related:** Gaps-and-shortcomings-map.md, Issues #1-#4

---

### Sub-Issue #5.1: Response Wrapper — Standardize API Responses

- **Title:** fix(server): standardize all API responses with success/data/meta wrapper
- **Labels:** [backend, fix, refactor]
- **Branch:** `fix/response-wrapper`
- **Description:**

Currently, responses have inconsistent shapes (`{ user }`, `{ accessToken }`, `{ type, message }`).
Standardize everything to a predictable format so the frontend always knows what to expect.

**Steps:**

- [ ] Create `sendSuccess()` response helper
- [ ] Create `sendError()` response helper
- [ ] Update `errorHandler` middleware to use `{ success: false, error }` format
- [ ] Refactor auth controller — all responses use `sendSuccess()`
- [ ] Update API contract — add response wrapper section
- [ ] Documentation in `setup-log.md`

**Response format:**

```
Success: { success: true, data: {...}, meta?: {...} }
Error:   { success: false, error: { type, message } }
```

**Acceptance Criteria:**

- [ ] `sendSuccess(res, data, statusCode?, meta?)` utility exists
- [ ] `errorHandler` returns `{ success: false, error: { type, message } }`
- [ ] All auth controller responses use `sendSuccess()`
- [ ] No direct `res.json()` calls remain in auth controller (except cookie/clear)
- [ ] Frontend DTO types updated if needed
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #5 (parent), Gaps-and-shortcomings-map.md (#2)

---
---

## Issue: Tweets Module — Full Backend Implementation

- **Labels:** [backend, feature]
- **Description:**

Complete tweets backend: feed (cursor-paginated), detail, create, edit, delete, and like toggle.
Built on Phase A foundations (sendSuccess, authGuard/optionalAuth, rate limiting).

**Sub-Issues:**

1. Data Layer — types, validator, repository
2. Service — business logic
3. HTTP Layer — controller, routes, app wiring

---

### Sub-Issue: Tweets Data Layer — Types, Validator, Repository

- **Title:** feat(server): add tweet types, validator, and repository
- **Labels:** [backend, feature]
- **Branch:** `feat/tweets-data-layer`
- **Description:**

Define interfaces (ITweetRepository, ITweetService, DTOs), Zod validation schemas,
and Prisma repository with cursor pagination + like queries.

**Steps:**

- [ ] `tweet.types.ts` — interfaces, DTOs, repository/service contracts
- [ ] `tweet.validator.ts` — Zod schemas (create, update, cursor query)
- [ ] `tweet.repository.ts` — CRUD queries with cursor pagination
- [ ] Like queries in repository (findLike, createLike, deleteLike)
- [ ] Documentation in `setup-log.md`

---

### Sub-Issue: Tweets Service — Business Logic

- **Title:** feat(server): add tweet service — business logic layer
- **Labels:** [backend, feature]
- **Branch:** `feat/tweet-service`
- **Description:**

Business logic for tweets: DTO transformation, ownership checks,
cursor pagination slicing (n+1), and like toggle.

**Steps:**

- [ ] `tweet.service.ts` — getFeed, getById, create, update, delete, toggleLike
- [ ] Documentation in `setup-log.md`

---

### Sub-Issue: Tweets HTTP Layer — Controller, Routes, App Wiring

- **Title:** feat(server): add tweet controller, routes, and register in app
- **Labels:** [backend, feature]
- **Branch:** `feat/HTTP-layer`
- **Description:**

Connect tweets module to HTTP: controller handlers with sendSuccess,
route wiring with middleware, and app.ts registration with apiLimiter.
Also hardens toggleLike against race conditions (Prisma P2002/P2025).

**Steps:**

- [ ] Fix toggleLike race condition — catch Prisma P2002/P2025 errors
- [ ] `tweet.controller.ts` — 6 handlers (getFeed, getById, create, update, delete, toggleLike)
- [ ] `tweet.routes.ts` — route wiring with optionalAuth, authGuard, validate
- [ ] Register in `app.ts` with apiLimiter
- [ ] Documentation in `setup-log.md`

---

### Sub-Issue: Comments Data & Service — Types, Validator, Repository, Service

- **Title:** feat(server): add comment types, validator, repository, service
- **Labels:** [backend, feature]
- **Branch:** `feat/comments-data-and-service`
- **Description:**

Data layer + business logic for comments. Offset pagination, double ownership
validation, and shared type extraction (AuthorEmbed → shared/types/).

**Steps:**

- [x] Extract shared types to `shared/types/common.ts`
- [ ] `comment.types.ts` — CommentResponse, OffsetMeta, ICommentRepository, ICommentService
- [ ] `comment.validator.ts` — createCommentSchema, updateCommentSchema, offsetQuerySchema
- [ ] `comment.repository.ts` — CRUD with offset pagination
- [ ] `comment.service.ts` — double ownership checks, pagination math
- [ ] Documentation in `setup-log.md`

---

### Sub-Issue: Comments HTTP Layer — Controller, Routes, App Wiring

- **Title:** feat(server): add comment controller, routes, and register in app
- **Labels:** [backend, feature]
- **Branch:** `feat/comments-http`
- **Description:**

Connect comments module to HTTP. Controller handlers with sendSuccess,
route wiring with mergeParams, and app.ts registration with apiLimiter.

**Steps:**

- [ ] `comment.controller.ts` — 4 handlers (getComments, create, update, delete)
- [ ] `comment.routes.ts` — with mergeParams: true for :tweetId access
- [ ] Register in `app.ts` with apiLimiter under `/api/v1/tweets/:tweetId/comments`
- [ ] Documentation in `setup-log.md`

---

### Sub-Issue: Users Module — Profile + User Tweets

- **Title:** feat(server): add users module — profile and user tweets endpoints
- **Labels:** [backend, feature]
- **Branch:** `feat/users-module`
- **Description:**

Two read-only endpoints: user profile with aggregated counts (tweets, likes,
followers, following, isFollowing) and user's tweets with cursor pagination.
Also extends tweet repository with findByAuthor.

**Steps:**

- [ ] `user.types.ts` — UserProfileResponse, IUserRepository, IUserService
- [ ] `user.repository.ts` — profile query with _count, findByUsername
- [ ] Extend `tweet.repository.ts` — add findByAuthor(authorId, params, userId?)
- [ ] `user.service.ts` — profile DTO, user tweets orchestration, likesCount two-step
- [ ] `user.controller.ts` + `user.routes.ts` — 2 handlers, route wiring
- [ ] Register in `app.ts` with apiLimiter
- [ ] Documentation in `setup-log.md`

---

### Sub-Issue: Follow Module — Follow/Unfollow + Follower/Following Lists

- **Title:** feat(server): add follow module — follow, unfollow, follower/following lists
- **Labels:** [backend, feature]
- **Branch:** `feat/follow-module`
- **Description:**

Four endpoints: separate follow/unfollow mutations (not toggle), offset-paginated
follower/following lists, self-follow prevention, idempotent operations.

**Steps:**

- [ ] `follow.types.ts` — FollowUserResponse, IFollowRepository, IFollowService
- [ ] `follow.validator.ts` — offsetQuerySchema (reuse from comments)
- [ ] `follow.repository.ts` — follow/unfollow, list followers/following with offset
- [ ] `follow.service.ts` — self-follow prevention, user existence, idempotent ops
- [ ] `follow.controller.ts` + `follow.routes.ts` — 4 handlers, mergeParams
- [ ] Register in `app.ts` + documentation in `setup-log.md`

---

### Sub-Issue: Security Hardening — Audit Response

- **Title:** fix(server): security hardening — helmet, env config, graceful shutdown, passwordHash omit
- **Labels:** [backend, security, fix]
- **Branch:** `fix/security-hardening`
- **Description:**

Apply 10 fixes from Stage 1 security audit. Infrastructure-level hardening —
no new features, no schema changes.

**Steps:**

- [ ] Add `CORS_ORIGIN`, `NODE_ENV` to env config, fix `JWT_EXPIRES_IN` default to `15m`
- [ ] Install helmet, add to app.ts, JSON body limit, dynamic CORS, health check depth
- [ ] Graceful shutdown (SIGTERM/SIGINT) + Prisma explicit connect in server.ts
- [ ] passwordHash defense-in-depth — safe select constant in auth repo
- [ ] Remove unused multer dependency + documentation

---

### Sub-Issue #5.4: Follow Model + API Contract Final Update

- **Title:** fix(server): add Follow model to schema + finalize API contract
- **Labels:** [backend, fix, schema, docs]
- **Branch:** `fix/follow-model-and-api-contract`
- **Description:**

Two objectives in one branch:

**Part A — Follow Model (Schema):**
Add `Follow` model to Prisma schema. This is the foundation for the social graph
(feed query, follower/following counts, profile `isFollowing` flag).

**Part B — API Contract Final Update:**
Reflect all architectural decisions from Phase A into the contract:
- Cursor pagination (replace offset for feed/user tweets)
- Nested comment routing (`/tweets/:tweetId/comments/:commentId`)
- Follow endpoints (4 new)
- User profile updates (followersCount, followingCount, isFollowing)

**Schema design:**
- `@@unique([followerId, followingId])` — can't follow someone twice
- `@@index([followerId])` — fast feed query ("who am I following?")
- `@@index([followingId])` — fast follower count
- `onDelete: Cascade` — user deletion cleans up follow relationships

**Note for Phase E (follow service):**
Self-follow prevention must be enforced in the Service Layer:
`if (followerId === followingId) throw AppError.validation("Cannot follow yourself")`

**Steps:**

- [ ] Add Follow model + User relations to `schema.prisma`
- [ ] Run Prisma migration
- [ ] Update API contract — cursor pagination
- [ ] Update API contract — nested comment routing
- [ ] Update API contract — follow endpoints + user profile
- [ ] Documentation in `setup-log.md`

**Acceptance Criteria:**

- [ ] Follow model exists with unique constraint + indexes
- [ ] Migration runs successfully
- [ ] API contract reflects cursor pagination for feed/user tweets
- [ ] API contract reflects nested comment routing
- [ ] API contract includes follow endpoints (POST/DELETE/GET)
- [ ] User profile shape includes followersCount, followingCount, isFollowing
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #5 (parent), Gaps-and-shortcomings-map.md (#1, #3, #6, #7)

---

### Sub-Issue #5.3: optionalAuth Middleware — Soft Auth for Public Endpoints

- **Title:** fix(server): add optionalAuth middleware with global userId type and fast JWT check
- **Labels:** [backend, fix, middleware]
- **Branch:** `fix/optional-auth`
- **Description:**

Public endpoints (feed, tweet detail) need to work for both guests and logged-in users.
`optionalAuth` attaches `userId` if a valid token is present, otherwise continues as guest.
Unlike `authGuard`, it never rejects — it only enriches the request.

**Includes two improvements from review:**
1. Global `userId?: number` on Express Request (prevents lint errors, eliminates casts)
2. Fast JWT format check (skip `jwt.verify()` for obviously invalid tokens — saves CPU)

**Steps:**

- [ ] Extend Express Request type globally (`userId?: number`)
- [ ] Create `optionalAuth.ts` with fast format check + silent token verification
- [ ] Refactor `authGuard.ts` to use global type instead of custom interface
- [ ] Documentation in `setup-log.md`

**Acceptance Criteria:**

- [ ] `req.userId` accessible on ALL routes without type casting
- [ ] `optionalAuth` never returns 401 — always calls `next()`
- [ ] Malformed tokens (not 3-part JWT) skipped before `jwt.verify()`
- [ ] `authGuard` still works as before (401 on missing/invalid token)
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #5 (parent), Gaps-and-shortcomings-map.md (#9)

---

### Sub-Issue #5.2: Rate Limiting — Protect Endpoints from Abuse

- **Title:** fix(server): add rate limiting to auth, refresh, and general API routes
- **Labels:** [backend, fix, security]
- **Branch:** `fix/rate-limiting`
- **Description:**

No rate limiting exists. Anyone can brute-force login, spam tweets, or overload the server.
Three rate limiters with different thresholds protect different endpoint groups.

**Rate Limiters:**

| Limiter | Endpoints | Limit | Purpose |
|---|---|---|---|
| authLimiter | `/login`, `/register` | 10 / 15 min | Brute force protection (passwords) |
| refreshLimiter | `/refresh` | 30 / 15 min | Generous — silent refresh is automated |
| apiLimiter | All other routes | 100 / 15 min | General protection |

**Steps:**

- [ ] Install `express-rate-limit`
- [ ] Create `middleware/rateLimiter.ts` (3 limiters with clear error messages)
- [ ] Apply limiters in `app.ts` + `trust proxy` for production
- [ ] Update API contract (429 status)
- [ ] Documentation in `setup-log.md`

**Acceptance Criteria:**

- [ ] Auth routes (login/register) limited to 10 req / 15 min per IP
- [ ] Refresh route limited to 30 req / 15 min per IP
- [ ] General API routes limited to 100 req / 15 min per IP
- [ ] 429 response uses standardized `{ success: false, error }` format
- [ ] `trust proxy` enabled for correct IP detection behind reverse proxies
- [ ] Documentation updated in `setup-log.md`

**Related:** Issue #5 (parent), Gaps-and-shortcomings-map.md (#2)
