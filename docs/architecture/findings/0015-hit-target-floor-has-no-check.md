# Finding 0015: The minimum hit target is an owned invariant that no check can see

> **Status:** Open
> **Date:** 2026-08-26
> **Affected areas:** `apps/web/src/shared/design-system/foundations/tokens/semantic/control-geometry.css`; every component in `apps/web/src/shared/design-system/components/`
> **Reported by:** Basel Ghonaim (surfaced while preparing the Design System for the authentication build, [#550](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/550))

## Observation

`--control-target-min` states the floor no interactive control may fall below — WCAG 2.5.8, a platform basis rather than a design choice — and [ADR 0010](../decisions/0010-design-system-platform-reestablishment.md) Decision 5 places the presentation-level accessibility contract under the system's ownership.

**Two components declare it. The rest satisfy it by arithmetic.**

| Component | Declares the floor | Clears it |
|---|---|---|
| `IconButton` | **yes** — and its smallest size *is* the floor | by declaration |
| `Checkbox` | **yes** | by declaration |
| `Button` | **no** — now yes, see below | incidentally, through its padding and line box |
| `Input` · `Textarea` · `FileInput` | no | by nature — a text field is never near 24 px |

Nothing is rendering too small today. The gap is that **nothing would say so if it were.** A button's height is the product of several independent values — `--control-padding-block-*`, the label style's line box, a border width — and any of them may be revised by work that has no reason to think about hit targets. Nothing connects that revision to this floor.

## Why no check closes it

The checks that hold this layer's other invariants all assert a **negative**: no stylesheet outside the composable declares a focus indicator; no key is declared under two axes; no reference resolves to nothing. A negative is decidable by reading the files.

This invariant needs a **positive**: *every interactive control declares the floor.* That requires knowing which components are interactive, which is a list — and a list of components maintained beside the components is the registry [Engineering Principles §3](../../development/engineering-principles.md) names as generalization machinery, kept alive by inertia and silently wrong the first time someone forgets to add to it.

This is the shape [Finding 0009](0009-checker-blind-to-hardcoded-literals.md) records for the literal prohibition: an owned rule that rests on review because the mechanical form would cost more than it caught. Recorded so a green suite is not read as coverage.

## What was done, and what was not

`Button` now declares the floor. It renders identically: measured in the browser, the smallest button's box sits well above 24 px while `min-block-size` resolves to exactly that, so the declaration cannot bind. This converts an accident into a statement and changes nothing a user sees.

`Input`, `Textarea` and `FileInput` were considered and left. Each is text-sized by construction and cannot approach 24 px; binding them would be insurance against a case that cannot arise, and a negative classification stated is a result rather than an omission.

## Relationship to [Finding 0014](0014-fileinput-icon-buttons-miss-the-focus-and-target-invariants.md)

That finding records *specific controls that are too small* — a defect in FileInput's icon buttons, largely resolved and still open for two of them. This one records that *nothing prevents the next one*. They are the instance and the class, and neither replaces the other.
