# Finding 0022: A `-subtle` fill is a composite, so no token check measures the pair it forms

> **Status:** Open
> **Date:** 2026-09-02
> **Affected areas:** `apps/web/src/shared/design-system/foundations/resolution/theme/light.css`; `.../dark.css`; `.../tokenContrast.test.ts`; `apps/web/src/shared/design-system/foundations/tokens/primitive/palette.css`
> **Reported by:** Basel Ghonaim (surfaced while giving the auth message region its fill, [#618](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/618))

## Observation

Every `--role-fill-<role>-subtle` is a tenth-alpha overlay — `--palette-<hue>-a10`. It therefore has no resolved value of its own: what a reader sees is the wash composited over whatever surface is behind it.

`tokenContrast` compares **token against token**. Handed a translucent fill it would compare the wash's own RGB, not the colour the page renders, so the pair is not among the ones it asserts and cannot be. The check stays green while the rendered pixels miss the floor.

**Measured across every role, on-surface text over its own `-subtle` fill**, composited on `--surface-default` and `--surface-page`:

| Role | Light (card · page) | Dark (card · page) |
|---|---|---|
| `primary` | 6.54 · 6.27 | **4.25** · 4.86 |
| `secondary` | 6.68 · 6.42 | 9.82 · 11.21 |
| `success` | 4.99 · 4.83 | 7.87 · 9.02 |
| `warning` | 4.65 · **4.49** | 8.02 · 9.23 |
| `error` | **4.13** · **3.98** | 5.40 · 6.11 |
| `info` | 4.62 · **4.44** | 5.55 · 6.35 |

Four of the twelve role/theme combinations miss 4.5:1, and three of them miss it by less than a hundredth — the margin that makes a defect invisible to the eye and permanent in the code.

## What was fixed, and what was not

**`error` in light was resolved where it was found.** `--role-on-surface-error` moved from `--palette-red-600` to `--palette-red-700`, which reads **5.54:1** on the card and **5.34:1** on the page, and lifts the same token on every plain surface too — including `--surface-subtle`, where `red-600` measured **4.40:1** and nothing asserted it.

Three consumers already paired that text with that fill and shared the defect: the auth message region, the current design's form error, and `FileInput`'s rejection state — the last inside the Design System.

**`info` in light was resolved the same way, and for the same reason.** The recovery screens gave the role its first consumer — a neutral confirmation over its own `-subtle` fill — and the rendered accessibility run reported **4.44** on the page, reproducing this finding's own measurement. `--role-on-surface-info` moved to `--palette-blue-700`, the step named below.

**The other two are recorded, not fixed.** They belong to no Work Item that has met them:

- `warning` in **light** needs one darker step, and `--palette-amber-800` already exists.
- `primary` in **dark** has no lighter step to move to — `--palette-violet-400` is the lightest violet the scale carries — so resolving it means minting a palette step, which is a design decision rather than a correction. It also sits beside [Finding 0020](0020-named-colour-distinctions-the-values-do-not-make.md)'s record of `--role-on-surface-primary` and `--text-accent` converging in that theme.

## Why no check closes it here

A check asserting the composite would fail on `main` for those two, so it cannot ship before their values are decided — and deciding them is the design call this finding declines to take on their behalf.

The rendered accessibility run **does** see the composite, and is what caught this: axe reported `4.13` for the exact pair, independently reproducing the arithmetic. But it only sees pairs some story actually renders, and it is promoted to `error` on the auth screens alone — everywhere else it reports and passes.

Two gaps are therefore live: the token check cannot see a composite, and `--surface-subtle` is not among the grounds `tokenContrast` asserts against at all.

## Not decided here

Whether the composite pair becomes an asserted one, whether the three remaining values move, and whether a palette step is minted for dark `primary`.
