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

- [ ] **Step 1** — Repository Layer: Prisma Client singleton + `IAuthRepository` / `ITokenRepository` interfaces + Prisma implementation
- [ ] **Step 2** — Auth Service: Business logic (bcrypt password hashing, JWT dual tokens, validation rules)
- [ ] **Step 3** — API Layer: Routes, controller, Zod validators, Multer upload, authGuard middleware
- [ ] **Step 4** — Frontend Data Model: Update User entity, AuthResponse, DTOs, mappers, store, session
- [ ] **Step 5** — Frontend Integration: baseURL change, token refresh interceptor, storage keys
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
