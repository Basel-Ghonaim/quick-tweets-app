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

### Step 2 — Auth Service

_To be documented when executed._
