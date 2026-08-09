# Frontend Design System

> **Status:** Active.
> **Authority:** The authoritative source for the frontend **design-system conventions** — the design-token model, theming, the component-authoring pattern, the variant model, and how the system is organized. It owns the **rules**, not a component catalog: it never documents individual components (`Button`, `Input`, …) prop-by-prop. It does **not** own schema-driven **form binding** and the `SchemaField` seam (the [frontend forms](forms.md) document), the app layout (the [frontend architecture](architecture.md)), or the design **principles** these conventions apply ([Engineering Principles](../development/engineering-principles.md)).
> **Scope:** The shared UI foundations and components in `src/shared/design-system/`.
> **Maturity:** This document describes the **currently implemented** design-system conventions. It covers only what exists today and will expand as the system grows; anything not described here is **not yet a stabilized convention** — either not yet built, or present but not yet settled enough to document — and is **not** something the architecture has rejected.
> **Version:** 1.2
> **Last Updated:** 2026-08-09
> **Owner:** Basel Ghonaim

## Design tokens

All visual values are **CSS custom properties**, separated by tier under `foundations/tokens/`:

- **Primitives** — raw scales (`--palette-blue-600`, `--space-2`, `--font-size-base`). Not consumed by components, with one stated exception: border **radius and width** carry their tier on the curated scale itself, so a component binds them directly.
- **Intent** — the tier a family earns rather than one it is given ([ADR 0011](../architecture/decisions/0011-intent-layer-earned-not-assumed.md)): role fills and on-surface text across the six roles (`--role-fill-error`, `--role-on-surface-primary`), surfaces and text (`--surface-subtle`, `--text-muted`), control and field spacing, control geometry, motion, and composite text styles. A family that earns no intent tier is a result, not a gap.

