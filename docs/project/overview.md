# Project Overview

> **Status:** Active.
> **Authority:** The authoritative source for the **product's scope and current implementation status**. It does not describe *how* the system is built (see the architecture and platform documents) or the API surface (see the [API contract](../api/api-contract.md)).
> **Scope:** What quick-tweets is, and which capabilities exist today. Mechanisms, endpoints, and per-feature internals live in their owning documents and are linked, never restated.
> **Version:** 1.0
> **Last Updated:** 2026-08-14
> **Owner:** Basel Ghonaim

## What quick-tweets is

quick-tweets is a Twitter/X-style social application, built as a clean-architecture reference project where engineering quality is a first-class deliverable alongside product functionality. It is a monorepo of two applications:

- a **React 19 + Redux Toolkit** frontend (`apps/web/`);
- an **Express 5 + Prisma + PostgreSQL** backend (`apps/api/`).

The product centres on short posts — "tweets" of at most 280 characters — and the social interactions around them: replies, likes, public user profiles, and a follow graph.

## Current implementation status

The **backend exposes the full product surface; the frontend currently implements authentication only.** The complete request/response contract is owned by the [API contract](../api/api-contract.md); this table states *what exists today*, not how it behaves.

| Capability | Backend | Frontend |
|---|---|---|
| [**Authentication**](../features/authentication.md) — register, login, logout, logout-all, token refresh, current user (JWT access token + HttpOnly refresh cookie; auth rate limiting) | Implemented | Implemented (sign-in / sign-up) |
| **Tweets** — global feed and author timelines (cursor-paginated), single tweet, create, edit own, delete own | Implemented | Not yet |
| **Likes** — toggle a like on a tweet | Implemented | Not yet |
| **Comments** — list per tweet (offset-paginated), create, edit own, delete own | Implemented | Not yet |
| **User profiles** — public profile with tweet / like / follower / following counts | Implemented (read-only) | Not yet |
| **Follows** — follow and unfollow, follower and following lists | Implemented | Not yet |

The data model behind these capabilities — `User`, `RefreshToken`, `Tweet`, `Comment`, `Like`, `Follow` — is owned by the Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma).

**Scope boundaries in the current version:** tweet images and file uploads are not implemented (the `image` field exists but is always `null`), and profiles are read-only (there is no profile-edit endpoint).

## Where to go next

- **The HTTP surface** — endpoints, payloads, errors, pagination: the [API contract](../api/api-contract.md).
- **How work is executed**, and how documentation is governed: the [Engineering Execution Standard](../development/engineering-execution-standard.md) and the [Documentation Strategy](../architecture/documentation-strategy.md).
- **Per-capability behaviour** lives in feature documents under `docs/features/` — currently [authentication](../features/authentication.md); the remaining capabilities gain theirs as each is authored.

---

> This overview states scope and status only. Endpoints, mechanisms, and per-feature behaviour are owned by their respective documents and linked from here — never duplicated. Planned work lives in the issue tracker, not in this document.
