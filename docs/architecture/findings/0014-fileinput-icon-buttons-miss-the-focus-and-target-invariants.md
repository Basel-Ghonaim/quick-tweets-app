# Finding 0014: FileInput's icon buttons miss the owned focus indicator and the minimum hit target

> **Status:** Open
> **Date:** 2026-08-18
> **Affected areas:** `apps/web/src/shared/design-system/components/fields/FileInput/` — `FileInput.module.css` and the `avatar` / `dropzone` variant parts
> **Reported by:** Basel Ghonaim (surfaced while preparing the IconButton, [#525](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/525))

## Observation

FileInput renders six icon-only buttons. **One of them composes the owned focus indicator; five do not**, and two are smaller than the minimum hit target the Foundation declares.

| Class | Where | Composes the indicator | Box |
|---|---|---|---|
| `triggerButton` | standard variant | **yes** (`focusRing`) | text-sized |
| `avatarOverlayBtn` ×2 | avatar overlay | no | 36 px |
| `thumbnailRemoveBtn` | dropzone image grid | no | **20 px** |
| `addMoreBtn` | dropzone image grid | no | 80 px |
| `fileListRemoveBtn` | dropzone file list | no | **≈22 px** (14 px icon + `--space-1` either side) |
| `addMoreRow` | dropzone file list | no | text-sized row |

The two `composes: focusRingWithin` declarations elsewhere in the stylesheet belong to the *wrappers* — they ring the native input that WI-2 of the re-establishment effort made canonical, and they say nothing about these buttons.

## The two invariants this crosses

**A component never declares an indicator of its own; it composes the owned one** ([components.md](../../frontend/design-system/components.md)). Five of these declare none at all, so keyboard focus falls back to the user agent's default outline — which is not the owned indicator, is not guaranteed against the surfaces these sit on, and is exactly the per-component focus drift [ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 5 exists to end. `avatarOverlayBtn` is the sharpest case: it sits over an arbitrary photograph, where a UA default has no contrast guarantee at all.

**`--control-target-min` is a platform basis, not a design choice** — 24 px, WCAG 2.5.8, declared theme-invariant because no resolution axis changes a finger. `thumbnailRemoveBtn` at 20 px and `fileListRemoveBtn` at roughly 22 px are below it, and neither binds the token.

## Why it was not fixed where it was found

Both were discovered while scoping IconButton, and fixing them there would have smuggled two unrelated changes into a component-authoring Work Item: a visual change (the undersized controls get bigger, which alters the image grid's layout) and an accessibility fix. Neither is a refactor, and the second is not the first's consequence.

`addMoreBtn` is the reason this is not simply *"migrate them onto IconButton"*. At 80 px with a dashed border it is a drop affordance that happens to contain an icon, not an icon-only action, and it has been **explicitly excluded** from any future IconButton migration.

## Affected

Keyboard and assistive-technology users of the avatar overlay and both dropzone modes; pointer users on touch for the two undersized controls.

## Not decided here

Whether these migrate onto `IconButton`, are corrected in place, or are restructured; and what the undersized controls become once they meet the target. A finding records the deviation and never schedules the fix — the FileInput cluster is expected to become its own Work Item.
