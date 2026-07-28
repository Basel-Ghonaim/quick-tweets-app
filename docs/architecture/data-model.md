# Data Model

> **Status:** Active.
> **Authority:** The authoritative source for the data model's **relationship, cascade, and indexing rationale** — the *why* behind the schema. The field-level truth (types, defaults, column maps) is owned by [`schema.prisma`](../../server/prisma/schema.prisma) and referenced here, never restated.
> **Scope:** Why the entities relate as they do, how deletes propagate, and which indexes exist and what they serve. It is not a field listing.
> **Version:** 1.0
> **Last Updated:** 2026-06-28
> **Owner:** Basel Ghonaim

## Overview

The domain is a small social graph: users author tweets, tweets gather comments and likes, and users follow one another. Every record ultimately descends from a user. The field-level schema is owned by [`schema.prisma`](../../server/prisma/schema.prisma); this document explains the reasoning behind the relationships, the delete behaviour, and the indexes.

## Entities and relationships

- **User** is the root aggregate — the owner of all content and relationships. Authentication state and every piece of content hang off it.
- A **tweet** belongs to one author (a user) and aggregates its comments and likes.
- A **comment** belongs to both a tweet and its author — a reply within a tweet's thread.
- A **like** is the join between a user and a tweet, modelling approval.
- A **follow** is a *self-referential* join on users — a directed edge from a follower to a followed user; together, follows form the social graph.
- A **refresh token** belongs to a user — server-side session state for authentication.
- The **Media** entities are a platform subsystem, not domain content: a **`MediaObject`** is the registry record for one stored file (identity, storage detail, status, and its **uploader** — an owning `User`, `NOT NULL`); a **`MediaReference`** is Media's own record that *something* references an object; **`TweetMedia`** is the tweets-domain **ordered** association to media; and **`MediaReclamationAudit`** / **`MediaQuarantine`** are the reclamation collector's append-only trail and its divergence-review queue. Feature tables hold only a **bare numeric reference** to a `MediaObject` (`User.avatar_media_id`, `Comment.media_id`, `TweetMedia.media_id`), never storage detail; the subsystem's mechanisms are owned by [`backend/media.md`](../backend/media.md).

## Cascade behaviour

Every relationship deletes with its parent (`onDelete: Cascade`):

- deleting a **user** removes their tweets, comments, likes, follows (in both directions), and refresh tokens — a user's entire footprint leaves with them (with **one exception**: a user that *owns media objects* is blocked from deletion by the uploader `Restrict` foreign key — see the media note below);
- deleting a **tweet** removes its comments and likes.

The rationale: the model has no meaningful orphan — a comment without its tweet, or a like without its user, is noise. Cascade enforces referential integrity in the database rather than in application code, so a missed cleanup path cannot leave dangling rows (defense in depth).

**Media relationships are the deliberate exception.** A feature's link to a `MediaObject` is a *reference to an object another module owns*, not owned data, so those foreign keys use **`onDelete: Restrict`**, not Cascade: `tweet_media`, and a media-carrying `comment`, refuse to vanish silently, and Media's own `media_references` / `media_quarantine` refuse to drop an object that is still referenced or under review. **Media's own `MediaObject.uploader` foreign key (`uploader_id`, `NOT NULL`) is likewise `onDelete: Restrict`:** a user cannot be deleted while they own media objects. The account-deletion path is currently **dormant** (no route); whenever it is implemented it must explicitly reconcile a user's owned media — reassign or reclaim — before removing the user, since the database refuses a silent cascade. This records the current constraint only and implies no new deletion semantics. Deleting a **tweet** instead **ends** its media references (through the coordinated application use-case that removes the comments first), and **Media reclaims** any now-unreferenced object from its own registry state — an object is never deleted by a database cascade. The reclamation lifecycle (tombstone retention, quarantine-on-divergence, report-vs-destructive) is owned by [`backend/media.md`](../backend/media.md); field-level truth by [`schema.prisma`](../../server/prisma/schema.prisma).

## Indexing

Indexes exist to serve the product's hot read paths; each maps to a query the application actually runs:

- **Tweets** carry an **author** index (serving **author timelines**). Both the global feed and author timelines order and cursor on the primary key **`id`**: an `autoincrement()` `id` is monotonic with insertion, so `id DESC` is already reverse-chronological *and* a unique, stable cursor (no `createdAt` ties to break). No creation-time index is needed — the former `createdAt` index had no reader and was removed ([Finding 0003](findings/0003-feed-index-vs-id-ordering.md)).
- **Comments** are indexed by tweet (the "comments on this tweet" query) and by author.
- **Likes** are indexed by tweet (per-tweet like counts) and carry a **unique (user, tweet)** constraint — a user can like a tweet at most once, which makes liking idempotent.
- **Follows** carry a **unique (follower, followed)** constraint — you cannot follow someone twice — and are indexed in **both directions**: by follower ("who do I follow", which drives the feed) and by followed ("who follows me", which drives follower counts).
- **Media** carries the constraints attach and reclamation rely on: `media_objects` is uniquely keyed by `token` and by `storage_key` (the public handle and the storage-key↔object mapping); `media_references` is **unique `(media_id, referrer)`** so a repeated begin-signal is idempotent and an end is exact; `tweet_media` is unique on `(tweet_id, position)` and `(tweet_id, media_id)` (no two objects share a slot, none is attached twice); and the reclamation tables index `media_reclamation_audit(run_at)` and `media_quarantine(resolved_at)` — the soak's time-ordered trail and the open-divergence scan. There is deliberately **no index on `tweet_media(media_id)`**: the only query it would serve is "which tweets reference this object", the feature-schema scan reclamation is forbidden to run.

Columns without their own index are either already unique (for example `username` and `email`, whose uniqueness already provides an index) or are not on a hot read path. The broader rules — bounded queries, avoiding N+1 — are owned by [Engineering Principles §9](../development/engineering-principles.md).

## The follow graph

A follow joins users to users through two named relations. A user's **followers** are the rows in which they are the *followed* party; their **following** are the rows in which they are the *follower*. The two directional indexes make both questions cheap. The aggregate counts the API exposes (followers, following, tweets, likes received) are **computed** from these relations, not stored — so they cannot drift from the underlying rows.

## Where related facts live

- **Field-level truth** (types, defaults, column maps): [`schema.prisma`](../../server/prisma/schema.prisma).
- **Wire shapes and exposed counts** (what the client receives): the [API contract](../api/api-contract.md).
- **How the data tier sits in the request lifecycle**: the [system overview](system-overview.md).
- **The Media subsystem's mechanisms** (registry, storage adapter, reclamation lifecycle): [`backend/media.md`](../backend/media.md).

---

> This document owns the data model's relationship, cascade, and indexing rationale. The field-level schema is owned by `schema.prisma`, and wire shapes by the API contract — linked here, never duplicated.
