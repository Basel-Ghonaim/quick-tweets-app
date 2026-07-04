# quick-tweets

A Twitter/X-style social application, built as a **clean-architecture reference project** where engineering quality is a first-class deliverable. It is a monorepo:

- **Frontend** (repository root) — React 19 + Redux Toolkit + React Router, built with Vite and TypeScript.
- **Backend** (`server/`) — Express 5 + Prisma + PostgreSQL, with JWT authentication.

## Getting started

- **Run it locally** → [`docs/development/setup.md`](docs/development/setup.md)
- **What it does today** → [`docs/project/overview.md`](docs/project/overview.md)

## Documentation

All project documentation lives under [`docs/`](docs/), with one authoritative home per subject. Start at the documentation map:

**→ [`docs/README.md`](docs/README.md)**

The [API contract](docs/api/api-contract.md), the [system overview](docs/architecture/system-overview.md), and the backend/frontend platform documents are all reachable from there. This README is only the repository's front door; it duplicates nothing under `docs/`.
