# Finding 0008: The role fill's hover value drops the control boundary below 3:1 in the dark theme

> **Status:** Resolved
> **Date:** 2026-08-04
> **Affected areas:** `apps/web/src/shared/design-system/foundations/resolution/theme/dark.css`, `apps/web/src/shared/design-system/foundations/resolution/theme/tokenContrast.test.ts`, `apps/web/src/shared/design-system/foundations/tokens/primitive/palette.css`
> **Reported by:** Basel Ghonaim (surfaced during the WI-4 review, PR #448)
> **Resolved:** [#562](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/562) — the dark theme's six hover values moved onto six new half-steps and clear 3:1 against `--surface-page`, and the check now asserts the pair it was silent on.

## Observation

The fill family carries a resting value and a hover value per role (`--role-fill-<role>` and `--role-fill-<role>-hover`). A filled control's own background **is** its boundary against the surface behind it, so both values are subject to the 3:1 non-text contrast requirement (WCAG 1.4.11), which [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 5 places under the system's ownership.

The hover value is one step darker than the resting value in both themes. On a light page that raises boundary contrast; on a dark page it lowers it. **In the dark theme every role's hover value falls below 3:1 against `--surface-page`**, while every resting value clears it.

The foundation check does not see this: its pairs assert `--role-fill-<role>` against `--surface-page` at 3:1 and never assert `--role-fill-<role>-hover` against any surface. It therefore certifies the resting state and is silent on the state a pointer user is in at the moment they act.

Text contrast is unaffected — `--role-fill-<role>-text` against the hover fill is asserted at 4.5:1 and holds (6.65:1 for `primary` in dark). The gap is the boundary, not the label.

## Evidence

Verified on `feat/445-button-colour-migration` at `0c460ef`, computing WCAG relative luminance over the values `dark.css` resolves.

Against `--surface-page` in the dark theme (`--palette-slate-900`):

| role | `fill` | `fill-hover` |
|---|---|---|
| primary | 3.45 | **2.66** |
| secondary | 3.69 | **2.36** |
| success | 3.26 | **2.32** |
| warning | 3.56 | **2.52** |
| error | 3.70 | **2.76** |
| info | 3.45 | **2.66** |

The same pairs in the light theme range from 6.19 to 7.35, so the defect is dark-only and is a consequence of the hover step having one direction while the two themes run in opposite ones.

**The table above records the state when this was observed**, on a branch whose ground was `--palette-slate-900`. Both grounds moved onto the mauve ramp in PR #549, so `--surface-page` resolves to `--palette-mauve-950` and every ratio here is superseded. Re-measured at `4df665d`, immediately before the fix: fills **3.34 / 3.74 / 3.30 / 3.60 / 3.74 / 3.50**, hovers **2.44 / 2.39 / 2.35 / 2.55 / 2.79 / 2.70** — the defect was **worse** than recorded, not better. The 6.65:1 text figure at the end of the Observation is now 7.40:1. Nothing in the conclusion changed.

Reached in the product by `Button`'s `contained` variant, which binds `--button-bg-hover` to `--role-fill-<role>-hover` and renders it as both `background-color` and `border-color`. The Storybook accessibility run cannot observe it, because `:hover` is not a rendered state.

## Why it is not resolved here

The values belong to the semantic vocabulary, not to any component. The Design System plan pins (**D15**) that a vocabulary gap is authored in a vocabulary Work Item rather than by the component that surfaced it — reaching for a local correction inside `Button` is precisely the drift the effort exists to remove. WI-4 therefore records this and changes nothing.

Resolution has two halves that must land together: correcting the dark theme's hover values so the boundary clears 3:1, and extending the contrast check's pairs to cover `--role-fill-<role>-hover` against every surface. Extending the check first would fail the suite on values that are not yet corrected; correcting the values first would leave the guarantee mechanically unenforced.

## Resolution

Both halves landed together and in that order — values first, then the check — so no commit left the suite red or the guarantee unenforced.

**The direction reversed for the dark theme.** A hover one step darker raises the boundary on a light ground and lowers it on a dark one; the defect was one rule serving two grounds. Dark now moves lighter, onto six half-steps solved along their own ramps, reaching **3.90–3.95** against `--surface-page` where re-tuning darker would have reached only 3.09–3.11. The light theme is untouched, because darker is the correct direction there.

**The `--surface-default` question is moot for hover.** The new values clear 3:1 against a raised surface too, at **3.44–3.48**. It survives only for the *resting* fills, two of which — `primary` at 2.95 and `success` at 2.91 — remain below the floor there. That is PR #549's recorded deferral and was not this Work Item's to close.

## What the corridor costs, and the lever it leaves

The corridor is narrow and the resting fills sit in the middle of it. A dark hover must clear 3:1 against the page (luminance ≥ 0.1243) while white still clears 4.5:1 on it (≤ 0.1833) — leaving 0.016–0.043 of luminance either way, and for `secondary` and `error`, whose resting fills already sit at 4.83 white-on, only 0.016 upward.

**What the corridor caps is luminance separation, not perceptibility — and the two part company.** Measured across the six, the luminance-only hovers separate from their resting fills by dE76 **8.9 / 1.2 / 6.6 / 3.6 / 2.1 / 6.8**. Two of them sit below ≈ 2.3, the point at which a difference becomes noticeable at all — and `error` was reported invisible from the running application before anyone measured it.

**For `error` the lever was applied.** Its corridor has room in neither direction: 0.016 of luminance before white drops under 4.5:1, and a darker step falls to 2.83 against a raised surface, giving a guarantee back to buy visibility. So chroma carries the state instead, at the same lightness — `--palette-red-600-vivid`, **dE76 17.4**, with 3.81 against the page, 4.74 white-on and 3.36 against a raised surface. It takes 600's number and a suffix because it is not a rung on the ramp.

**For `secondary` the same lever is not available.** Its resting fill is a near-neutral at chroma 8.6; adding chroma there does not make a more emphatic grey, it makes a colour — which changes what the role is rather than how it behaves. A compliant candidate does exist: `#7a6a99` matches the resting luminance exactly, a ratio of **1.001** with **dE76 ≈ 21.6**, compliant on every axis without being solved for any. But whether `secondary` stays neutral is a design decision, not an arithmetic one, and it is left open **deliberately**.
