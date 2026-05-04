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

## Phase 3 — Auth Module (Step 3)

_To be documented when executed._
