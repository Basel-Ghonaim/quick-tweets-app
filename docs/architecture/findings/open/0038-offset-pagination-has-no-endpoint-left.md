# Finding 0038: Offset pagination is a documented convention with no endpoint left

> **Status:** Open
> **Date:** 2026-09-23
> **Affected areas:** [API contract](../../../api/api-contract.md#offsetpaginationmeta) (`OffsetPaginationMeta`); [backend conventions](../../../backend/conventions.md#pagination) (§Pagination); `apps/api/src/modules/comments/comment.types.ts`
> **Reported by:** Worker 2 (surfaced while moving the comment thread to cursor pagination, [#799](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/799))

## Observation

`GET /comments?tweetId=` was the only endpoint using offset pagination. Moving the
thread to a cursor — because a page number is not stable while a reader scrolls a
live conversation — leaves **offset pagination with no reader anywhere in the
system**, while two documents still describe it as one of the project's two
conventions.

Three facts are individually true and no longer line up:

- the [backend conventions](../../../backend/conventions.md#pagination) present offset as one of two conventions, selected "for small, bounded lists", and own that selection rule;
- the [API contract](../../../api/api-contract.md#offsetpaginationmeta) documents the `OffsetPaginationMeta` shape and, until this change, named the endpoint that returned it;
- no endpoint returns that shape, and the `OffsetParams` / `OffsetMeta` types have been removed from the comments module along with their only use.

The contract's "Used by" line now says so plainly, which keeps it truthful. What
it cannot do is decide whether the convention should still be documented.

## Why this is recorded rather than acted on

Removing the convention would be a decision about the project's pagination
strategy, which is the [backend conventions](../../../backend/conventions.md)
document's, not this Work Item's. Keeping it is equally a decision. Either way it
is a **choice with lasting consequence**, so it is proposed rather than taken
([Engineering Execution Standard](../../../development/engineering-execution-standard.md) §10, §11).

It is also not obviously dead. Offset is the right shape for a genuinely bounded
list with a page navigator, and the surfaces this track has not yet built —
search results above all — may want one. A convention removed and then needed
again costs more than a convention that waits.

## The question for the owner

**Does offset pagination stay a documented convention with no current reader, or
is it retired until something asks for it?**

Three shapes an answer could take:

- **Keep both, as now.** The convention survives for the case it is meant for, and the contract records that nothing uses it today. Costs nothing but a reader's moment of doubt.
- **Retire it.** Remove `OffsetPaginationMeta` from the contract and narrow the conventions document to cursor pagination, recording that offset returns when a bounded list earns it.
- **Keep the rule, drop the shape.** The conventions document keeps the selection rule; the contract stops documenting a response shape no response has.

No option is safe to take silently, which is why none was taken.

## What would close this

A decision recorded in the [backend conventions](../../../backend/conventions.md)
document, and the API contract brought into line with it in the same pull
request. If the answer is to retire it, this finding moves to `resolved/` naming
that change.
