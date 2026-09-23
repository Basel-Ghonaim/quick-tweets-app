# Finding 0040: The browser lane certifies one engine and no real input, while the guarantees it is cited for claim both

> **Status:** Open
> **Date:** 2026-09-23
> **Affected areas:** `apps/web/vite.config.ts` (the `storybook` and `storybook-rtl` projects); every component whose guarantee rests on a platform behaviour
> **Reported by:** Basel Ghonaim (surfaced while building Menu and Dialog on the platform's own overlays, [#812](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/812))

The browser lane exists because some things *"cannot be true without"* a browser ([testing topology](../../../development/testing-topology.md)). Two limits on what it can actually observe were found together, and they matter more now that components are built on platform primitives rather than around them.

## Observation 1 — one engine

`vite.config.ts` runs both lane projects on **chromium alone**, and no `browserslist` is declared anywhere in the workspace. A guarantee proved there is proved in one engine.

That was tolerable while the layer's behaviour was its own CSS and its own JavaScript, which do not differ much between engines. It is a sharper limit now: `popover`, `<dialog>.showModal()`, the top layer, `inert` and `::backdrop` are **platform** behaviours, and an engine is exactly the axis along which they vary.

## Observation 2 — no real input

A simulated key event does not trigger the behaviours a user agent reserves for real input. Two were met directly:

- **A popover's own dismissal on Escape** does not fire for a dispatched `keydown`.
- **Tab does not move focus.** The testing library computes its own tab order instead, so a story that walks Tab through a modal dialog reports *that model* of a focus trap rather than the browser's.

Both were worked around rather than left: `Menu` and `Dialog` close on Escape themselves, so the guarantee is theirs and provable; and the dialog's focus trap is proven from outside — nothing behind it can take focus, even when asked directly — rather than by walking Tab.

**The workarounds are sound, and they are not the finding.** The finding is that *which* guarantees the lane can certify is decided by these limits rather than by what matters, and nothing records that. An author reading a green lane cannot tell which of its claims were observed and which were modelled.

## Why it is recorded rather than fixed

Adding an engine to the lane is a change to lane infrastructure with its own cost and its own contract — a second browser doubles a run that is already the slowest gate and is not CI-gated at all. Whether real-input behaviours get a lane of their own, or stay deliberately out of scope, is the same kind of decision. Neither belongs to a Work Item that was scoped to three components.

This is the family [Finding 0032](0032-a-check-on-lane-infrastructure-has-no-lane.md) already names, and the same shape as [Finding 0009](0009-checker-blind-to-hardcoded-literals.md) and [Finding 0024](0024-message-region-enters-the-layer-below-its-conventions.md): an owned rule the mechanism cannot fully see.

## Affected

- Every component built on a platform overlay — today `Menu` and `Dialog`.
- Any later guarantee that rests on a user agent's own behaviour rather than on the layer's code.

## Not decided here

Whether the lane gains a second engine, whether real-input behaviour earns a lane of its own, and whether a component may rest a guarantee on a platform behaviour it cannot prove.
