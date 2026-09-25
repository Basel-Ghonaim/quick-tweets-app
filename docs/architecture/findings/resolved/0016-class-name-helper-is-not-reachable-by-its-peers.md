# Finding 0016: The shared class-name helper sits inside one subsystem, out of reach of its peers

> **Status:** Resolved — 2026-09-27. The helper moved to `apps/web/src/shared/design-system/foundations/helpers/`, which `components/` and `icons/` both already reach, in [#825](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/825). See the update at the end.
> **Date:** 2026-08-26
> **Affected areas:** `apps/web/src/shared/design-system/components/shared/helpers/classNames.ts`; `apps/web/src/shared/design-system/icons/`
> **Reported by:** Basel Ghonaim (surfaced while giving icons a way to declare mirroring, [#550](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/550))

## Observation

`classNames` is a layer-wide helper — a pure string function with no React and no knowledge of the design language — and its own comment says why it is shared: *"Every component hand-rolled this with slightly different filtering; one implementation means a class list is composed the same way everywhere."*

It lives under `components/`. The layer's barrel exports three peers — `foundations`, `components`, `icons` — and **`components` already imports `icons`** (Checkbox renders `CheckIcon`; the file list renders three more). So the first time something in `icons/` needed to compose a class, the obvious import would have added a return edge between two peers.

It is **not a module cycle**: `components/shared` reaches only React and `foundations`. But a reader, or a future boundary check, sees `components → icons` and `icons → components` and has to trace four files to learn that one of them is harmless.

## Evidence

`SearchIcon` needed to compose one class with the caller's. It resolved the composition inline, with the reason stated at the code, rather than importing the helper that exists precisely so this is not done twice.

## Why it is not resolved here

Moving the helper is the fix — it belongs where all three peers can reach it, not inside one of them — and it touches every component that imports it plus the surface those imports pass through. That is a refactor with its own scope, and the Work Item that surfaced this was about direction and hit targets.

The cost while it stands is small and bounded: one inline composition, and the next peer that needs the helper will face the same choice.

## Update — 2026-09-27 · Resolved

**The fix this finding named is the one that was taken.** `classNames` now sits in `foundations/helpers/`, and the edge that made its old home awkward was never a problem in that direction: `icons/` already imported from `foundations/` — `SearchIcon` took the mirroring stylesheet from there — so the move added no edge and closed no cycle, because there was none to close.

**Its evidence is gone with it.** `SearchIcon` composes its class through the helper, and the inline composition this finding cited as proof no longer exists.

**Two things were deliberately left alone.** The helper stayed **out of the foundations barrel**, so it is no more public than it was — a move is not the moment to widen a surface — and components still take it from their own barrel, so not one of the nineteen call sites changed.

**What this does not close.** `FileInput`'s two variants still compose their class lists by hand; that is [Finding 0039](../open/0039-the-avatar-variant-restates-the-circle-and-composes-classes-by-hand.md)'s second observation, and it is about those components rather than about where the helper lives.

**Recorded late.** The move shipped in #825, whose execution-log entry already said this finding was closed — the file was not moved with it. That contradiction is what this update settles, and it is the second time a finding resolved by construction has needed closing after the fact ([Finding 0012](0012-no-shared-stacking-concept.md) was the first).
