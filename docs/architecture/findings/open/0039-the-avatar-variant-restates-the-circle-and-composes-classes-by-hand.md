# Finding 0039: The file input's avatar variant restates the circle Avatar now owns, and composes its classes outside the shared helper

> **Status:** Open
> **Date:** 2026-09-23
> **Affected areas:** `apps/web/src/shared/design-system/components/fields/FileInput/variants/avatar/`; `apps/web/src/shared/design-system/components/fields/FileInput/variants/dropzone/DropzoneInput.tsx`; `apps/web/src/shared/design-system/components/display/Avatar/`
> **Reported by:** Basel Ghonaim (surfaced while admitting `Avatar` to the layer, [#800](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/800))

One component, two departures. They are recorded together because they share a subject — the avatar variant's internals — and a single piece of authoring work closes both.

## Observation 1 — the circle is drawn twice

`Avatar` is admitted to the layer as a picture in a circle with a fallback. `FileInput`'s avatar variant already draws the same thing, and has since before `Avatar` existed:

| What | Where |
|---|---|
| A circle sized by a custom property | `AvatarInput.tsx` — `--avatar-size`, with `avatarShape === "circle"` selecting `.avatarCircle` |
| A picture clipped by it | `AvatarInput.tsx` — `.avatarPreviewImg` |
| `UserIcon` as the fallback when there is none | `AvatarEmpty.tsx` |

**The approved designs settle that these are one part rather than two that resemble each other.** Settings → Profile draws its picture picker as `qtf-avatar qtf3-avatar--96` — the same class, at the same diameter, as the Profile header's avatar. A reader of the design sees one part; the layer holds two implementations of it.

The cost is the ordinary cost of a rule written twice: a change to the circle — its clipping, its ground, its fallback, a size the designs add — lands in one implementation and not the other, and nothing says so.

## Observation 2 — two variants compose their class lists by hand

The [authoring contract](../../../frontend/design-system/components.md) sends class lists through the shared helper, *"so that the rule is written once"*. Inside this one component, both answers are in use:

| File | How it composes a class list |
|---|---|
| `FileInput.tsx` | `classNames(...)` — the helper |
| `variants/avatar/parts/AvatarOverlay.tsx` | `classNames(...)` — the helper |
| `variants/avatar/AvatarInput.tsx` | a literal array, then `.filter(Boolean).join(" ")` |
| `variants/dropzone/DropzoneInput.tsx` | the same, again |

This is the departure [Finding 0024](0024-message-region-enters-the-layer-below-its-conventions.md) records for `MessageRegion` under *Styling*, reproduced here — and reproduced **beside** files that already use the helper, so the component disagrees with itself rather than with a convention it never met. The hand-rolled form is the helper's own body, so nothing renders differently today; what is lost is the single place the rule was extracted to live.

## Why it is recorded rather than fixed

The Work Item that admits `Avatar` was scoped to the component and its evidence. Both observations are authoring work on a **different** component, and the first is not a move:

- the variant's size arrives as `avatarSize: number`, while `Avatar`'s sizes are named, so composing one inside the other changes a public prop a consumer passes;
- the variant's circle carries an interactive empty state, a drag target and a hover overlay that `Avatar` has no business holding;
- the variant also supports a `rectangle` shape, which `Avatar` does not offer and, on the designs available, has no consumer.

That is separable work with its own contract, and the [Execution Standard](../../../development/engineering-execution-standard.md) §11 routes it to a new Work Item rather than into this branch.

## What would close it

For the circle: either the variant composes `Avatar` and keeps only what a file input adds, or the shared fragment becomes a [shared part](../../../frontend/design-system/components.md) that both compose. The *Shared parts* rule's condition — that more than one component would otherwise write the same rule — is now met either way.

For the class lists: both variants bind the helper their siblings already use.

## Affected

- `FileInput`'s avatar variant, on both counts.
- `FileInput`'s dropzone variant, on the second.
- Any later change to the circle, the clipping or the fallback, which must be made twice until the first is closed.

## Not decided here

Whether the variant composes `Avatar` or a shared part is extracted instead, and when either happens.
