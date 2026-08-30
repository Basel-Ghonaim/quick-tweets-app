# Finding 0021: The token-reference check sees interpolation only where it is spelled `color`

> **Status:** Open
> **Date:** 2026-08-30
> **Affected areas:** `apps/web/src/shared/design-system/foundations/tokenReferences.test.ts`
> **Reported by:** Basel Ghonaim (surfaced while giving `Link` a tone, [#581](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/581))

## Observation

`tokenReferences` exists because a component can build a token name by string interpolation, where a rename resolves to an undefined custom property at runtime with no compile-time or lint failure. Its own header states the reason: *"the compiler cannot be the safety net, so this check is."*

It matches interpolated references with one pattern:

```ts
const INTERPOLATED_REF = /var\(\s*(--[\w-]*?)\$\{color\}([\w-]*)\)/g;
```

The interpolated expression is matched **literally, as the identifier `color`**. Every component that builds a token name today happens to name that variable `color`, so the check has always appeared to work. Any other name is not expanded with the wrong domain — it is **not seen at all**.

## Evidence

Proved in both directions while choosing how `Link` should resolve its tone:

- `` `var(--text-${tone})` `` — the natural spelling, and the shape `Button` uses for roles — was injected and the check **passed**. It sees no reference there, so a rename of `--text-muted` would break the component silently, which is the exact failure the check was built to prevent.
- A **literal** `"var(--text-nonexistent)"` was injected and the check **failed**, naming the file and line.

So the check's coverage depends on a variable's name rather than on the shape of the code.

## Why it matters

The gap is invisible from both ends. A component author writing `${tone}`, `${size}` or `${variant}` gets a green check and reasonably concludes the reference is verified. A reader of the check sees a pattern that looks general. Nothing reports the difference.

It is also self-concealing: the more the layer's vocabulary grows beyond role — tone is the first, and it will not be the last — the more references quietly leave the check's view, while the check's pass rate stays at 100%.

## What was done instead, and what was not

`Link` resolves its tone through written-out references rather than a built name, so every one of them is checked. The reason sits at the code, pointing here.

That is a workaround at one call site, not a fix. It also does not scale: the layer chose interpolation for roles precisely because writing six literals per property is worse, and a vocabulary large enough to want interpolation is exactly the case this check cannot follow.

The fix is the check's, and it is not obvious. Matching any `${…}` would require knowing which domain to expand with — the pattern currently hardcodes both the variable name *and*, through `ROLES`, the value set. Making it general means letting a reference declare its domain, or expanding with the union and accepting that a reference passes when any domain resolves, which is **weaker** than what is enforced today. Neither is a change to make while implementing a component.
