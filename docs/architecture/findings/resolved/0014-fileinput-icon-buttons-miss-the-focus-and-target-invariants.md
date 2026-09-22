# Finding 0014: FileInput's icon buttons miss the owned focus indicator and the minimum hit target

> **Status:** Resolved
> **Date:** 2026-08-18
> **Affected areas:** `apps/web/src/shared/design-system/components/fields/FileInput/` — `FileInput.module.css` and the `avatar` / `dropzone` variant parts
> **Reported by:** Basel Ghonaim (surfaced while preparing the IconButton, [#525](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/525); extended with the visibility defect while preparing the migration, [#529](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/529))
> **Resolved:** [#568](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/568) — `addMoreBtn` and `addMoreRow` compose the owned indicator. Neither could take the shared control, so each composes it directly, in the plain attachment: neither wraps a focusable child and neither is clipped.

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

**The table above records the state when this was observed.** `fileListRemoveBtn` was corrected in [#527](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/527) — it is now the shared control, clears the target and composes the indicator. The finding stays `Open` because `addMoreBtn` and `addMoreRow` still declare no indicator, and both are permanently excluded from the migration that would have given them one: each carries an icon *and* visible text, or is a drop affordance rather than an action, so neither is an icon-only button.

## A third defect, found while preparing the migration

**Two of these controls are invisible to a keyboard user**, and the missing indicator is not why. Both overlay surfaces are `opacity: 0` and revealed on **hover alone**:

```css
.thumbnailWrapper:hover .thumbnailRemoveBtn { opacity: 1; }
.avatarWrapper:hover  .avatarOverlay        { opacity: 1; }
```

Neither keys off focus. So the controls are reachable by tab and never become visible while being reached, which fails [WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) **independently** of the indicator defect above.

The two compound rather than add: composing the owned indicator on these controls would change nothing on its own, because a ring drawn on a fully transparent element is itself transparent. Fixing the visibility is therefore a prerequisite for the indicator fix to mean anything, and it is a **behaviour change** rather than a migration — which is why the migration was split, with these two controls and this defect handled together.

Recorded here rather than as a separate finding: it is the same cluster, the same stylesheet, and the same root cause — controls placed over media were styled for the pointer and never for the keyboard.

**This section records the state when it was observed, and the visibility defect it describes is closed.** Both surfaces now reveal on focus as well as hover — `.thumbnailWrapper:focus-within` and `.avatarWrapper:focus-within` — so a control reached by tab becomes visible while it is being reached. Three more of the table's controls have since become the shared one and now compose the indicator and clear the target: `thumbnailRemoveBtn` and both `avatarOverlayBtn`.

**Closed.** `addMoreBtn` and `addMoreRow` now compose the indicator directly. The reason they were excluded from the IconButton migration is unchanged and still correct — each carries an icon *and* visible text, or is a drop affordance rather than an action — so the migration was never the route. Composing the indicator without migrating the control was.

**Neither ever violated the hit-target half of this finding's title.** That applied to the four controls since corrected; the grid affordance is 80×80 and the row is a text-sized row, both well clear of the floor.

## The two invariants this crosses

**A component never declares an indicator of its own; it composes the owned one** ([components.md](../../../frontend/design-system/components.md)). Five of these declare none at all, so keyboard focus falls back to the user agent's default outline — which is not the owned indicator, is not guaranteed against the surfaces these sit on, and is exactly the per-component focus drift [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 5 exists to end. `avatarOverlayBtn` is the sharpest case: it sits over an arbitrary photograph, where a UA default has no contrast guarantee at all.

**`--control-target-min` is a platform basis, not a design choice** — 24 px, WCAG 2.5.8, declared theme-invariant because no resolution axis changes a finger. `thumbnailRemoveBtn` at 20 px and `fileListRemoveBtn` at roughly 22 px are below it, and neither binds the token.

## Why it was not fixed where it was found

Both were discovered while scoping IconButton, and fixing them there would have smuggled two unrelated changes into a component-authoring Work Item: a visual change (the undersized controls get bigger, which alters the image grid's layout) and an accessibility fix. Neither is a refactor, and the second is not the first's consequence.

`addMoreBtn` is the reason this is not simply *"migrate them onto IconButton"*. At 80 px with a dashed border it is a drop affordance that happens to contain an icon, not an icon-only action, and it has been **explicitly excluded** from any future IconButton migration.

## Affected

Keyboard and assistive-technology users of the avatar overlay and both dropzone modes; pointer users on touch for the two undersized controls. The visibility defect reaches keyboard users of the avatar overlay and the image grid specifically, since those are the two surfaces revealed on hover.

## Not decided here

Whether these migrate onto `IconButton`, are corrected in place, or are restructured; and what the undersized controls become once they meet the target. A finding records the deviation and never schedules the fix — the FileInput cluster is expected to become its own Work Item.
