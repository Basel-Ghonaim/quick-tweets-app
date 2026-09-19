# Finding 0032: A check on a lane's own infrastructure has no lane

> **Status:** Open
> **Date:** 2026-09-15
> **Affected areas:** `apps/web/src/shared/api/transportBootstrap.component.test.tsx`; `apps/web/vitest.component.setup.ts`; [`docs/development/testing-topology.md`](../../development/testing-topology.md)
> **Reported by:** Basel Ghonaim (surfaced while the test seam left production, [#735](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/735))

## Observation

The [testing topology](../../development/testing-topology.md) assigns a **behaviour** to a lane, and a behaviour is *"an outcome, attributed to the single unit that decides it"* ([ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) Decision 3). Every row of its lane table is written that way.

`transportBootstrap.component.test.tsx` asserts no such outcome. It asserts that **this lane wired the transport** — that `authClient` carries the interceptors the composition root attaches, so an HTTP failure arrives as a normalized `AppError` rather than the transport's own error. The unit it speaks for is `vitest.component.setup.ts`, which is not production and decides nothing a reader meets.

It therefore sits in the component lane by elimination rather than by the assignment rule: the bootstrap runs only in that lane's setup, so only a `*.component.test.tsx` can observe it. It renders nothing, and carries a `.tsx` extension solely to match the project's include glob.

## Why it matters

The topology's value is that a lane is **assigned**, never chosen for being able to run something — that is the failure [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) was written to end. A case placed by elimination is the shape of that failure, even when the case is correct and useful.

It is useful, and it bites: removing the bootstrap from the lane's setup fails it with *"expected AxiosError … to be an instance of AppError"*. Without it, the two lanes silently disagree about what a refusal means — a divergence no screen's test reports, because a screen renders its failure state either way. That gap existed unnoticed until this Work Item, and is the reason the check was written.

## Why it is recorded rather than resolved

Deciding where a check on a harness belongs is a change to a Contract, and the Work Item that found it is a seam removal. Altering the topology's rules inside it would be the scope creep [the Engineering Execution Standard §7](../../development/engineering-execution-standard.md) forbids, and the topology's own transition list is closed to new members by [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) Decision 8 — so this is not a candidate for that list either.

## Not decided here

Whether the topology gains a row for a check on lane infrastructure, whether such a check is exempt from the assignment rule instead, and whether the component project's include glob should admit a non-rendering file without a `.tsx` extension. Each is the topology owner's, and none is this Finding's to take.

## Addendum — 2026-09-18, the browser lane checks its own direction ([#765](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/765))

**A second check of the same kind now exists, in the browser lane.** The lane renders every story twice, once in each reading direction, and each run's setup, through `apps/web/.storybook/readingDirection.ts`, fails a story that ends in a direction other than the one the run claims. Like the case above, it asserts no outcome a reader meets: it asserts that **this run is the run it says it is**, and the unit it speaks for is lane configuration.

**It was added deliberately, not by elimination.** Without it, a run that stopped stamping its direction would pass as the other run and report nothing, so the right-to-left proof would erode with the lane still green. It follows `domValidity.ts`, which already asserts after every story in the same lane.

**Nothing here decides the question above.** Where such a check belongs, and whether the topology names it, remain the topology owner's.
