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
