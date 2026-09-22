# Finding 0021: The token-reference check sees interpolation only where it is spelled `color`

> **Status:** Resolved — 2026-08-30, [#585](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/585)
> **Date:** 2026-08-30
> **Affected areas:** `apps/web/src/shared/design-system/foundations/tokenReferences.test.ts`
> **Reported by:** Basel Ghonaim (surfaced while giving `Link` a tone, [#581](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/581))

## Observation

`tokenReferences` exists because a component can build a token name by string interpolation, where a rename resolves to an undefined custom property at runtime with no compile-time or lint failure. Its own header states the reason: *"the compiler cannot be the safety net, so this check is."*

It matches interpolated references with one pattern:

```ts
const INTERPOLATED_REF = /var\(\s*(--[\w-]*?)\$\{color\}([\w-]*)\)/g;
```

The interpolated expression is matched **literally, as the identifier `color`**. Any other name is not expanded with the wrong domain — it is **not seen at all**.

**This was deliberate, and the code said so:** *"pinned to the `color` identifier, because … an interpolation of any other prop would be expanded into role names that were never meant to exist and reported as undefined."* With one vocabulary in the language, a silent miss was the lesser evil against guaranteed false failures on every other prop. The trade was sound when it was made.

What invalidated it was a second vocabulary. `TONES` arrived, and a check that can follow only one of two is no longer choosing between a false positive and a false negative — it is blind to half the language.

## Evidence

Proved in both directions while choosing how `Link` should resolve its tone:

- `` `var(--text-${tone})` `` — the natural spelling, and the shape `Button` uses for roles — was injected and the check **passed**. It sees no reference there, so a rename of `--text-muted` would break the component silently, which is the exact failure the check was built to prevent.
- A **literal** `"var(--text-nonexistent)"` was injected and the check **failed**, naming the file and line.

So the check's coverage depends on a variable's name rather than on the shape of the code.

## Why it matters

The gap is invisible from both ends. A component author writing `${tone}`, `${size}` or `${variant}` gets a green check and reasonably concludes the reference is verified. A reader of the check sees a pattern that looks general. Nothing reports the difference.

It is also self-concealing: the more the layer's vocabulary grows beyond role — tone is the first, and it will not be the last — the more references quietly leave the check's view, while the check's pass rate stays at 100%.

## Resolution

The pattern now matches any expression, and a small table says which vocabulary each one expands over. Every member of the named vocabulary must still resolve, so the strictness the original pinning protected is unchanged rather than traded away.

The part that closes the finding is the case that used to be silent: **an expression naming no known vocabulary is reported**, with its file and line. That inversion is what lets the table be registered on demand rather than in advance — an author reaching for a vocabulary missing from it is told, where a pre-filled table would have guessed.

Expanding with the union of every vocabulary and passing when *any* resolves was considered and rejected: it would have been weaker than what was already enforced.

`Link`'s written-out map — the workaround this finding named — is retired, and its tone is built like every other reference in the layer. That conversion is also the proof: the same mutation that passed silently before now names all five tone members, with the file and line they came from.
