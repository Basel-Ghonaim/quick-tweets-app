# Finding 0025: The journey's stepper holds the committed Stepper's name, and is not the same component

> **Status:** Open
> **Date:** 2026-09-09
> **Affected areas:** `apps/web/src/modules/auth/components/Stepper/`; `apps/web/src/modules/auth/components/Stepper/stepStates.ts`; the interface vocabulary in [`docs/project/overview.md`](../../../project/overview.md)
> **Reported by:** Basel Ghonaim (surfaced during the architectural reassessment behind [ADR 0018](../../decisions/0018-composition-has-a-home-four-frontend-zones.md), [#679](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/679))

## Observation

The product's [committed scope](../../../project/overview.md) names **Stepper** in its interface vocabulary. A reader consulting that list, and finding a `Stepper` in the tree, would reasonably conclude it exists.

It does not. What exists is the registration journey's own presentation of its own fact:

- it hardcodes three steps — `account`, `profile`, `verify` — as a module constant, so it cannot describe any other sequence;
- it declares `JourneyStepId` as exactly those three, and `stepStates.ts` imports that type as the journey's vocabulary;
- it reads the authentication copy catalogue directly for its step names, its state names and its list label.

None of that is a defect in the component. It is a good component for the thing it does. It is simply **not the generic progress control the product committed to**, and the two share a name.

## Why the name matters

The committed vocabulary is one of the three ways a need is grounded ([ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 2), which is precisely why it must be checkable. A committed name that appears to be satisfied by something else is the one failure mode that criterion cannot survive: the next author to ask *"is a Stepper grounded?"* finds the name taken and stops looking.

The coupling to the copy catalogue is the sharpest evidence. [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 6 keeps localization *data* out of the Design System, so a component that reads a surface's copy directly could not enter the layer in that form whatever it were called.

## What ADR 0018 settles, and what it leaves

[ADR 0018](../../decisions/0018-composition-has-a-home-four-frontend-zones.md) settles where this component belongs: the types are the journey's vocabulary and the component renders the journey's own fact, so both are the journey capability's rather than the composition's. That placement is not in question.

What is left open is the naming collision and the unbuilt commitment behind it.

## Not decided here

Whether the generic `Stepper` is built, whether the journey's is renamed to say what it is, and whether the committed entry is restated. A finding records the deviation; it never schedules the fix.

## Addendum — 2026-09-11

**The placement stated under *What ADR 0018 settles* is superseded in part.** ADR 0018 Decision 3 permits a feature to own the interface that is its interaction; it does not require one to. The [Frontend Capability Structure](../../../plans/historical/frontend-capability-structure.md) plan gives the journey capability no interface, and leaves where the journey's progress display lives open as its question E. The component and its types are therefore not the journey capability's by settlement.

`stepStates` — which turns the journey's position into this component's props — has accordingly left the journey capability to sit beside the component ([#697](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/697)). Where the component and its view-model finally live is question E.

The naming collision this Finding records is unaffected, and so is its status.

## Addendum — 2026-09-14, the progress display has a home ([#733](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/733))

**Question E is answered: the progress display lives in the auth page group's layout**, at `apps/web/src/pages/auth/layout/Stepper/`, and its view-model in that group's `services/`. It has two consumers and always had — the sign-up route and the onboarding route — and both sit inside one route subtree, which is what [ADR 0018](../../decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 2 gives a page group. The chrome two routes of one subtree share is the group's layout, not a capability's interface.

That also settles what the 2026-09-11 addendum left open. `stepStates` left the journey capability then because the journey owns no interface; it has now arrived somewhere rather than merely having departed.

**The step identities and states are no longer the component's to declare.** They are the page group's vocabulary and sit in its `model/`, so the view-model no longer imports a component in order to describe a position.

**The naming collision this Finding records is untouched, and the Finding stays `Open` for it.** A reader consulting the committed interface vocabulary still finds a `Stepper` in the tree that is not the generic control the product committed to — it is the journey's own presentation of the journey's own fact, and it still reads the authentication copy catalogue directly. Moving it changed where it lives and nothing about what it is.
