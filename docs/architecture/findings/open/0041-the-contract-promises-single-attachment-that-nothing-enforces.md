# Finding 0041: The contract promises a media object attaches once, and nothing enforces it

> **Status:** Open
> **Date:** 2026-09-24
> **Affected areas:** [API contract](../../../api/api-contract.md#post-tweets--create-tweet) (`POST /tweets`, the `media` field); `apps/api/src/modules/media/media.ownership.ts` (`authorizeAttachMany`)
> **Reported by:** Worker 2 (surfaced while weighing image descriptions for the [backend plan](../../../plans/backend-plan.md), [#816](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/816))

## Observation

`POST /tweets` tells the client that each media token must be *"an object you uploaded and have not yet attached elsewhere"*. **The first half is enforced; the second is not.**

- The attach check refuses an object only when **someone else uploaded it**, or when it is **no longer ready** (`media.ownership.ts`, inside `authorizeAttachMany`). Nothing asks whether the object is already attached.
- The reference ledger is keyed on the **object and the referrer together** (`MediaReference`, `@@unique([mediaId, referrer])` in `schema.prisma`). So one object held by two tweets is two valid rows.
- No design document asks for single attachment. [Media](../../../backend/media.md) states the attach rule as *no cross-principal attach*, and [ADR 0005](../../decisions/0005-media-file-upload-architecture.md) and [ADR 0008](../../decisions/0008-auth-first-onboarding-grant-retirement.md) say nothing about attaching an object more than once.

## Evidence

Run against the backend worktree's API (port `4001`, database `quicktweets_w2`), using the harness's `sample.png`:

| Step | Result |
|---|---|
| Upload once, then create two tweets with the same token | **both `201`**: tweets 198 and 199, each returning the token |
| Read the ledger for that object | `tweet:198` · `tweet:199` |
| Delete tweet 198 | `204`; ledger `tweet:199` |
| Read the object (`GET /media/:token`) | `200` |
| Read tweet 199 | still carries the token |
| Delete tweet 199 | `204`; ledger empty |

**Reuse is coherent, not harmful.** Each use holds its own reference and ends only its own, so deleting one tweet neither breaks the other nor leaves the object behind once the last use goes. The divergence is in what the contract promises, not in how the system behaves.

## Why it is recorded rather than fixed

When the code and a document disagree, the code is what the system does. Here the document states a restriction nobody asked for, and the code allows what the reference model was built to handle. Correcting the contract is still a choice about the **Media contract**, and so is enforcing the restriction. Neither belongs to a documentation Work Item on another subject, so the question goes to the owner.

## The question for the owner

**May one uploaded object be attached to more than one post?**

- **Yes: correct the contract.** Drop *"and have not yet attached elsewhere"*, and state that each use holds its own reference. No code changes.
- **No: enforce it.** Refuse an attach while any reference exists. That is a behaviour change with its own Work Item, and it must decide what happens when a post is edited to re-attach an object it already holds.

Comments and the avatar attach a single object through the same check. The answer covers them too.

## What would close this

The contract and the attach check agreeing, in the pull request that makes them agree. This finding then moves to `resolved/`, naming that change.
