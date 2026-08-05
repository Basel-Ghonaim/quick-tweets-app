# Finding 0009: The token-reference checker is blind to hardcoded literals

> **Status:** Open
> **Date:** 2026-08-05
> **Affected areas:** `src/shared/design-system/foundations/tokenReferences.test.ts`
> **Reported by:** Basel Ghonaim (surfaced during WI-4A, Issue #453)

## Observation

The checker ([ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 3's mechanical net, D12/D13) resolves `var(--…)` references and fails on any that name a Design Token yet resolve to no definition. That is one half of the binding rule **I1**. The other half — *never a hardcoded value* — it cannot see: a literal is not a reference, so `opacity: 0.6`, `transition: … 0.2s`, `color: #ffffff` or `padding: 8px` in a component pass the checker untouched. The net proves that the references which *are* present resolve; it says nothing about the values that were written instead of a reference.

[ADR 0011](../decisions/0011-intent-layer-earned-not-assumed.md) already records that the checker cannot tell a scale position from an intent, so the *tier* half of I1 is review-enforced. This finding records the adjacent, older gap: the *literal-prohibition* half is review-enforced too, and always has been. Both halves of I1 rest on human review; only reference-resolution is mechanical.

## Evidence

The gap is not hypothetical — it has hidden shared vocabulary in plain sight:

- **WI-4A, by manual grep.** `opacity: 0.6` for the disabled state was found duplicated across four components (Button, Checkbox, Input, FileInput) and `transform: scale(0.98)` for the press across two — a shared meaning with no owner, the same shape as the fill/on-surface split. The checker had been and stayed green with every one of those literals present. They were found only because someone grepped.
- **WI-4, earlier.** Button's on-fill text was a hardcoded `#ffffff` that the checker never flagged; it was removed by inspection during the migration, not by a failing test.
- **WI-4A, deliberately retained.** Button still holds `1.25em` (icon-to-text ratio), `100%` (full width) and `rotate(360deg)` (the spin target). These are correctly left as literals — they belong to no token family — but the checker is equally blind to them, and cannot make the distinction either way.

## Why it is not resolved here

A literal-scanning check is a *different* mechanism, not an extension of this one. Its hard part is not matching literals — it is deciding which literals are violations: a design-family magnitude that should bind a token (`8px`, `0.2s`, a hex) versus an intrinsic or structural value that must not (`1.25em`, `100%`, `360deg`, `opacity` where no token family is earned). That distinction is the same per-family judgement ADR 0011 makes, and a regex cannot make it.

Per **D19** and the effort's scope, no new check tier is introduced under the momentum of a component migration. This is recorded so the blind spot is visible rather than assumed closed by a green checker; building the check, if it is built, is its own effort with its own review.