**A token names a shared concept, never a shared value.** Two components writing the same literal is not a token; the language is what they must *agree* on. Several approved consumers make a concept obvious, but they are evidence rather than a gate — the Design System precedes its consumers ([ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2). A value only one component can ever express stays component-owned: a checkbox's checkmark scale and an icon affordance's hover dimming are the component's, while the checkbox *box* is shared, because a radio renders the same box in the same form.

**The prefix names the anatomy that owns the concept.** `--role-*` is the **semantic visual role** — primary, error, and the rest — *never* the ARIA `role` attribute; anything that carries one binds it, including components that are not controls. `--control-*` is what only an interactive control has: density, disabled and loading emphasis, the minimum hit target, the selection box. `--field-*` is the Field anatomy's own — its label, its description, the gap between its stacked parts.

**The rule:** a component binds **at the tier its family carries**, never at a primitive scale. A missing token is a **stop** — the vocabulary is extended deliberately, because the first reach for a primitive is what reintroduced the drift the layer was rebuilt to remove.

**The rule's domain is the language, not every value.** Colour, spacing, typography, motion and elevation bind. A component's intrinsic geometry, its own choreography and its implementation details are *outside* the rule rather than exceptions to it — a checkbox's checkmark scale, an icon affordance's hover dimming, a tile's label squeezed to fit it. The question is never "is this a literal?" but "is this something components must agree on?" Two roles resolving to the same value likewise stay two tokens: coincidence is not identity.

**Typography names typographic concepts, and is the one family the anatomy prefix does not govern.** Text styles bundle weight, size, line height and family into one `font` declaration, so a call site cannot pick them apart. There are two roles: **`label`** is text whose purpose is to name or identify — a button's caption, a field's label, an alert's title — and **`body`** is text read as content — a typed value, an option, a message. Neither is an anatomy and neither is an ARIA meaning: an alert's title is a label though an alert is not a control, and a link's text is whatever it sits inside.

**`small · medium · large` are typography sizes, not `ControlSize`.** A component decides how its own `size` maps onto them, and that mapping is **not universal** — Button, Input and Checkbox map 1:1 today; FileInput inherits `size` and does not vary its text at all. A component with no `size` prop simply picks the step it needs. Deliberately unauthored: a **heading** ramp, which only a design settles, and a **caption** role — secondary metadata is `body` at the small step plus a muted colour, so colour carries the demotion rather than a third type role.

## Theming

Theme is a **resolution axis**, not a tier — the first of possibly several, which is why it lives under `foundations/resolution/theme/` rather than at the top level. Each theme resolves the same keys under `[data-theme="…"]`, so switching themes is setting one attribute and no component code participates.

**The rule:** a token whose value varies with a theme is declared **in every theme file and never in `:root`** — `:root` matches the same element at equal specificity and loads afterwards, so a token placed there would outrank every theme instead of being overridden by one. A component never branches on the theme; it binds the key and re-themes for free.

## Component-authoring convention

Every component follows the same shape, so a new one is predictable to build and to consume:

- **File layout** — one folder per component: `Component.tsx`, `Component.types.ts`, `Component.module.css`, `Component.stories.tsx`, and an `index.ts` barrel. Beyond those, a responsibility earns a directory at its **second** member and stays a flat, self-describing file below it: `hooks/`, `parts/` (internal sub-components, never exported), `variants/`, `constants.ts`. A folder is never created empty in anticipation.
- **Grouping** — components sit under the anatomy they belong to: `controls/`, `fields/`, `display/`. Categories are created when something populates them, and Storybook titles follow the same taxonomy so the code and the catalogue never disagree.
- **Ref & identity** — `forwardRef` to the underlying native element, with an explicit `displayName`. Where a component owns the element and its internals need it, the ref is **published** with `useImperativeHandle` rather than cast — `forwardRef` may hand over a callback ref, and casting one fails silently.
- **Styling** — **CSS Modules** for static rules; **runtime CSS custom properties** for the token-driven parts. The root class is `.root`; the rest are `variant-*`, `size-*`, and `is*` state flags. Class lists are composed with the shared helper, and custom properties are merged with the caller's `style` through the shared typed helper rather than cast at each call site.
- **Prop vocabulary** — declared once and imported, never redeclared: the role scale and the control sizes come from the foundations, and the prop contract adds `isInvalid` / `isLoading` plus the field's `label`, `errorMessage` and `helperText`. Props **extend the native element**, with the attributes the vocabulary shadows omitted **once** in the shared contract. `disabled` is never redeclared — it belongs to the element.
- **Variant props** — a component whose variants take different props is a **discriminated union** on `variant`, so a prop belonging to one variant cannot be passed with another.
- **Accessibility** — the field's ids and its `aria-describedby` are **derived by the shared hook**, so a component cannot render a message without associating it. Validity is exposed via `aria-invalid`; error text is announced with `role="alert"`. Where a native control is visually replaced, the real control stays present and accessible.
- **Focus** — a component **never declares a ring of its own**; it composes the owned indicator. Because the element that receives focus is not always the element that should show it, the indicator has four attachment forms sharing one definition: on the focused element, on a wrapper that owns the visible boundary, on a sibling when the control is visually replaced, and inset where a clipping ancestor would cut an outward ring. The wrapper form matches a **direct child**, so an interactive affordance in a slot rings itself instead of the wrapper ringing twice.

**The rule:** a new component adopts this layout, ref pattern, styling approach, prop vocabulary, and accessibility baseline; departures are deliberate exceptions, not new defaults.

## Component anatomy

Two structures, composable rather than nested — the second is not the first's inner detail.

- **Adorned Control** — *prefix · control · suffix*. A control flanked on the **inline axis** by affordances whose composition it owns. A caller supplies a node per side and never a layout, so supplying one can never displace an affordance the control composes itself.
  - An affordance is **decorative** or **interactive**, and the distinction settles four things at once: whether it is focusable, whether it needs an accessible name, whether it carries the owned focus indicator, and whether it must meet the minimum hit target (`--control-target-min`, WCAG 2.5.8). It is decided by **interactivity, never by appearance** — a select's chevron looks like a control and is not one.
  - An interactive affordance is **Button-like** by nature: transparent fill, pointer cursor, disabled opacity, owned indicator, accessible name. No shared abstraction exists yet — `IconButton` is its named home, and its contract is that component's to settle rather than the affordance's to anticipate.
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

**Four checks keep this true rather than merely stated**, each written after observing the failure it prevents:

- Every `styles.x` a component reads exists in the stylesheet its root owns. A CSS Module resolves an unknown class to `undefined` and renders the element unstyled with no error anywhere, so nothing else can see a rename that missed a call site.
- No consumer reaches past the root barrel, and no file in the layer imports through the public alias.
- Every `var(--…)` reference resolves to a definition, and no token is declared both axis-invariantly and under a resolution axis.
- Every component binds **at the tier its family carries**. Resolving is not enough — a legacy or primitive reference resolves too — so this is what makes the superseded set safe to delete. Surfaces still awaiting migration are listed explicitly, and an entry must still be in violation, so a migrated component cannot leave its own exemption behind.

## Relationship to forms, and a known cycle

Schema-driven **form binding** — the `SchemaField` seam that maps a field type to a design-system control — is owned by the [frontend forms](forms.md) document, not here; this document owns only the presentation controls it consumes. A **circular dependency** between the design system and the form engine was recorded, with its intended one-directional end state, in [Finding 0001 — schema-form ↔ design-system cycle](../architecture/findings/0001-schema-form-design-system-cycle.md), and has since been resolved: the seam is owned by the form engine, which consumes the design system's controls one-directionally.

## Principles applied

The through-line of these conventions is that quality is made **structural** rather than left to per-component discipline: interchangeable icons and variants behind shared contracts make substitution safe (Liskov substitution), and token-driven styling lets the system re-theme by overriding tokens without editing any component (open/closed). This is the design-system application of the project's [Engineering Principles](../development/engineering-principles.md).

---

> This document owns the frontend design-system **conventions**. Form binding and the `SchemaField` seam are owned by the [frontend forms](forms.md) document, the app layout by the [frontend architecture](architecture.md) document, the schema-form ↔ design-system cycle (now resolved) by [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md), and the underlying principles by [Engineering Principles](../development/engineering-principles.md) — linked here, never duplicated.
