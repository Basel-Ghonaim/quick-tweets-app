# Component Architecture Unification — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-05
> **Parent Issue:** [#465](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/465)
> **Supersedes:** —

This plan unifies the architecture of the Design System's components into **four independently reviewable Work Items**, then hands back to the [Design System Re-establishment plan](design-system-reestablishment.md) at its next component migration.

It is a **strategy document**: it owns the effort's execution order, boundaries, invariants, and the rationale for that order. Each Work Item's scope detail, acceptance criteria and status belong to its Issue — authored at Execution Preparation, when the most is known — per [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

## 1. Purpose

The components were written as a **bootstrap**, before the project had its ownership rules or its platform model. Each independently invented the same solutions, so the layer carries several spellings of one size concept, a role scale declared once per component **and once more inside the check that protects it**, two competing state models, and one component whose contract prevents a form library from treating it as an input.

Continuing the token migration onto that base would bind a stable presentation language to a temporary structure — and would open the layer's heaviest surface twice. This effort ends with **one architectural model every future component follows**, and it is deliberately short: it consolidates contracts, it does not redesign components.

## 2. Boundary declaration

**Covers:** the shared control contract (role, size, state, and the native-collision policy); the icon contract; the shared helpers; the **Field / Adorned Control anatomy** (§3.4); the canonical component layout (§3.3); the Variant Field's contract; the components directory taxonomy; and the public surface with its enforcement.

**Does not cover:** any **token or CSS work** — that is the Design System plan, resumed after this one; any **new component**; any **visual or behavioural change**; the form seam, beyond keeping it compiling; and a **component-test tier**.

## 3. Pinned constraints

### 3.1 Invariants

- **C1 — A component extends the element it wraps.** The DOM element is the contract's reference; the platform's attributes pass through because the platform already defines them.
- **C2 — One vocabulary, declared once.** Role, size and state are imported, never redeclared — including by the check that protects them, which must import the union rather than mirror it. ✅
- **C3 — Invalid combinations are unrepresentable.** Variant-specific props are a discriminated union, so a prop belonging to one variant cannot be passed with another.
- **C4 — One public surface.** Nothing in the layer is reachable by deep import — including by the Design System's own components. ✅
- **C5 — Anatomy is shared; layout is owned.** The field wiring is shared; each component keeps its own markup and stylesheet.

### 3.2 Settled decisions

- **E1 — The platform is the reference, not an existing consumer.** Existing consumers are evidence that capabilities are needed; they do not define them. A contract is designed from what the wrapped element *is* ([ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2 — grounded, not merely consumed).
- **E2 — `Field` is a hook, not a component.** The duplication that hurts is id derivation and aria wiring — three components, three conventions, one omitting an error association entirely. The markup is small and each component's stylesheet owns its layout, so a shared `<Field>` component would force one stylesheet across three different layouts: real duplication traded for worse coupling.
- **E3 — Structure follows responsibility, in both directions.** *Creating:* a folder exists when it has content — §3.3 states where a responsibility *goes*, and imposing the full layout on the smallest component is the reserved-vocabulary mistake in another form. *Growing:* a file that takes on a second responsibility is split before it takes a third, and a flat folder earns subdirectories when it holds more than one kind of thing. **Growth is the trigger, never a schedule.** This binds the shared surfaces specifically: the foundations vocabulary and the shared component artifacts both start flat, and they evolve into `contracts/`, `hooks/`, `helpers/` when they are actually holding those separately — not as a pre-emptive skeleton, and not by accumulating everything behind one import because it currently works.
- **E4 — Grouping follows the anatomy, not a product taxonomy.** `fields/`, `controls/`, `display/` derive from the Field/Control distinction. `feedback/`, `navigation/`, `overlay/` are product categories that get argued about; they are created when something populates them.
- **E5 — No component-test tier is introduced.** Storybook and the foundation checks remain the proof surface; a test tier is its own effort with its own conventions.
- **E6 — A component file is opened once unless there is a stated reason.** This is the sequencing constraint the whole order serves: shared pieces are proven on the smallest surfaces first, then each component adopts everything in a single pass. It is a default, not an absolute — a file may be opened twice when the two passes are **different kinds of change** and interleaving them would make both unreviewable. The reason is **named in the Work Item**, never left to be inferred from the diff.

### 3.3 The canonical component layout

The organisational model every component follows, so responsibility placement is a rule rather than an author's preference:

```
ComponentName/
  index.ts                 the only public path into the component
  ComponentName.tsx        the component
  ComponentName.types.ts   its own types; shared vocabulary is imported
  ComponentName.module.css
  ComponentName.stories.tsx
  constants.ts             values it alone owns
  hooks/                   its behaviour
  parts/                   internal sub-components, never exported
  variants/                its variant implementations
```

Named `parts/` rather than `components/`, because "components inside a component" reads as a nesting error. **Pure helpers are not hooks** and never live in `hooks/`. Bounded by **E3**: a folder appears when it has content.

### 3.4 The anatomy

**Owned by [`design-system.md`](../frontend/design-system.md)** — Control, Field, Adorned Control, Adorned Field, and the inline-axis boundary. This plan applies the vocabulary and never redefines it; a plan ends `Historical`, so a concept living only here would lose its owner when the effort closes.

### 3.5 Component roles

The plan names architectural roles, not components. The mapping is recorded here once so the roles govern and the identities can change:

| role | property that earns it | today |
|---|---|---|
| **Pilot Control** | the smallest component that is a Control — interactive, no field chrome | `Button` |
| **Pilot Field** | the smallest component that is a Field | `Checkbox` |
| **Adorned Field** | a Field whose control is an Adorned Control (§3.4) | `Input` |
| **Variant Field** | a Field that renders through variants and does not extend a native element | `FileInput` |
| **Existing consumers** | the surfaces that compose these components today | the form seam, and the one feature module |

## 4. Execution order

```
CA-1 (shared contract · piloted on the Pilot Control + Pilot Field)
   ▼
CA-2 (Adorned Field adopts)
   ▼
CA-3 (Variant Field's contract)
   ▼
CA-4 (public surface + taxonomy)
```

- **CA-1 → CA-2 → CA-3** *(hard)*: the shared contract must exist before a component can adopt it, and each component adopts **everything at once** — contract, helpers, anatomy, conventions — so no file is opened twice (**E6**).
- **CA-3 → CA-4** *(hard)*: the taxonomy move and the deep-import check land after every component has reached its final shape, so the barrel is enforced against what will actually ship.

**Why two pilots.** The Pilot Control exercises the Control half of the anatomy — adornments, no field chrome. The Pilot Field exercises the Field half. They are the two smallest components in the layer, and proving the model on either alone would leave half of it unpiloted.

**Why the Variant Field comes late but not last.** It is the only component whose *contract* is wrong rather than merely inconsistent, and it carries the layer's heaviest behaviour. It adopts a model already proven on three components — and it must precede the Design System plan's migration of its stylesheet, which is the largest remaining migration surface and must not be written twice.

## 5. Work Items

- **CA-1 · The shared contract, piloted on the Pilot Control and the Pilot Field.** *(deps: —)* Author the single role, size and state vocabulary with the native-collision policy solved once; the icon contract; the shared helpers for class composition and field wiring; the canonical layout (§3.3) and the stylesheet root-class convention. The token check **imports** the role union instead of mirroring it (**C2**). Both pilots adopt all of it, and the Pilot Control's conflated state enum resolves into the shared vocabulary — its members either have equivalents or have no ground to exist (**E1**). *Why:* everything downstream binds this, and the two smallest surfaces prove both halves of the anatomy before three larger ones depend on them.

- **CA-2 · The Adorned Field adopts.** *(deps: CA-1)* The contract, the helpers and the anatomy, including the render-tree restructure: the control's inline affordances become **prefix and suffix slots** rather than conditionals nested inside the control. *Why:* it is the most structurally tangled of the simple components, and the place where the anatomy either earns its keep or does not.

- **CA-3 · The Variant Field's contract.** *(deps: CA-2)* Extend the native element (**C1**); replace the shared-superset variant props with a **discriminated union** (**C3**); give its behaviour and internal parts the canonical layout. The props that exist only to work around the missing native contract are removed. *Why:* the one component whose contract is wrong rather than inconsistent, and the one whose stylesheet the Design System plan opens next.

- **CA-4 · The public surface.** *(deps: CA-3)* Complete the root barrel; group components by the anatomy (**E4**) with Storybook titles aligned to the same taxonomy; relocate any helper used by a single component to it; and add **one mechanical check: nothing in the layer is reachable by deep import** (**C4**). *Why:* the taxonomy is currently decided in three places that disagree, and a check retires the barrel argument permanently instead of restating it.

**CA-1 also carries the documentation reconciliation** for the planning workflow adopted alongside this plan: the plans README still describes plan changes as their own pull requests, the agent onboarding guide still forbids an implementer amending a plan, and ADR 0006's `Draft` stage has no location. Those contradict the new rule and are corrected in CA-1's first commit, together with this document's move into `docs/plans/`.

## 6. Risks

- **Contract consolidation drifting into redesign.** The boundary excludes visual and behavioural change, and every Work Item is a contract change with the rendered result held constant. A component that "would be better if" is **recorded, not absorbed**.
- **One structural consumer.** A single seam composes every Field component. It is the compile-time canary for each contract change and must keep working — while never becoming the contract's reference (**E1**).
- **No visual-regression net.** Restructuring a render tree can move appearance without changing intent. Storybook is the only observer, so an observed change is stated in the PR rather than assumed absent.
- **The anatomy under-fitting a future component.** The model is proven on four components, two of them simple. A fifth that does not fit is a finding, not a licence to fork the model.

## 7. Completion criteria

- Every component extends its native element, draws from one vocabulary, uses the shared helpers, and follows the Field/Control anatomy and the canonical layout.
- No invalid prop combination is representable; no deep import resolves; the token check imports the role union it protects.
- The form seam compiles with no workaround props remaining.
- Typecheck, unit tests and Storybook green; no visual or behavioural change beyond those stated in a PR.
- The Design System plan resumes with no component contract still outstanding.

## 8. Reconciliation

*Added as this plan approaches `Historical`: where each Work Item's durable facts landed, and the forward links. The component-authoring conventions this effort settles are owned by [`design-system.md`](../frontend/design-system.md), which the Design System plan rewrites at its close.*
