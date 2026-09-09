# Finding 0024: The message region enters the Design System without meeting the layer's authoring conventions

> **Status:** Open
> **Date:** 2026-09-09
> **Affected areas:** `apps/web/src/shared/design-system/components/feedback/MessageRegion/`; `apps/web/src/shared/design-system/components/classReferences.test.ts`
> **Reported by:** Basel Ghonaim (surfaced while admitting the component to the layer, [#679](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/679))

## Observation

`MessageRegion` is admitted to the layer as an **interim standing in for `Alert`**, which the product has committed to and which does not exist. The admission is deliberate; what follows is what came with it. Measured against `Spinner`, its sibling in the same category, it departs from the [authoring contract](../../frontend/design-system/components.md) in four ways.

**Prop vocabulary.** It declares its own `MessageTone` union and takes `children`, rather than extending the native element and importing from the shared contract. `Spinner` is `NativeProps<"span"> & Pick<ControlProps, "color">`; this component shares none of that surface, so a consumer cannot pass an id, a class, or any native attribute through it.

**Ref and identity.** It forwards no ref and sets no display name. The convention exists so a caller can reach the element the component owns; nothing here can.

**Styling.** It assembles its class list by template-literal concatenation rather than through the layer's shared `classNames` helper — the one place the convention says class lists and custom-property merges go, so that the rule is written once.

**The class-reference check cannot see two of its three classes.** `classReferences` exists to catch a stylesheet rename that misses a call site — the failure it names as *"invisible to every other gate we have."* It matches `styles.x` and ``styles[`x`]``. This component indexes with a bare identifier, `styles[tone]`, which matches neither pattern. `.error` and `.info` are therefore inside the layer and unchecked: renaming either in the stylesheet would render the element unstyled, silently, with every gate green.

## Why it is not fixed here

The Work Item that admits the component was scoped to the admission and its evidence. Bringing it up to the conventions changes its public shape — a props interface a consumer sees, a forwarded ref, a different class composition — and that is authoring work on a component whose eventual form is `Alert`'s, not a correction to a move.

The class-reference gap is the one item here that is not about this component at all. It is a limitation of the check, of the same family as [Finding 0009](0009-checker-blind-to-hardcoded-literals.md) and [Finding 0021](0021-token-reference-check-sees-one-interpolation-name.md) — an owned rule the mechanism cannot fully see. Whether the check learns to read a dynamic index, or components are required not to use one, is a decision about the check rather than about its first subject.

## Affected

- The component itself, on all four counts.
- Any component admitted later that indexes its styles dynamically, on the fourth.

## Not decided here

Whether the component is brought up to the conventions or replaced by `Alert` when that is designed; and whether the class-reference check is widened or the pattern it cannot read is disallowed.
