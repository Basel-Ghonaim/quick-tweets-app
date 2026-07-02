# Frontend Forms — the Schema-Driven Form Engine

> **Status:** Active.
> **Authority:** The authoritative source for the frontend's **schema-driven form engine** (`src/shared/schema-form`) — the architecture by which a single schema describes a form and the engine derives its state, validation, typing, and control binding. It owns the **engine**. It does **not** own the presentation controls the engine binds to (the [design system](design-system.md)), the mechanism by which a submission is *executed* or how its failures are *handled* — the engine delegates both, and normalization of those failures is owned by [error handling](error-handling.md) — the application layout (the [frontend architecture](architecture.md)), per-feature form usage (the feature documents), or the design principles it applies ([Engineering Principles](../development/engineering-principles.md)).
> **Scope:** The shared engine in `src/shared/schema-form/`. How a specific feature uses it lives in that feature's document; the end-to-end request lifecycle in the [system overview](../architecture/system-overview.md).
> **Maturity:** This document describes the **currently implemented** engine. It will grow as the engine gains capabilities; anything not described here is not yet built, not architecturally rejected.
> **Version:** 1.0
> **Last Updated:** 2026-07-02
> **Owner:** Basel Ghonaim

## Why the engine exists

Hand-rolled forms repeat the same wiring — a value, an error, a change handler, and submit plumbing — for every field, while general-purpose form libraries bring opaque internals and rigid APIs. This engine takes a third path: **describe the form once as a schema, and derive everything else from it** — with no per-field boilerplate. It is **generic by design**: the engine has zero knowledge of any specific domain or feature; it is a pure tool that a feature configures.

## The schema is the architectural center

The engine has a single center: the **schema**. Every capability in this document — typing, state, validation, binding, and submission — is *derived from that one declaration*; nothing is described twice. That single-source derivation is the whole idea of schema-driven architecture, and it is what the rest of this document unfolds.

The schema earns that central place by playing **three roles at once**:

- **Configuration** — it declares the form: each field's name, type, label, validators, and layout.
- **Runtime model** — the engine reads it at runtime to build initial state, run validation, interpret change events, and choose each field's control.
- **Type source** — the same declaration is also a TypeScript source. A conditional type maps each field's type to its value type (checkbox → `boolean`, number → `number | ""`, file → a `File` value, text-like → `string`), and the entire submission payload type is inferred from the schema — a fully-typed payload with zero manual annotation.

Because these three roles share one declaration, configuration, behavior, and types **cannot drift apart**.

## How responsibility flows: schema → state → validation → binding

From that single source the engine derives, in turn:

- **State.** The initial value map (each value shaped by its field type), a per-field error map, and a submission flag are built once from the schema.
- **Validation.** Each field carries an ordered list of validators; the engine runs them as the field changes (first failure wins) and sweeps every field once more before submitting.
- **Binding.** The field's declared type drives how its value is read from the DOM and which presentation control renders it.

The field **type** is the spine of the flow: one declaration fixes the value's inferred type, its initial value, how a change event is interpreted, and how it is displayed.

## Internal layers, and how they collaborate

The engine is layered along a Model → Services → Controller separation:

