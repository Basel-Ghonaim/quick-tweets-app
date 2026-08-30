# Finding 0020: Named colour distinctions the values do not make

> **Status:** Open
> **Date:** 2026-08-30
> **Affected areas:** `apps/web/src/shared/design-system/foundations/resolution/theme/light.css`; `.../dark.css`; `.../vocabulary.ts`
> **Reported by:** Basel Ghonaim (surfaced while moving the text tones into the shared vocabulary, [#581](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/581))

## Observation

Two separate places name a distinction that the resolved values do not make, so a consumer can choose between two things that render identically and no check can tell them they did nothing.

**`--text-tertiary` and `--text-muted` are the same colour in both themes.**

```css
/* light */                        /* dark */
--text-tertiary: mauve-500;        --text-tertiary: mauve-400;
--text-muted:    mauve-500;        --text-muted:    mauve-400;
```

The vocabulary names four non-accent tones; the language has three. `Typography` offers both, so a caller picks between them believing the choice means something.

**`--role-on-surface-primary` and `--text-accent` converge in the dark theme**, both resolving to `--palette-violet-400`. A ghost primary `Button` and a `standalone` `Link` therefore render in the identical colour while meaning different things — one acts, one navigates.

This one used to hold in light as well. [#580](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/580) moved the light accent into a contrast corridor, so light now reads `violet-700` against `violet-575`. **The convergence was half-resolved as a side effect of unrelated work, which is the clearest sign nothing was watching it.**

## Why it matters

`tokenContrast` measures every one of these tokens against surfaces, and each passes on its own. Contrast is the wrong instrument for this: it asks whether a colour is legible, never whether two colours that mean different things look different. So if one of a converged pair moved, the check would stay green and the only witness would be someone noticing by eye.

The cost is not a rendering fault today — both pairs render legibly. It is that the vocabulary makes a promise the values do not keep, and [ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 2 admits a token because it **names a shared design concept**. A name whose concept has no distinct value is a token that has stopped earning its admission.

## Why it is not resolved here

Both are design decisions rather than defects, and neither belongs to the Work Item that found them.

- **`tertiary` / `muted`** resolves one of three ways: give them distinct values, retire one and migrate its callers, or record that they are deliberately equal today and expected to diverge. Only a design settles which — the same rule [foundation.md](../../frontend/design-system/foundation.md) applies to granularity.
- **The dark convergence** may be correct. Two interactive affordances sharing one accent is a defensible language decision; what is not defensible is arriving at it by accident and keeping it by inattention.

A check is conceivable — a pairwise minimum separation between tokens that are supposed to differ — but no such rule has ever been stated, and [foundation.md](../../frontend/design-system/foundation.md) reserves a check for a rule whose failure has been observed. The failure here is a naming claim, not a rendering one, and the rule would have to be written before it could be enforced.
