# Finding 0001: Circular dependency between the schema-form engine and the design system

> **Status:** Open
> **Date:** 2026-06-28
> **Affected areas:** `src/shared/schema-form`, `src/shared/design-system`
> **Reported by:** Basel Ghonaim

## Observation

The schema-form engine and the design system depend on **each other**, forming a circular dependency, and each ships its **own** `SchemaField` component — two diverging implementations of one concept.

The intended relationship is **one-directional**: the schema-form engine is a behaviour subsystem that *consumes* the design system's controls. The design system, as the lower-level presentation layer, must not depend back on the form engine — not even for types.

## Evidence

Verified on `main` (2026-06-28).

**The cycle**

- `src/shared/schema-form/components/SchemaField.tsx:1` — runtime import of design-system controls:
  `import { Input, Checkbox } from "@shared/design-system";`
- `src/shared/design-system/components/SchemaField/SchemaField.types.ts:1` — reverse *type* import of form-engine types:
  `import type { FormChangeHandler, FieldType, FieldSpan } from "@shared/schema-form";`

So `schema-form → design-system` (runtime) **and** `design-system → schema-form` (type) — a two-way dependency between two platform modules.

**The duplication** — two `SchemaField` components exist and have drifted:

- `src/shared/schema-form/components/SchemaField.tsx` — renders `Input` / `Checkbox`; no `span` / `autoFocus`; handles the `file` case via `Input type="file"`. Its props type sources `FieldType` / `FormChangeHandler` **locally** (`../types/schema.types`).
- `src/shared/design-system/components/SchemaField/SchemaField.tsx` — renders `Input` / `Checkbox` / `FileInput` (avatar variant), adds `span` and `autoFocus`, and wraps its output in `<div data-span data-type>`. Its props type sources `FieldType` / `FormChangeHandler` / `FieldSpan` from `@shared/schema-form`.

The two are not a re-export of one another; they are independent, behaviourally different components for the same role.

## Principle / boundary violated

- **Acyclic dependencies** ([Engineering Principles §3](../../development/engineering-principles.md)): dependencies must point one way and never form a cycle; two units importing each other means a responsibility is misplaced.
- **Platform vs. feature / layering** (same §3): the consumer (form engine) may depend on the platform (design system); the platform must not depend back on the consumer.
- **Single Responsibility / one owner** ([Engineering Principles §2](../../development/engineering-principles.md)): two diverging `SchemaField` implementations duplicate one concept — the seam should have a single owner.

## Resolution direction (not scheduled here)

The intended end state is a one-directional `schema-form → design-system` dependency with a single `SchemaField` seam owned by the form engine. Candidate fixes — relocating the shared form types so the design system no longer imports `@shared/schema-form`, and removing the design-system-side `SchemaField` — belong to a **future refactoring Work Item**. A finding records the problem; it does not schedule the fix (Documentation Strategy §9).

## Links

- Surfaced during documentation-migration planning: [Migration Plan §7](../documentation-migration-plan.md).
- The intended one-directional relationship will be described by `frontend/forms.md` and `frontend/design-system.md` when they are authored (Phase E), each linking back to this finding.
