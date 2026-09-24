# Finding 0012: There is no shared stacking concept, so the z-index family named an order nothing had agreed

> **Status:** Resolved — 2026-09-24. The condition below was met and answered: `foundations/tokens/semantic/layer.css` names the complete order the approved designs settled, in [#809](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/809). See the update at the end.
> **Date:** 2026-08-10
> **Affected areas:** the removed `foundations/tokens/primitive/z-index.css`
> **Reported by:** Basel Ghonaim (surfaced while preparing WI-9)

## Observation

`z-index.css` declared three tokens named for components that do not exist. Meanwhile every real `z-index` in the tree is **local stacking inside its own context**:

| Where | What it stacks |
|---|---|
| `LeftPanel` | its content above its own decorative orbs |
| `AuthTabs` | its labels above its own sliding pill |
| `FileInput` | its overlays above its own previews |

**None of them competes with another for position.** Each sits inside a positioned ancestor and orders only its own children — which is exactly what `z-index` is for, and needs no shared vocabulary. A global layer scale settles one question: *when two independent floating things overlap, which wins.* Nothing in the codebase asks it.

## Why it was removed rather than kept

Not for having no consumers — **an unconsumed family is not an unfinished family.** Two reasons:

1. **No shared concept exists to name.** A stacking order is only meaningful as a *complete relative sequence*: which layers exist, in what order, is the whole content of the decision. Naming three of them is asserting an ordering nobody has agreed.
2. **Granularity, not role.** [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 2's second limit admits roles and refuses granularities — `--type-heading` is a role, `--type-heading-{1..6}` is a claim about the product. A layer scale is entirely the second kind.

The roadmap makes Tooltip, Menu and Dialog approved components, which looks like *named commitment*. It is not sufficient here: the commitment names the components, not the order they stack in, and the order is the only thing the vocabulary would carry.

## Update — 2026-09-03

**Two of the three sites in the table above no longer exist.** `LeftPanel` and `AuthTabs` belonged to the prototype auth design, which has been removed. The module's remaining `z-index` declarations — the shell's page layer over its own backdrop — are the same kind the table describes: local ordering inside one positioned context, competing with nothing.

The conclusion is unchanged, and so is the status: **nothing in the codebase yet asks which of two independent floating things wins.**

## When to reconsider

**When two independent floating components must stack against each other** — a menu inside a dialog, a tooltip over a toast. The first pair to genuinely conflict establishes the order, and it will be an order derived from real overlap rather than one guessed in advance. Local stacking inside a component's own context never needs it.

## Related

- [ADR 0010](../../decisions/0010-design-system-platform-reestablishment.md) Decision 2 — roles are admissible, granularities are not.
- [Finding 0011](../open/0011-breakpoint-tokens-unconsumable-mechanism.md) — the other family WI-9 removed, on different grounds.

## Update — 2026-09-24 · Resolved

**Both objections were answered rather than set aside.**

*No shared concept existed.* One does now, and the designs are where it came from: a menu over a sticky header, a dialog over both, a confirmation over the dialog asking it, and a toast over all of them. That is the *complete relative sequence* this finding said was the whole content of the decision.

*Granularity, not role.* The family names roles — sticky, floating action, menu, dialog, confirmation, toast — not positions on a scale. A layer scale remains refused; what shipped is the thing this finding said would be admissible when it existed.

**What the resolution also established**, and is easy to miss: three of the six layers name surfaces the browser raises into its own top layer, where `z-index` does not reach. The order therefore governs what the page positions itself, and the family stays complete rather than consumed. The [Foundation contract](../../../frontend/design-system/foundation.md) owns that statement.

The local stacking this finding described — a component ordering its own children inside its own positioned context — still binds none of it, exactly as recorded above.
