# Finding 0017: Icon mirroring has no rendered proof

> **Status:** Resolved
> **Date:** 2026-08-26
> **Affected areas:** `apps/web/src/shared/design-system/foundations/composition/iconMirror.module.css`; `apps/web/src/shared/design-system/icons/Icons.stories.tsx`
> **Reported by:** Basel Ghonaim (surfaced while giving icons a way to declare mirroring, [#550](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/550))
> **Resolved:** [#552](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/552) — a story renders a mirroring glyph beside a non-mirroring one and asserts the computed transform of each under both directions. It became writable once the direction signal existed to switch.

## Observation

The layer's verification model gives rendered behaviour to Storybook and mechanical rules to the checks. Icon mirroring has neither.

It was verified — the glyph computes to `none` under `ltr` and `matrix(-1, 0, 0, 1, 0, 0)` under `rtl`, and the rule ships in the bundle that draws it — but by a temporary probe that was reverted. **Nothing in the repository re-establishes that.** The mechanism is one CSS rule and one declaration, and either could be removed or renamed with every gate staying green.

## Why it is not resolved here

A story is the right home, and the layer already uses that idiom: the violet work proved role relationships by rendering them rather than asserting them. It was left out because the Work Item's scope was the mechanism, and a story is a deliberate addition rather than something to slip in.

A **check** is separately not warranted yet, on the layer's own terms: a rule earns one once its failure has been observed, and nobody has rolled their own flip because until now there was nothing to flip.

## What closes it

One story that renders a mirroring glyph, flips the document's direction, and asserts the computed transform on each side — plus a non-mirroring glyph asserted unchanged, so the story proves the declaration is doing the work rather than the direction alone.
