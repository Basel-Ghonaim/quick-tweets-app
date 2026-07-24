# Local Setup

> **Status:** Active.
> **Authority:** The authoritative source for **running the project locally** — prerequisites, installation, environment, database, and the run/build scripts. It owns *how to run it*, not *how it works*: the architecture is the [system overview](../architecture/system-overview.md)'s and the frontend/backend documents', and the HTTP surface is the [API contract](../api/api-contract.md)'s.
> **Scope:** Developer environment and scripts for both halves of the monorepo. It documents the current configuration; it does not restate mechanisms owned elsewhere.
> **Version:** 1.1
> **Last Updated:** 2026-07-23
> **Owner:** Basel Ghonaim

## The monorepo

Two applications share one repository:

- **Frontend** — the repository root: React 19 + Redux Toolkit + React Router, built with Vite and TypeScript.
- **Backend** — `server/`: Express 5 + Prisma + PostgreSQL, with its own `package.json` and scripts.

Each half has its own dependencies and is installed and run independently; a few root scripts run both together.

## Prerequisites

- **Node.js 20.19+** (the version the current Vite toolchain requires) and npm.
- **PostgreSQL** — a running instance you can point the backend at (the service a standard installer sets up is fine).

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

> [**Outdated** — the in-flight Media work (M4 onward, continuing through M11) introduced backend environment requirements not fully reflected in this table. The authoritative list is the env schema at `server/src/config/env.ts`; the server fails fast at startup and names anything missing. To be reconciled at M12.]

`server/.env` is gitignored — never commit it.

The **frontend** needs no `.env` for local development: it calls `http://localhost:4000/api/v1` by default. To point it elsewhere, set `VITE_API_URL`.

## Set up the database

First create the database your `DATABASE_URL` names (the `.env.example` template uses `quick_tweets`) — in pgAdmin, or from a terminal:

```bash
createdb quick_tweets
```

The backend uses Prisma 7, which reads the database URL from `server/prisma.config.ts` (not from `schema.prisma`) and generates its client into `server/src/generated/prisma/` (under the gitignored `server/src/generated/`). From `server/`:

```bash
npx prisma generate        # generate the Prisma client
npx prisma migrate deploy  # apply the committed migrations
```

`migrate deploy` only **applies** what is committed — the right command for getting a clone running (no shadow database, no prompts). `npm run db:migrate` (`prisma migrate dev`) is the **authoring** command — it creates *new* migrations and belongs to schema-change work, not setup.

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

## Verify

With the backend up, confirm it is healthy and can reach the database:

```
GET http://localhost:4000/health  →  { "status": "ok", "db": "connected", "timestamp": "…" }
```

A `503` with `"db": "disconnected"` means the server is running but `DATABASE_URL` does not reach a live PostgreSQL.

## Inspect

- **The database** — pgAdmin, or `npm run db:studio` (Prisma Studio, above).
- **The API** — the manual verification harness (a Postman collection driving `http://localhost:4000/api/v1`) lives under [`verification/`](verification/README.md).

## Build

```bash
npm run build                  # frontend: type-check then Vite production build
npm run build --prefix server  # backend: TypeScript compile to server/dist
```

The backend production entry point is `npm run start --prefix server` (`node dist/server.js`).

---

> This document owns local setup only. What the running system does and how it is built are owned by the [system overview](../architecture/system-overview.md), the [API contract](../api/api-contract.md), and the backend/frontend platform documents — linked here, never duplicated.
