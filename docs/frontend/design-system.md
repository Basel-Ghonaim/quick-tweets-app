# Frontend Design System

> **Status:** Active.
> **Authority:** The authoritative source for the frontend **design-system conventions** — the design-token model, theming, the component-authoring pattern, the variant model, and how the system is organized. It owns the **rules**, not a component catalog: it never documents individual components (`Button`, `Input`, …) prop-by-prop. It does **not** own schema-driven **form binding** and the `SchemaField` seam (the [frontend forms](forms.md) document), the app layout (the [frontend architecture](architecture.md)), or the design **principles** these conventions apply ([Engineering Principles](../development/engineering-principles.md)).
> **Scope:** The shared UI foundations and components in `src/shared/design-system/`.
> **Maturity:** This document describes the **currently implemented** design-system conventions. It covers only what exists today and will expand as the system grows; anything not described here is **not yet a stabilized convention** — either not yet built, or present but not yet settled enough to document — and is **not** something the architecture has rejected.
> **Version:** 1.1
> **Last Updated:** 2026-08-05
> **Owner:** Basel Ghonaim

## Design tokens

All visual values are **CSS custom properties**, defined under `foundations/tokens/` (colors, typography, spacing, border, shadow, transitions, breakpoints, z-index) in three tiers:

- **Primitives** — raw scales (`--blue-500`, `--gray-200`, `--font-size-base`). Never consumed directly by components.
- **Semantic role tokens** — map a role to primitives across a fixed palette of six roles (`primary`, `secondary`, `success`, `warning`, `error`, `info`), each exposing `…-primary`, `…-secondary`, and `…-alpha` (e.g. `--color-primary-primary`, `--color-error-alpha`).
- **Theme-scoped tokens** — surfaces, text, and border values that change with the theme (`--color-surface`, `--color-text-primary`, `--color-border`).

**The rule:** components reference **semantic** tokens, never primitives and never hard-coded values; new values are added as tokens in the appropriate `foundations/tokens/` file. This keeps every component themeable and consistent by construction.

## Theming

Theme values live in `foundations/theme/`. **Light is the default**, defined on `:root`; **dark** overrides the theme-scoped tokens under `[data-theme="dark"]`. Switching themes is therefore setting a single `data-theme` attribute on a root element — no component code participates.

**The rule:** theme-dependent values live only in the theme layer; a component **never branches on the theme**, it consumes the theme-scoped tokens and re-themes for free.

## Component-authoring convention

Every component follows the same shape, so a new one is predictable to build and to consume:

- **File layout** — one folder per component: `Component.tsx`, `Component.types.ts`, `Component.module.css`, `Component.stories.tsx`, and an `index.ts` barrel. Beyond those, a responsibility earns a directory at its **second** member and stays a flat, self-describing file below it: `hooks/`, `parts/` (internal sub-components, never exported), `variants/`, `constants.ts`. A folder is never created empty in anticipation.
- **Grouping** — components sit under the anatomy they belong to: `controls/`, `fields/`, `display/`. Categories are created when something populates them, and Storybook titles follow the same taxonomy so the code and the catalogue never disagree.
- **Ref & identity** — `forwardRef` to the underlying native element, with an explicit `displayName`. Where a component owns the element and its internals need it, the ref is **published** with `useImperativeHandle` rather than cast — `forwardRef` may hand over a callback ref, and casting one fails silently.
- **Styling** — **CSS Modules** for static rules; **runtime CSS custom properties** for the token-driven parts. The root class is `.root`; the rest are `variant-*`, `size-*`, and `is*` state flags. Class lists are composed with the shared helper, and custom properties are merged with the caller's `style` through the shared typed helper rather than cast at each call site.
- **Prop vocabulary** — declared once and imported, never redeclared: the role scale and the control sizes come from the foundations, and the prop contract adds `isInvalid` / `isLoading` plus the field's `label`, `errorMessage` and `helperText`. Props **extend the native element**, with the attributes the vocabulary shadows omitted **once** in the shared contract. `disabled` is never redeclared — it belongs to the element.
- **Variant props** — a component whose variants take different props is a **discriminated union** on `variant`, so a prop belonging to one variant cannot be passed with another.
- **Accessibility** — the field's ids and its `aria-describedby` are **derived by the shared hook**, so a component cannot render a message without associating it. Validity is exposed via `aria-invalid`; error text is announced with `role="alert"`. Where a native control is visually replaced, the real control stays present and accessible.

