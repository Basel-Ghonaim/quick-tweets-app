# Finding 0003: The global feed's cursor pagination orders by `id`, not the documented `createdAt` index

> **Status:** Open
> **Date:** 2026-07-05
> **Affected areas:** `docs/architecture/data-model.md`, `server/prisma/schema.prisma`, `server/src/modules/tweets/tweet.repository.ts`
> **Reported by:** Basel Ghonaim (surfaced by the G3 final migration audit, Work Item #271)

## Observation

The data model documents the global feed as being served by a **creation-time index**, but the feed query actually orders and cursors on the primary key `id`. The `createdAt`-descending index the document credits is not the index the feed rides — and no observed query reads it. This is a divergence between the documented rationale and the code, which is the source of truth ([CLAUDE.md](../../../CLAUDE.md) — "Code is the source of truth").

Three facts are individually true but do not line up:

- the documentation attributes the feed to a creation-time (`createdAt DESC`) index;
- the feed query orders and cursors on `id` (the primary key);
- a `createdAt`-descending index exists in the schema, with no query that reads it.

## Evidence

Verified on `main` (2026-07-05).

**The documented claim**

- `docs/architecture/data-model.md` (Indexing) — before this finding, "**Tweets** are indexed by creation time (descending) for the **global feed** …". The data model's own rule for the section is that "each [index] maps to a query the application actually runs."

**The actual query behaviour** — the feed and author-timeline queries order and cursor on `id`, not `createdAt`:

- `server/src/modules/tweets/tweet.repository.ts:68` (`findMany`, the global feed) — `orderBy: { id: "desc" }`, with `cursor: { id: cursor }, skip: 1` (line 67).
- `server/src/modules/tweets/tweet.repository.ts:82` (`findByAuthor`, author timeline) — `orderBy: { id: "desc" }`, with `cursor: { id: cursor }, skip: 1` (line 81).

The wire contract agrees with the code: `docs/api/api-contract.md` — the feed is "Ordered by `id DESC`" and the cursor "is the `id` of the last item".

**No reader for the `createdAt` index** — a sweep of `orderBy` across every feature module (`git`-tracked `server/src/modules/**`) finds the `Tweet.createdAt` index is never used to order or cursor:

- Tweets order by `id` (above); follows order by `id` (`server/src/modules/follows/follow.repository.ts:96,112`).
- The only `createdAt` ordering is on **comments** — `server/src/modules/comments/comment.repository.ts:64` `orderBy: { createdAt: "asc" }` — a *different* model that carries **no** `createdAt` index (its indexes are `tweetId` / `authorId`).

**The existing index**

- `server/prisma/schema.prisma:70` — `@@index([createdAt(sort: Desc)])` on `Tweet`. It exists, but the feed rides the primary-key index on `id`, and no observed query orders or filters by `Tweet.createdAt`.

## Principle / boundary violated

- **Code is the source of truth** ([CLAUDE.md](../../../CLAUDE.md)): when documentation and code disagree, the code wins; the divergence must be reconciled by an approved decision. A finding records the problem — it does not decide it.
- **Each index maps to a real query** (the [data model](../data-model.md)'s own stated indexing rule): the documented feed↔`createdAt` mapping does not hold, and the `createdAt` index has no observed reader.

## Resolution direction (not scheduled here)

The divergence has three candidate resolutions, and choosing among them is an **architectural decision, not a documentation edit** (Documentation Strategy §9 — a finding records the problem, it does not decide it). No product code is changed here.

1. **The documentation is wrong.** The feed is intentionally ordered by `id` — an auto-increment `id` is monotonic with insertion, so `id DESC` is already reverse-chronological — and `data-model.md` should describe the primary-key ordering. The `createdAt` index is then either serving a different/future path or is unnecessary (see 3).
2. **The query should use the index.** If ordering by `createdAt` is the intended design (e.g. to decouple feed order from the surrogate key, or to allow back-dated inserts), the code should order/cursor on `createdAt` and the `createdAt`-descending index becomes the real backing index.
3. **The index is unnecessary.** If `id` ordering is intended and nothing else uses `Tweet.createdAt`, the `@@index([createdAt(sort: Desc)])` is dead weight and could be dropped.

Pending that decision, `data-model.md` is adjusted only enough to stop presenting the disputed feed↔`createdAt` mapping as settled truth, and links to this finding.

## Links

- Surfaced during the G3 final migration audit ([Migration Plan §7](../documentation-migration-plan.md), Work Item #271).
- `docs/architecture/data-model.md` (Indexing) records the current state and links back to this finding.
