# Finding 0005: Declared-but-unimplemented field types need a future architectural review

> **Status:** Open (deferred — records the concern; does not schedule the fix). `textarea` resolved; `radio` and `select` remain.
> **Date:** 2026-07-12
> **Affected areas:** `src/shared/schema-form` (the `FieldType` union, the `SchemaField` seam), `src/shared/design-system`
> **Reported by:** Basel Ghonaim (surfaced during Work Item #249; `textarea` resolved in [#533](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/533))

## Observation

The schema-form engine's public `FieldType` union declares `radio`, `select`, and `textarea`, but the engine cannot render them: no design-system control exists for any of the three, and `radio`/`select` additionally have no way to declare their option list. These are treated as a deliberate **implementation gap in a library's public API**, not as API mistakes to prune — the union expresses the engine's intended vocabulary and must stay stable for consumers.

Work Item #249 addressed the *correctness and public-API* facets that did not depend on those missing controls (it typed `radio` correctly as a `string` Radio Group, wired `file-multiple` to the existing `FileInput`, fixed `isMatch`, and completed the validator extension point). It intentionally left the *rendering* of `radio`/`select`/`textarea` unimplemented, and made the `SchemaField` seam **fail fast** (throw a descriptive error) rather than silently render nothing. Turning those field types into working controls is deferred to a future architectural review.

## Resolution so far — `textarea` is supported; `radio` and `select` are not

`textarea` was resolved in [#533](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/533): a `Textarea` exists in the design system, and the seam renders it rather than throwing.

**It was separable from the other two, and the reason is the substance of this finding.** The review below was scoped because implementing these is *"not a mechanical addition"* — but the three did not share a blocker. `textarea` needed only a control. `radio` and `select` need a control **and** an `options` contract the schema does not carry, which is the public-API extension point 1 and 2 are about. So `textarea` could be wired without the design work the other two are still waiting on, and nothing in the seam's shape or the engine's types had to change to admit it: `FormChangeEvent` already included `HTMLTextAreaElement`, and `FormFieldConfig` already carried every member a multiline field needs.

**The finding stays `Open`.** Points 2 and 3 of the deferred concern below are untouched, and `radio` and `select` still throw.

## Evidence

Verified on `main` (2026-07-12), and superseded for `textarea` by the resolution above:

- `FieldType` declares `radio | select | textarea` alongside the rendered types (`src/shared/schema-form/types/schema.types.ts`).
- `SchemaField` has no control for them and now **throws** for `radio`/`select`/`textarea` (`src/shared/schema-form/components/SchemaField/SchemaField.tsx`), with a compile-time exhaustiveness guard for any future-declared type.
- The design system exposes only `Button`, `Checkbox`, `FileInput`, `Input` — no `RadioGroup`, `Select`, or `Textarea`.
- `FormFieldConfig` has no `options` field, so an option list cannot be declared for `radio`/`select` (`src/shared/schema-form/types/schema.types.ts`).

## The deferred architectural concern

Implementing `radio`/`select`/`textarea` is **not** a mechanical addition; it requires an architectural review covering, at minimum:

1. **The `SchemaField` seam design** for option-based and multiline controls — how the type→control mapping extends without eroding the seam's isolation role.
2. **The `options` contract** — how option lists are declared on `FormFieldConfig`, typed, and inferred into the payload type (a public-API extension to the schema).
3. **The responsibility boundary** between `schema-form` (the seam) and the `design-system` (the concrete `RadioGroup` / `Select` / `Textarea` controls), consistent with the one-directional relationship established in [Finding 0001](../resolved/0001-schema-form-design-system-cycle.md).

## Principle / boundary

- **Don't invent the future / one owner** — the field types remain in the public API (an implementation gap), while the *controls* remain the design system's responsibility; neither is designed speculatively here.
- **Seam isolation** — the engine deals only in field types; the `SchemaField` seam owns the type→control mapping (see [`forms.md`](../../../frontend/forms.md)). Extending it for option/multiline controls must preserve that boundary.

## Resolution direction (not scheduled)

A future architectural review — followed by a dedicated Feature Work Item — should settle the three points above and then build the controls and wire the seam. **No design or implementation is proposed here**; this finding only records the deferred concern so it is not lost.

## Links

- Correctness / public-API facets delivered in [Issue #249](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/249).
- Seam ownership and the intended one-directional `schema-form → design-system` relationship: [`frontend/forms.md`](../../../frontend/forms.md), [`frontend/design-system/`](../../../frontend/design-system/README.md), and [Finding 0001](../resolved/0001-schema-form-design-system-cycle.md).