- **Model** — the schema, value, and state types, plus the type-inference engine. It depends on nothing.
- **Services** — small **pure functions** (build the initial state, run one field's validators, sweep the whole schema). Input in, result out; no React.
- **Controller** — a single React hook that holds form state, translates DOM events into service calls, and orchestrates submission.

They collaborate one-directionally: the Controller owns React state and **delegates all logic** to the Services, which — with the Model — are entirely React-free. The Controller is the only layer that touches React at all.

## Why the logic is separated from React

Keeping state-building and validation as pure, React-free services is a deliberate architectural choice, not an accident of file layout. Pure logic is **unit-testable in isolation** (no DOM, no component mounting), reusable, and keeps the Controller thin — the hook wires things together but holds no business rules. This is the domain-driven **Model / Logic / Controller** separation applied to a form engine.

## Submission: orchestrated here, executed and handled elsewhere

The Controller orchestrates the submission *lifecycle* — block the native submit, sweep validation, stop and surface field errors if invalid, raise the submitting flag, run the operation, and lower the flag when it settles. Two responsibilities are deliberately **not** the engine's:

- **Execution.** The operation itself is **injected from outside**. The engine is unaware of how it runs — an HTTP call via the [API client](api-client.md), an RTK Query mutation, local persistence, or anything else. Its job ends at orchestration; the mechanism is the caller's.
- **Error handling.** The engine performs **no** submission-error handling of its own. On failure it hands the raw error to an injected handler and clears the flag — nothing more. What that error *means* and how it surfaces (typically the single normalized `AppError`) is owned entirely by [error handling](error-handling.md); the engine neither inspects nor transforms it.

This is distinct from field **validation** errors, which the engine *does* own — they belong to the validation step above, not to submission-error handling. The double inversion — execution and error handling both injected — is what keeps the engine a pure, transport-agnostic tool.

## The `SchemaField` seam

The seam is where a schema field meets a rendered control: driven by the field's type, it selects the matching control and passes it the field's value, error, and change handler. Its architectural **purpose is isolation** — it is the single boundary that lets the engine deal only in *field types* and stay entirely ignorant of concrete UI components. The engine never imports or names a specific control; the seam translates type → control on its behalf. This mirrors the submission inversion: the engine is agnostic to *presentation* exactly as it is agnostic to *execution*. The engine owns the **seam** (the type→control mapping); the **controls** are the [design system](design-system.md)'s.

The intended dependency is one-directional: the form engine *consumes* the design system's controls; the design system does not depend back on the engine. A recorded deviation from that intended seam ownership exists and is captured in [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md); it is referenced here as the historical record of the problem, while this document describes the intended architecture and the code remains the source of truth for the current state.

## Public API

The public surface is deliberately **narrow**: one entry point (the controller hook), a schema-to-fields helper for rendering, the composable validator factories (required, email, length, cross-field match), and the handful of schema/payload/handler types a consumer needs. The narrowness is the design, not an accident. Everything else — the pure services, the type-inference internals, and the engine's own types — is kept private so it can change without breaking any consumer. A small surface means less to learn, fewer ways to couple to internals, and a clean line between the engine's **contract** and its **mechanism**: consumers depend on the contract, and the mechanism stays free to evolve.

## Relationship to feature documentation

This document owns the **shared engine**. A feature that uses it — authentication, for example — documents only **how that feature uses the platform**: its own schema, its fields, and the submit action it injects. **Feature documents never re-document the engine**; they link here. This preserves one owner for the engine and prevents the per-feature drift that duplicated form documentation would invite.

## How the engine applies the project's principles

The engine's structure *is* the project's principles at work ([Engineering Principles §2, §3](../development/engineering-principles.md)):

- The **Model / Services / Controller** split is single-responsibility and the domain-driven separation made concrete — each layer has one reason to change, and business rules stay out of React.
- **Dependency inversion** runs through every boundary: the submit action, the error handler, and the control seam are all *injected*, so the engine depends on abstractions rather than on a concrete transport, UI library, or persistence layer — which is precisely why a feature can drop it in unchanged.
- The engine is **designed to depend one-way**: it consumes lower layers (the design system's controls, through the seam) and is consumed by features — never the reverse (the one recorded deviation being the finding referenced above).

---

> This document owns the frontend schema-driven form engine. The presentation controls are owned by the [design system](design-system.md), submission-error normalization by [error handling](error-handling.md), the application layout by the [frontend architecture](architecture.md) document, per-feature usage by the feature documents, and the underlying principles by [Engineering Principles](../development/engineering-principles.md) — linked here, never duplicated. The recorded schema-form ↔ design-system deviation lives in [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md).
