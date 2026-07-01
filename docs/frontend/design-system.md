# Frontend Design System

> **Status:** Active.
> **Authority:** The authoritative source for the frontend **design-system conventions** — the design-token model, theming, the component-authoring pattern, the variant model, and how the system is organized. It owns the **rules**, not a component catalog: it never documents individual components (`Button`, `Input`, …) prop-by-prop. It does **not** own schema-driven **form binding** and the `SchemaField` seam (the frontend forms document, forthcoming — Phase E), the app layout (the frontend architecture document, forthcoming — Phase E), or the design **principles** these conventions apply ([Engineering Principles](../development/engineering-principles.md)).
> **Scope:** The shared UI foundations and components in `src/shared/design-system/`.
> **Maturity:** This document describes the **currently implemented** design-system conventions. It covers only what exists today and will expand as the system grows; anything not described here is **not yet a stabilized convention** — either not yet built, or present but not yet settled enough to document — and is **not** something the architecture has rejected.
> **Version:** 1.0
> **Last Updated:** 2026-06-30
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

- **File layout** — one folder per component: `Component.tsx`, `Component.types.ts`, `Component.module.css`, `Component.stories.tsx`, and an `index.ts` barrel.
- **Ref & identity** — `forwardRef` to the underlying native element, with an explicit `displayName`.
- **Styling** — **CSS Modules** for static rules; **runtime CSS custom properties** for the dynamic, token-driven parts (e.g. a component sets `--x-color: var(--color-${color}-primary)` from its props). Class names are composed from a base class plus `variant-*`, `size-*`, and state flags, filtered and joined.
- **Prop vocabulary** — a shared vocabulary reused across components: `variant`, `color` (the six-role scale above), a size prop **named to avoid clashing with native attributes** (e.g. `inputSize`, `checkboxSize`), `isInvalid` + `errorMessage`, `fullWidth`, `leftIcon`/`rightIcon`, and `label`. Props **extend the native element** (`ComponentPropsWithRef<…>`, `Omit`-ing the clashing native `size`/`color`), so standard attributes pass through.
- **Accessibility** — `useId` links label and control; validity is exposed via `aria-invalid`; error text is announced with `role="alert"` and, where an error id is rendered, linked to the control via `aria-describedby`. Where a native control is visually replaced, the real control stays present and accessible (e.g. a visually-hidden native checkbox behind a custom box).

**The rule:** a new component adopts this layout, ref pattern, styling approach, prop vocabulary, and accessibility baseline; departures are deliberate exceptions, not new defaults.

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

The system is organized by responsibility: `foundations/` (tokens + theme), `components/` (one folder each), `icons/` (the icon set + its shared contract), and `utils/` (small presentational helpers). **Barrels are the public API** — each component's `index.ts`, the `components/` barrel, and the design-system root `index.ts` (which also imports `foundations/` for its side-effect CSS).

**The rule:** the barrels are the **only** public surface. Everything inside a component or module — variant folders, hooks, sub-components, and utilities — is private implementation and is **never imported directly**; consumers import solely from the design-system barrels.

## Relationship to forms, and a known cycle

Schema-driven **form binding** — the `SchemaField` seam that maps a field type to a design-system control — is owned by the frontend **forms** document (forthcoming — Phase E), not here; this document owns only the presentation controls it consumes. A **circular dependency** between the design system and the form engine currently exists and is recorded, with its intended one-directional end state, in [Finding 0001 — schema-form ↔ design-system cycle](../architecture/findings/0001-schema-form-design-system-cycle.md). It is a known deviation, not intended design.

## Principles applied

The through-line of these conventions is that quality is made **structural** rather than left to per-component discipline: interchangeable icons and variants behind shared contracts make substitution safe (Liskov substitution), and token-driven styling lets the system re-theme by overriding tokens without editing any component (open/closed). This is the design-system application of the project's [Engineering Principles](../development/engineering-principles.md).

---

> This document owns the frontend design-system **conventions**. Form binding and the `SchemaField` seam are owned by the frontend forms document (forthcoming), the app layout by the frontend architecture document (forthcoming), the known schema-form ↔ design-system cycle by [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md), and the underlying principles by [Engineering Principles](../development/engineering-principles.md) — linked here, never duplicated.
