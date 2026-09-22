# Finding 0016: The shared class-name helper sits inside one subsystem, out of reach of its peers

> **Status:** Open
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
