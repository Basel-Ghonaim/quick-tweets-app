# Local Setup

> **Status:** Active.
> **Authority:** The authoritative source for **running the project locally** — prerequisites, installation, environment, database, and the run/build scripts. It owns *how to run it*, not *how it works*: the architecture is the [system overview](../architecture/system-overview.md)'s and the frontend/backend documents', and the HTTP surface is the [API contract](../api/api-contract.md)'s.
> **Scope:** Developer environment and scripts for both halves of the monorepo. It documents the current configuration; it does not restate mechanisms owned elsewhere.
> **Version:** 1.0
> **Last Updated:** 2026-07-04
> **Owner:** Basel Ghonaim

## The monorepo

Two applications share one repository:

- **Frontend** — the repository root: React 19 + Redux Toolkit + React Router, built with Vite and TypeScript.
- **Backend** — `server/`: Express 5 + Prisma + PostgreSQL, with its own `package.json` and scripts.

Each half has its own dependencies and is installed and run independently; a few root scripts run both together.

## Prerequisites

- **Node.js 20.19+** (the version the current Vite toolchain requires) and npm.
- **PostgreSQL** — a running instance you can point the backend at.

## Install

Dependencies live in two `package.json` files — install both:

```bash
npm install            # frontend (repository root)
npm install --prefix server   # backend
```

## Configure the backend environment

The backend validates its environment at startup (fail-fast) and refuses to boot if anything required is missing or malformed. Copy the template and fill it in:

```bash
cp server/.env.example server/.env
```

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | Backend HTTP port |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` — gates production behaviors (e.g. the `Secure` cookie flag) |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **yes** | — | Access-token signing secret; **at least 16 characters** |
| `JWT_EXPIRES_IN` | no | `15m` | Access-token lifetime (short-lived by design — see [Backend Security](../backend/security.md)) |
| `CORS_ORIGIN` | no | `http://localhost:5173` | The single allowed frontend origin |

`server/.env` is gitignored — never commit it.

The **frontend** needs no `.env` for local development: it calls `http://localhost:4000/api/v1` by default. To point it elsewhere, set `VITE_API_URL`.

## Set up the database

The backend uses Prisma 7, which reads the database URL from `server/prisma.config.ts` (not from `schema.prisma`) and generates its client into `server/src/generated/prisma/` (under the gitignored `server/src/generated/`). From `server/`:

```bash
npm run db:migrate     # create/apply migrations (prisma migrate dev)
npm run db:generate    # generate the Prisma client
```

`npm run db:studio` opens Prisma Studio to inspect the data.

## Run

From the repository root:

```bash
npm run dev:all        # frontend + backend together
```

Or run each half on its own:

```bash
npm run dev            # frontend only (Vite dev server)
npm run server         # backend only (delegates to server's dev script)
npm run storybook      # the design-system component workshop
```

The backend's own dev server (`npm run dev` inside `server/`) runs under `tsx` in watch mode.

## Build

```bash
npm run build                  # frontend: type-check then Vite production build
npm run build --prefix server  # backend: TypeScript compile to server/dist
```

The backend production entry point is `npm run start --prefix server` (`node dist/server.js`).

---

> This document owns local setup only. What the running system does and how it is built are owned by the [system overview](../architecture/system-overview.md), the [API contract](../api/api-contract.md), and the backend/frontend platform documents — linked here, never duplicated.
