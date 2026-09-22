# Finding 0023: The verification UI is placed by the composition that uses it, and that placement is not its answer

> **Status:** Open
> **Date:** 2026-09-09
> **Affected areas:** `apps/web/src/modules/auth/screens/Verify/` — `VerifyAsk.tsx`, `VerifyCode.tsx`, `messages.ts`
> **Reported by:** Basel Ghonaim (surfaced during the architectural reassessment behind [ADR 0018](../../decisions/0018-composition-has-a-home-four-frontend-zones.md), [#679](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/679))

## Observation

The two verification screens perform the interaction of a **platform capability**: `shared/channel-verification/` owns whether an endpoint is proven, and these screens ask for a code and confirm one. What they are is one capability's interaction; where they sit is the composition that happens to use them.

Under [ADR 0018](../../decisions/0018-composition-has-a-home-four-frontend-zones.md) that is an uncomfortable fit rather than a violation. A feature may own the UI that *is* its interaction (Decision 3), and a page composes capabilities and owns no fact (Decision 4) — but the capability here lives in `shared/`, which holds no product UI, so neither rule places these screens cleanly. They go with the onboarding composition because that is the only surface that renders them today.

## Why this is recorded rather than resolved

**The placement was decided knowingly, and it is not conditional.** The obvious deferral — *"leave it page-local until a second consumer appears"* — was considered and deliberately **not** adopted. Tying the correction to a future consumer would make it look accidental, and would leave a reader of this code unable to tell a settled placement from an unexamined one.

It is recorded instead, plainly: the placement is interim, it is known to want revisiting, and the work to revisit it is future work rather than a condition waiting to fire.

## What sharpens it

Settings is the surface most likely to render these screens next — an account holder verifying an address outside registration. If it does, the screens must be reachable from two compositions, and a page may not import another page. At that point the placement stops being merely uncomfortable and becomes an obstruction.

That is a prediction, not the trigger. The finding stands whether or not Settings is built.

## Not decided here

Whether the verification UI becomes a feature of its own, whether it moves to sit beside the capability it composes, and what a product UI over a platform capability should be called. A finding records the deviation; it never schedules the fix.

## Addendum — 2026-09-14, the screens have a home ([#733](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/733))

**Question A is answered: the verification screens live in the auth page group**, at `apps/web/src/pages/auth/screens/Verify/`. They are the interaction of a platform capability that publishes no product interface ([ADR 0019](../../decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6), and a page is the zone that composes what no capability owns ([ADR 0018](../../decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 4).

**What this Finding recorded is unchanged, and is now recorded against a real zone rather than a legacy one.** The placement is still the composition's rather than the capability's, and the cost this Finding named still stands: Settings is the surface most likely to render these screens next, and a page may not import another page. **That remains the trigger to revisit**, and it has not fired.

The answer settles *where*, not *what*. Whether a product interface over a platform capability eventually becomes something with a name of its own is still not decided, and this Finding still records it as open.
