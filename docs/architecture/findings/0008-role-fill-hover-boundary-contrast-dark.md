# Finding 0008: The role fill's hover value drops the control boundary below 3:1 in the dark theme

> **Status:** Open
> **Date:** 2026-08-04
> **Affected areas:** `src/shared/design-system/foundations/theme/dark.css`, `src/shared/design-system/foundations/theme/tokenContrast.test.ts`
> **Reported by:** Basel Ghonaim (surfaced during the WI-4 review, PR #448)

## Observation

The fill family carries a resting value and a hover value per role (`--role-fill-<role>` and `--role-fill-<role>-hover`). A filled control's own background **is** its boundary against the surface behind it, so both values are subject to the 3:1 non-text contrast requirement (WCAG 1.4.11), which [ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 5 places under the system's ownership.

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

Reached in the product by `Button`'s `contained` variant, which binds `--button-bg-hover` to `--role-fill-<role>-hover` and renders it as both `background-color` and `border-color`. The Storybook accessibility run cannot observe it, because `:hover` is not a rendered state.

## Why it is not resolved here

The values belong to the semantic vocabulary, not to any component. The Design System plan pins (**D15**) that a vocabulary gap is authored in a vocabulary Work Item rather than by the component that surfaced it — reaching for a local correction inside `Button` is precisely the drift the effort exists to remove. WI-4 therefore records this and changes nothing.

Resolution has two halves that must land together: correcting the dark theme's hover values so the boundary clears 3:1, and extending the contrast check's pairs to cover `--role-fill-<role>-hover` against every surface. Extending the check first would fail the suite on values that are not yet corrected; correcting the values first would leave the guarantee mechanically unenforced.
