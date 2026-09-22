# Finding 0026: Neither tier owns the credential rules, and each points at the other

> **Status:** Open
> **Date:** 2026-09-09
> **Affected areas:** `apps/web/src/shared/validation/credentialRules.ts`; `apps/api/src/modules/auth/auth.validator.ts`; `apps/api/src/shared/validation/username.ts`
> **Reported by:** Basel Ghonaim (surfaced while moving the rules out of the auth module, [#683](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/683))

## Observation

The password policy and the username charset are stated **twice**, once per tier, and the two statements agree exactly today: 8–72 characters with `[a-z]`, `[A-Z]`, `[0-9]` and `[@$!%*?&#]`; 4–20 characters matching `^[a-z0-9_]+$`.

That agreement is not held by anything. **No tier owns the fact, and the documents that gesture at ownership point in incompatible directions:**

- `apps/api/src/modules/auth/auth.validator.ts:11` — *"Constraints are aligned with the frontend form schemas (`authFormSchemas.ts`) to ensure consistent validation on both sides."* The server names the **client** as the reference.
- `apps/api/src/shared/validation/username.ts:4` — *"The single source of truth for the username constraint."* A second file on the **same tier** claims the ownership the first has just given away.
- The client, until this Work Item, said it *"mirrors the backend schemas… the current reconciliation reference"* and deferred the question of where the constraints should ultimately live.

Three claims, three answers, and the values agree by attention rather than by construction.

## Why this is a finding rather than a fix

**The home already exists as a decision and not yet as a directory.** [ADR 0013](../../decisions/0013-applications-and-cross-tier-packages.md) records exactly this shape as the motivation for the cross-tier package layer — *"certain deterministic facts are defined on both tiers and reconciled by hand, which drifts"* — and its rules bind what such a package may hold: one ownership category, no runtime dependency, and a fact whose owner is already documented.

Creating `packages/` is an effort of its own. It is not something a Work Item that moves a file between zones may take on, and the frontend zone migration's plan puts it out of scope explicitly.

## What sharpens it

The drift this predicts has already happened once and been repaired: [#263](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/263) records the client enforcing a 16-character password ceiling against the contract's 72, with no complexity rules at all. It was closed by aligning the values — that is, by hand, which is the mechanism this finding says is the problem.

`checks/boundaries.test.ts` cannot see any of this: it guards imports between units, and two units stating the same constant independently import nothing from each other.

## Not decided here

Whether the package layer is created, which tier's statement becomes the definition, and whether the messages follow the rules or stay with the content they are. A finding records the deviation; it never schedules the fix.
