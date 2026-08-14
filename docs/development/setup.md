# Local Setup

> **Status:** Active.
> **Authority:** The authoritative source for **running the project locally** — prerequisites, installation, environment, database, and the run/build scripts. It owns *how to run it*, not *how it works*: the architecture is the [system overview](../architecture/system-overview.md)'s and the frontend/backend documents', and the HTTP surface is the [API contract](../api/api-contract.md)'s.
> **Scope:** Developer environment and scripts for both halves of the monorepo. It documents the current configuration; it does not restate mechanisms owned elsewhere.
> **Version:** 1.2
> **Last Updated:** 2026-08-14
> **Owner:** Basel Ghonaim

## The monorepo

Two applications share one repository:

- **Frontend** — `apps/web/`: React 19 + Redux Toolkit + React Router, built with Vite and TypeScript.
- **Backend** — `apps/api/`: Express 5 + Prisma + PostgreSQL, with its own `package.json` and scripts.

Each half has its own dependencies and is installed and run independently; a few root scripts run both together.

## Prerequisites

- **Node.js 20.19+** (the version the current Vite toolchain requires) and npm.
- **PostgreSQL** — a running instance you can point the backend at (the service a standard installer sets up is fine).

## Install

The repository is one npm workspace; a single install at the root covers both applications:

```bash
npm install            # one workspace install covers both applications
```

## Configure the backend environment

The backend validates its environment at startup (fail-fast) and refuses to boot if anything required is missing or malformed. Copy the template and fill it in:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | Backend HTTP port |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` — gates production behaviors (e.g. the `Secure` cookie flag) |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **yes** | — | Access-token signing secret; **at least 16 characters** |
| `JWT_EXPIRES_IN` | no | `15m` | Access-token lifetime (short-lived by design — see [Backend Security](../backend/security.md)) |
| `CORS_ORIGIN` | no | `http://localhost:5173` | The single allowed frontend origin |

> [**Outdated** — the in-flight Media work (M4 onward, continuing through M11) introduced backend environment requirements not fully reflected in this table. The authoritative list is the env schema at `apps/api/src/config/env.ts`; the server fails fast at startup and names anything missing. To be reconciled at M12.]

`apps/api/.env` is gitignored — never commit it.

The **frontend** needs no `.env` in a single working tree: it calls `http://localhost:4000/api/v1` by default. To point it elsewhere, set `VITE_API_URL`. **A linked worktree does need one** — without it the frontend drives the other tree's backend and database; see [Working in a linked worktree](#working-in-a-linked-worktree).

## Set up the database

First create the database your `DATABASE_URL` names (the `.env.example` template uses `quick_tweets`) — in pgAdmin, or from a terminal:

```bash
createdb quick_tweets
```

The backend uses Prisma 7, which reads the database URL from `apps/api/prisma.config.ts` (not from `schema.prisma`) and generates its client into `apps/api/src/generated/prisma/` (under the gitignored `apps/api/src/generated/`). From `apps/api/`:

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
npm run dev:api        # backend only
npm run storybook --workspace @quick-tweets/web   # the design-system component workshop
```

The backend's own dev server (`npm run dev` inside `apps/api/`) runs under `tsx` in watch mode. Root scripts delegate to a workspace; anything not wrapped at the root is reachable with `--workspace @quick-tweets/web` or `--workspace @quick-tweets/api`.

## Working in a linked worktree

A second working tree created with `git worktree add` shares this repository's history and its `.git` directory, but **nothing else**: it has its own `node_modules`, its own `apps/api/.env`, and its own `apps/api/uploads/`. Two trees can run at once — provided each owns a distinct backend port, database, and frontend origin, because none of those is namespaced by the checkout.

| | Main tree — `D:\quick-tweets-app` | Linked tree — `D:\quick-tweet-worker-2` |
|---|---|---|
| Backend `PORT` | `4000` | `4001` |
| `DATABASE_URL` database | `quick_tweets` | `quicktweets_w2` |
| `CORS_ORIGIN` | `http://localhost:5173` | `http://localhost:5174` |
| Vite dev server | `5173` | `5174` |
| `VITE_API_URL` | unset — defaults to `:4000` | `http://localhost:4001/api/v1` |
| Storybook | `6006` | `6007` |

The backend half is configured by each tree's own `apps/api/.env`. **The frontend half is not.** `VITE_API_URL` falls back to a hardcoded `http://localhost:4000/api/v1`, so a linked tree that does not set it silently drives the *main* tree's backend and writes into the *main* tree's database, with nothing failing. Set it in `apps/web/.env.local` — Vite reads env files from the directory holding its config, not from the repository root — which `*.local` already ignores:

```
VITE_API_URL=http://localhost:4001/api/v1
```

Vite does not pin its port and falls back to the next free one, so the port a tree gets depends on start order rather than configuration — while `CORS_ORIGIN` is matched exactly. Pass the port, and make it fail loudly if taken:

```bash
npm run dev -- --port 5174 --strictPort
cd apps/web && npx storybook dev -p 6007
```

### A temporary safeguard: no `git stash` while more than one worktree exists

Check with `git worktree list`. `refs/stash` is a **single stack shared by every worktree**, while the index and `HEAD` are per-tree — so a `git stash` in one tree and a `git stash pop` in another applies the wrong changes into the wrong working tree, silently and with no error. Use a scratch commit instead. It binds the main tree as much as a linked one.

**This is a temporary safeguard, not a rule about `git stash`.** It exists only because the project is currently worked by parallel Workers across multiple worktrees, and it is scoped to that arrangement: it is not a general Git convention, not an engineering standard, and nothing is wrong with `git stash` in a single-tree checkout. **It is removed or narrowed as soon as the parallel-worktree workflow ends or the shared-stash hazard no longer applies** — the condition is stated here precisely so its expiry is checkable rather than forgotten. It lives in this document, and deliberately not in the [Engineering Execution Standard](engineering-execution-standard.md), because it constrains an *environment*, not the way work is executed.

### Branching from `main` inside a linked worktree

Git refuses to check out a branch another worktree already holds, and the main tree normally holds `main` — so the Standard's *"update `main`, then branch"* ([EES §5](engineering-execution-standard.md)) cannot be followed literally here. Cut the branch from the remote ref:

```bash
git fetch origin
git switch -c <type>/<short-kebab-description> origin/main
```

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
npm run build                  # both applications
npm run build --workspace @quick-tweets/web  # frontend: type-check then Vite production build
npm run build --workspace @quick-tweets/api  # backend: TypeScript compile to apps/api/dist
```

The backend production entry point is `npm run start --workspace @quick-tweets/api` (`node dist/server.js`).

---

> This document owns local setup only. What the running system does and how it is built are owned by the [system overview](../architecture/system-overview.md), the [API contract](../api/api-contract.md), and the backend/frontend platform documents — linked here, never duplicated.
