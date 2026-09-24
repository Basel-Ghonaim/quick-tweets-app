# Finding 0011: The breakpoint family's mechanism cannot be consumed in a media query

> **Status:** Open
> **Date:** 2026-08-10
> **Affected areas:** the removed `foundations/tokens/primitive/breakpoints.css`; the media queries in `src/modules/auth/**`
> **Reported by:** Basel Ghonaim (surfaced while preparing WI-9)

## Observation

`breakpoints.css` declared five CSS custom properties (`--breakpoint-xs` … `--breakpoint-xl`). **A custom property is not valid inside a media-query condition** — `@media (max-width: var(--breakpoint-md))` does not work, by specification: custom properties resolve at computed-value time, and media conditions are evaluated before that.

The values were therefore unreachable by the only consumers that would want them. The three breakpoints written in the application are `480px`, `768px` and `1024px` — exactly `--breakpoint-xs`, `--breakpoint-md` and `--breakpoint-lg` — and they are hardcoded because they **could not** be otherwise.

**This is a statement about the mechanism, not about breakpoints.** Breakpoint values are perfectly consumable; a CSS custom property is simply the wrong carrier for one. Valid mechanisms exist:

- **build-time custom media** (`@custom-media --md (min-width: 768px)`), resolved by PostCSS before the browser sees it;
- **application-level responsive constants** in TypeScript, consumed through `matchMedia` where the decision is behavioural rather than stylistic;
- a **preprocessor variable**, if the project ever adopts one.

## Why it was removed rather than fixed

Removal is not because nothing consumed it — **an unconsumed family is not an unfinished family**, and consumer count is evidence rather than a gate. Two things together decided it:

1. **The mechanism was invalid**, so the family could not have been adopted even by a consumer that wanted it.
2. **There is no responsive design to own it.** Elevation is named among the token types [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 3 governs; breakpoints are not, and responsive work is a standing non-goal across the effort. The three values in the tree belong to prototype markup, which is not design authority.

Choosing a mechanism *and* a scale with neither a design nor a consumer would have been authoring vocabulary from nothing.

## When to reconsider

**When a real responsive design appears, together with a valid consumption mechanism.** At that point the questions are, in order: which layer owns responsive decisions, what mechanism carries them, and only then what the scale should be. Nothing here forecloses a breakpoint system — it records that the previous one could not be used and had no owner.

## Update — 2026-09-03

**The three values the Observation names are gone.** `480px`, `768px` and `1024px` belonged to the prototype auth design, which has been removed; the module now writes only `72rem` and `36rem`, and a check holds every stylesheet in it to those two.

**The mechanism question is untouched, which is why this stays `Open`.** Half of the reconsideration condition is now met — a real responsive design exists — and the other half is not: those two widths are still literals repeated across stylesheets, held by a check rather than carried by any valid token mechanism. The finding's subject was always the mechanism, not the values.

## Related

- [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 2 — consumer count is evidence, never a gate; what is admitted is a shared concept.
- [Finding 0012](../resolved/0012-no-shared-stacking-concept.md) — the other family WI-9 removed, on different grounds.
