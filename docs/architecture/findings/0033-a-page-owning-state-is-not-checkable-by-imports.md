# Finding 0033: A page owning state is not checkable by imports, and the check proxies it

> **Status:** Open
> **Date:** 2026-09-15
> **Affected areas:** `apps/web/src/zones.test.ts`; `apps/web/src/pages/auth/boundary.test.ts`; [ADR 0018](../decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 4
> **Reported by:** Basel Ghonaim (surfaced while the zone direction became a check, [#737](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/737))

## Observation

[ADR 0018](../decisions/0018-composition-has-a-home-four-frontend-zones.md) names **two** rules a page must not break, and calls both *"mechanically checkable"*: it **may not reach transport directly**, and it **may not own state**.

Only the first is. An import names the transport, so a rule can read it — `zones.test.ts` matches the slice a specifier resolves to, and catches it by alias or by relative path alike.

**Owning state is not expressed by any import.** A page that declared its own slice and held it — `createSlice` from a package the whole application already depends on — would import nothing forbidden and pass every check in the repository.

What `pages/auth/boundary.test.ts` asserts under the name *"no transport and no store"* is that no file under the group imports `@app/`. That catches a page reaching **the composition root's** store, which is a different thing and which the zone direction already forbids on its own. The repository-wide check inherits the same proxy rather than improving it.

## Why it matters

The ADR's claim that both rules are mechanically checkable is what justified leaving them to a check rather than to review. One of them is not, and a green run reads as though it were — which is worse than no check, because it invites the conclusion that the rule is held.

The gap is narrow today: one page group exists, it declares no slice, and the composition root assembles every reducer in `app/store/store.tsx`, where a new one would be visible. It widens the moment a second page group exists or a slice is registered anywhere else.

## Why it is recorded rather than resolved

Closing it needs a rule about **what a page may declare**, not about what it may import — a structural assertion (no `createSlice`, no `store/` directory under `pages/`), or a narrower one derived from the composition root's reducer map. Either is a decision about the page contract, and the Work Item that found it was adding a check for the zone direction. Deciding a contract inside it is the scope creep [Engineering Execution Standard §7](../../development/engineering-execution-standard.md) forbids.

## Not decided here

Whether the page contract gains a structural rule, whether ADR 0018 Decision 4's *"mechanically checkable"* should be narrowed to the one rule that is, and whether the existing `@app/` proxy should keep its current name — which describes more than it checks.
