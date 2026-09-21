# Project Overview

> **Status:** Active.
> **Class:** **Description** for current implementation status; **Commitment** for committed product scope ([Documentation Strategy §3](../architecture/documentation-strategy.md)). Each section says which it is.
> **Authority:** The authoritative source for the **product's scope** — both what exists today and what the product is committed to. It does not describe *how* the system is built (see the architecture and platform documents) or the API surface (see the [API contract](../api/api-contract.md)).
> **Scope:** What quick-tweets is, which capabilities exist today, and which the product is committed to. Mechanisms, endpoints, and per-feature internals live in their owning documents and are linked, never restated.
> **Version:** 1.9
> **Last Updated:** 2026-09-21
> **Owner:** Basel Ghonaim

## What quick-tweets is

quick-tweets is a Twitter/X-style social application, built as a clean-architecture reference project where engineering quality is a first-class deliverable alongside product functionality. It is a monorepo of two applications:

- a **React 19 + Redux Toolkit** frontend (`apps/web/`);
- an **Express 5 + Prisma + PostgreSQL** backend (`apps/api/`).

The product centres on short posts — "tweets" of at most 280 characters — and the social interactions around them: replies, likes, public user profiles, and a follow graph.

## Current implementation status

> **Class: Description.** Everything in this section exists in the code today. What the product is committed to — built or not — is the separate section below.

The **backend exposes the full product surface; the frontend currently implements authentication only.** The complete request/response contract is owned by the [API contract](../api/api-contract.md); this table states *what exists today*, not how it behaves.

| Capability | Backend | Frontend |
|---|---|---|
| [**Authentication**](../features/authentication.md) — register, login, logout, logout-all, token refresh, current user (JWT access token + HttpOnly refresh cookie; auth rate limiting) | Implemented | Implemented (sign-in · sign-up · the post-registration journey: profile completion and email verification · account recovery) |
| **Tweets** — global feed and author timelines (cursor-paginated), single tweet, create, edit own, delete own | Implemented | Not yet |
| **Likes** — toggle a like on a tweet | Implemented | Not yet |
| **Comments** — list per tweet (offset-paginated), create, edit own, delete own | Implemented | Not yet |
| **User profiles** — public profile with tweet / like / follower / following counts | Implemented (read-only) | Not yet |
| **Follows** — follow and unfollow, follower and following lists | Implemented | Not yet |

The data model behind these capabilities — `User`, `RefreshToken`, `Tweet`, `Comment`, `Like`, `Follow` — is owned by the Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma).

**The web interface reads in English and in Arabic,** right to left in Arabic. The language follows the reader's browser until they choose one, and how it is resolved and chosen is [localisation](../frontend/localisation.md)'s. Text the server writes, including its mail, is English.

**Scope boundaries in the current version:** tweet images and file uploads are not implemented (the `image` field exists but is always `null`), and profiles are read-only (there is no profile-edit endpoint).

## Committed product scope

> **Class: Commitment** ([Documentation Strategy §3](../architecture/documentation-strategy.md), which owns what a Commitment may and may not say). This section states **what the product is committed to** and why. It makes **no claim about what is built** — the status table above is the only thing that says that, and an item here may be already built, partly built, or not started.

A committed item is one the product's shape requires, settled by a decision rather than assumed by whoever wrote it down. Recording it here **reports** that decision and does not make it: an entry becomes canonical only on the human-authorized merge that introduces it, which is the record of the ratification. An agent may propose an entry and may never approve its own.

Its use is to answer *"is this part of the product?"* — **one** of the three independent ways a need is grounded ([ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2; the others are a platform basis and completing a set already opened). It answers nothing about **how** any of it works, and it never decides which layer owns a thing.

**These lists are not closed, and absence from them is not refusal.** Something with a platform basis, or completing a set the language has already opened, is grounded whether or not it is named here. Only the *not committed* section below states refusals, and it says so explicitly.

Where the [glossary](glossary.md) defines a term, this section uses it. Some committed names have no glossary entry yet — *repost* most consequentially, a word this domain uses for two different things — and for those the name records the commitment while the definition waits on the product decision that settles it.

### Surfaces

| Surface | Why the product has it |
|---|---|
| **Auth** | account creation and sign-in; the entry to every authenticated surface |
| **Feed** | the product's centre — the reverse-chronological stream of tweets |
| **Tweet details** | one tweet with its comment thread; the target of every permalink |
| **Profile** | a user's public identity, their author timeline, and their follow relationships |
| **Settings** | the authenticated user's control over their own account and profile |

### Capabilities

Composing, editing and deleting one's own tweets · commenting · liking · reposting · sharing a tweet · following and unfollowing · viewing a profile's tweets, likes, followers and following · editing one's own profile · recovering access to one's own account · attaching media to a tweet.

### Interface vocabulary

**Components and surfaces the product is committed to.** Each entry **reports** a decision already taken; it does not create one. A genuine commitment **is grounding on its own** — [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2 admits a need on **any one** of its three conditions, and a named commitment is one of them. That is precisely why an entry must record a decision rather than an intention, and why an author may not approve their own.

Naming something here does not design it, and does not decide which layer owns it.

**Whether a named element belongs to the Design System or to a feature is decided by the [component-admission test](../frontend/design-system/components.md), never by appearing on this list.**

Alert · Avatar · Badge · Brand mark · Button · Checkbox · Comment · Dialog · FileInput · Header · Icon · IconButton · Input · Link · Menu · Navigation · One-time-code input · Radio · Select · Skeleton · Spinner · Stepper · Switch · Tabs · Textarea · Toast · Toggle button · Tooltip · Tweet action row · Tweet card · Typography

### Language and direction

The product is committed to **English and Arabic**, and to **right-to-left as a first-class direction** rather than an adaptation applied to a left-to-right interface. Both were settled at the outset, and neither is contingent on the other shipping first.

This states what the product is committed to and nothing more. How an interface adapts to direction and script is the [Design System](../frontend/design-system/README.md)'s, and translated content belongs to the layer that owns it; neither is decided here.

### What is not committed

Direct messaging, notifications, search, bookmarks, lists, and any form of moderation or administration. Their absence is the answer to whether they are part of the product: they are not, and building for them would be ungrounded.

## Where to go next

- **The HTTP surface** — endpoints, payloads, errors, pagination: the [API contract](../api/api-contract.md).
- **How work is executed**, and how documentation is governed: the [Engineering Execution Standard](../development/engineering-execution-standard.md) and the [Documentation Strategy](../architecture/documentation-strategy.md).
- **Per-capability behaviour** lives in feature documents under `docs/features/` — currently [authentication](../features/authentication.md); the remaining capabilities gain theirs as each is authored.

---

> This overview states scope and status only. Endpoints, mechanisms, and per-feature behaviour are owned by their respective documents and linked from here — never duplicated. **Live status — what is in progress, done, blocked or scheduled — lives in the issue tracker**, and sequencing in an execution plan.
