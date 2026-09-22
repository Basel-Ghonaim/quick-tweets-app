# Finding 0012: There is no shared stacking concept, so the z-index family named an order nothing had agreed

> **Status:** Open
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
- [Finding 0011](0011-breakpoint-tokens-unconsumable-mechanism.md) — the other family WI-9 removed, on different grounds.