**The rule:** a new component adopts this layout, ref pattern, styling approach, prop vocabulary, and accessibility baseline; departures are deliberate exceptions, not new defaults.

## Component anatomy

Two structures, composable rather than nested — the second is not the first's inner detail.

- **Adorned Control** — *prefix · control · suffix*. A control flanked on the **inline axis** by affordances whose composition it owns. A caller supplies a node per side and never a layout, so supplying one can never displace an affordance the control composes itself.
- **Field** — *label · control slot · description · error*, together with the wiring that associates them. The association is derived, not remembered: a field cannot render a message without linking it.

An **Adorned Field** is a Field whose control is an Adorned Control. The two are independent — `Button` is an Adorned Control and **not** a Field, carrying leading and trailing affordances with no label, description or error.

**The boundary.** Prefix and suffix are positions on the **inline axis**. A block control whose affordances sit at an edge — a counter beneath, a resize handle in a corner — is not an Adorned Control, and widening the shape to admit one is how a superset of every consumer's needs gets built instead of a contract.

**This is vocabulary, not structure.** No shared adornment component exists: one would be structure with a single consumer, and what its contract should be is something a real second consumer settles.

## The variant model

When a component has **materially different interaction modes**, it is built as a **shell + variants**:

- the **shell** owns the cross-variant concerns (label, error/helper rendering, id generation) and selects a variant;
- each **variant** lives in its own `variants/<name>/` folder (with its own hook and sub-components) and implements a **single shared props contract** (`BaseVariantProps`) supplied by the shell;
- because every variant satisfies the same contract, the shell treats them uniformly and a new variant slots in without changing the shell (Liskov substitution).

This pattern is a design-system convention, not the property of any single component; it is currently applied in one component. The specific variants and their options are implementation, not convention, and are not catalogued here.

## Icons

Icons are a uniform, interchangeable set: every icon accepts the same `IconProps` (`size`, `color`, `strokeWidth`, `className`) and applies shared `ICON_DEFAULTS` (size `24`, `color: "currentColor"`, `strokeWidth: 2`). They render as stroke-based SVGs that inherit the surrounding text color via `currentColor`.

**The rule:** a new icon implements `IconProps` and the shared defaults, so any icon can replace another without changing the consumer (Liskov substitution).

## Organization & public API

The system is organized by responsibility: `foundations/` (the token tiers, the resolution axes, and the language's enumerated scales), `components/` (grouped by anatomy, with the contract and helpers every component shares under `components/shared/`), and `icons/`.

**The barrels are the only public surface.** Everything inside a component — variant folders, hooks, parts, helpers — is private implementation. A consumer imports the design-system root and nothing deeper, and the layer never imports itself through its own alias.

**Three checks keep this true rather than merely stated:**

- Every `styles.x` a component reads exists in the stylesheet its root owns. A CSS Module resolves an unknown class to `undefined` and renders the element unstyled with no error anywhere, so nothing else can see a rename that missed a call site.
- No consumer reaches past the root barrel, and no file in the layer imports through the public alias.
- Every `var(--…)` reference resolves to a definition, and no token is declared both axis-invariantly and under a resolution axis.

## Relationship to forms, and a known cycle

Schema-driven **form binding** — the `SchemaField` seam that maps a field type to a design-system control — is owned by the [frontend forms](forms.md) document, not here; this document owns only the presentation controls it consumes. A **circular dependency** between the design system and the form engine was recorded, with its intended one-directional end state, in [Finding 0001 — schema-form ↔ design-system cycle](../architecture/findings/0001-schema-form-design-system-cycle.md), and has since been resolved: the seam is owned by the form engine, which consumes the design system's controls one-directionally.

## Principles applied

The through-line of these conventions is that quality is made **structural** rather than left to per-component discipline: interchangeable icons and variants behind shared contracts make substitution safe (Liskov substitution), and token-driven styling lets the system re-theme by overriding tokens without editing any component (open/closed). This is the design-system application of the project's [Engineering Principles](../development/engineering-principles.md).

---

> This document owns the frontend design-system **conventions**. Form binding and the `SchemaField` seam are owned by the [frontend forms](forms.md) document, the app layout by the [frontend architecture](architecture.md) document, the schema-form ↔ design-system cycle (now resolved) by [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md), and the underlying principles by [Engineering Principles](../development/engineering-principles.md) — linked here, never duplicated.
