# Design System Component Set — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-19
> **Parent Issue:** [#522](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/522)
> **Supersedes:** —

This plan builds the next five members of the Design System component layer. Its architectural ground is **settled and is never reopened here**: [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) (grounding, boundaries, invariants), [ADR 0011](../architecture/decisions/0011-intent-layer-earned-not-assumed.md) (the intent tier is earned), [ADR 0012](../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) (a contract is independent of adoption), [ADR 0014](../architecture/decisions/0014-document-classes-and-committed-product-scope.md) (document classes and committed scope), the [Foundation](../frontend/design-system/foundation.md) and [authoring](../frontend/design-system/components.md) contracts, and the [committed product scope](../project/overview.md) that grounds all five.

It is a **strategy document**: it owns the effort's goals, sequence, dependencies, rationale, and risks. Each Work Item's implementation, acceptance criteria, status, and progress belong to that Work Item's Issue, which this plan links and never mirrors.

**On the pinned decisions (§5).** The component contracts were ratified before this plan was drafted, and they have no permanent home yet — `components.md` may not hold a catalogue ([ADR 0012](../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) Decision 3), and none of them meets the ADR bar ([Documentation Strategy §8](../architecture/documentation-strategy.md)). The plan therefore **pins them for the duration of the effort only**, and §9 lands every one of them in an executable owner — types, stories, tokens, source comments — before the plan goes `Historical`. This is deliberate: [ADR 0014](../architecture/decisions/0014-document-classes-and-committed-product-scope.md) exists because operative rules stranded in a retiring artifact leave governance with it, and reconciliation is what prevents that here.

## 1. Purpose & goals

- Build the five components the product has committed to and the layer does not yet have — taking the component set from four members to eight, plus one shared internal layer.
- **Retire real duplication:** two independently authored spinner implementations inside Button and Input, with divergent colour sourcing and duplicate keyframes.
- **Unblock a waiting consumer:** the schema-form engine declares a `textarea` field type and throws for it, recorded in [Finding 0005](../architecture/findings/0005-declared-unimplemented-field-types.md) as blocked on a missing Design System control.
- **Extend the design language** with heading and display typographic roles and a closed text-emphasis vocabulary — the effort's only *expected* Foundation change.
- **Consolidate** the field structure once enough real instances exist to shape it, rather than inferring it from one.
- Close by reconciling every pinned decision into its executable owner, leaving nothing durable in this plan.

## 2. Boundary declaration

*What this plan intentionally covers, and what it intentionally leaves out — so scope cannot silently expand while it is written.*

**Covers**

- Five components — **Spinner, IconButton, Typography, Textarea, Shared Field Layer** — across seven Work Items, the two extra being the migration of IconButton's existing consumers onto it (§4).
- The Typography Foundation members the roles require — composite text styles, and any primitive member they need — plus the text-emphasis contract, **and the [`foundation.md`](../frontend/design-system/foundation.md) update that follows**: adding heading and display roles changes the typography family's architectural meaning, which is the change the stability rule expects to require an edit.
- Absorbing Button's and Input's private spinners into the unified Spinner, preserving their current appearance.
- Wiring the `SchemaField` seam for `textarea` only, as the final step of its Work Item.
- The plan's own introduction into `docs/plans/` and the documentation that changes because of it, as WI-1's first commit.
- **The one explicit exception granted by the human:** WI-1's **second commit** corrects [ADR 0014](../architecture/decisions/0014-document-classes-and-committed-product-scope.md) line 3 from `Status: Proposed` to `Status: Accepted`. It is dedicated to that change alone. **The exception extends to nothing else, and no further exception is assumed.**
- Migration folded into the component Work Item that causes it **where it is small and self-contained**; a dedicated Work Item only where scope, risk and responsibility actually establish the need.

**Deliberately excludes**

- Reopening anything settled in #520 / #521, in the ADRs above, or in §5's pinned decisions.
- Any product surface, page or feature that would consume these components. None of the five waits on a consumer ([`components.md`](../frontend/design-system/components.md)).
- Migrating the **auth module** off raw `--font-size-*`. Auth is a prototype and a migration surface only ([frontend architecture](../frontend/architecture.md)); its migration is a separate effort.
- **`addMoreBtn`, `addMoreRow` and `triggerButton`** — each carries an icon *and* visible text, or is a drop affordance rather than an action, so none is an icon-only button. They are excluded from the migration permanently, not deferred.
- **Radio and Select**, and the `options` contract [Finding 0005](../architecture/findings/0005-declared-unimplemented-field-types.md) also scopes — this plan resolves only its `textarea` third.
- Every other member of the committed interface vocabulary, **Skeleton** included, whose boundary against Spinner is pinned but which is not built here.
- A **reduced-motion resolution axis** in the Foundation. This effort resolves reduced motion at the component that needs it, and records the Foundation question rather than answering it.
- **Acceptance criteria, per-Work-Item status, progress and checklists** — these live in each Work Item's Issue.

## 3. Strategy & sequencing

**Two hard ordering invariants, and nothing else is forced.**

1. **Spinner precedes IconButton.** IconButton's busy state renders the unified Spinner. Building IconButton first would produce a *third* private spinner for Spinner to absorb afterwards — the exact duplication this effort exists to retire.
2. **Textarea precedes the Shared Field Layer.** The layer is generalization machinery, and [Engineering Principles §3](../development/engineering-principles.md) requires it to be shaped by real instances rather than inferred. The four instances are **Input, Checkbox, FileInput and Textarea**; Textarea is the fourth, and extracting before it exists would encode three cases and be reshaped by the fourth.

Everything else is judgement, and the order below is chosen for risk, not for the sequence in which the components were discussed.

**Critical path: WI-1 → WI-2**, with **WI-3** and **WI-4** independent of both and of each other, and **WI-5** terminal.

**Why this order.** *Spinner first* because its contract is the smallest fully-settled one, it retires actual duplicated code, it unblocks a dependent, and its cross-component reach into Button and Input is bounded and understood — so the effort's verification discipline is established on its lowest-risk item rather than its hardest. *IconButton second* because WI-1 unblocks it and it needs no Foundation change. *Typography third* because it is the only item that changes the **language** and the only one that may cross into the application; placing it third lets two components ship while its value table is being settled, and costs nothing, because no earlier Work Item binds a heading or display role. *Textarea fourth* because it is independent but opens the fifth. *The Shared Field Layer last* because it has by far the highest blast radius — Input, Checkbox, FileInput and Textarea at once — and because it cannot begin until all four exist.

**No two Work Items contend for the same files.** WI-1 reaches into Button and Input; WI-2 into its own folder and, at most, Button's type declaration; WI-3 into the token layer and possibly `index.html`; WI-4 into its own folder and the schema-form seam; WI-5 into every field component, after each has settled. The ordering is therefore also the conflict-free ordering, and no Work Item is blocked by another's open branch. The one exception is deliberate: **WI-2A and WI-2B both reach into `FileInput.module.css`**, which is why they are sequenced rather than parallel.

| Phase | Goal | Work Item |
|---|---|---|
| **1 — Unify** | Retire the duplicated busy indicator; establish the effort's verification pattern on its lowest-risk item. | WI-1 |
| **2 — Extend the control set** | The icon-only action, unblocked by WI-1, then its consumers migrated onto it. | WI-2, WI-2A, WI-2B |
| **3 — Extend the language** | Heading and display roles plus text emphasis — the effort's only *expected* Foundation change. | WI-3 |
| **4 — Extend the field set** | The multiline field, and the waiting consumer it unblocks. | WI-4 |
| **5 — Consolidate** | Extract the shared field structure once four instances exist to shape it. | WI-5 |

**Decision gates** — pulled just-in-time, never resolved here:

- **Typography's size / weight / line-height table**, and the font weights it implies — settled in WI-3's Execution Preparation. Its application-loading consequence is **reported and approved before anything crosses into `index.html`**, per the ratified order: weights first, loading second.
- **Migration sizing**, per component — evaluated at each Work Item's Execution Preparation. A dedicated migration Work Item is created only when the actual scope establishes the need, never in advance.
- **The Shared Field Layer's API** — deliberately open until WI-5, by the invariant above.

**A further Foundation change is not foreclosed.** WI-3's own family-level change is ratified and expected, and it carries the contract update that follows from it (§9). Calling it the effort's only Foundation change states the **current expectation**, not a prohibition: if another Work Item establishes a genuine need — a token member a component cannot do without, or a second family-level change — it is **escalated and decided on its merits**, never worked around with a component-local literal and never absorbed silently into a component Work Item.

## 4. Execution structure — Work Items

*Each item is one independently reviewable change. Scope and rationale are strategy-level; detailed acceptance criteria live in the item's Issue when it is created. IDs are plan-local handles, not Issue numbers.*

- **WI-1 · Spinner — the unified busy indicator.** *(deps: —)* Build Spinner as a standalone component and absorb the two private implementations inside Button and Input, preserving their current appearance and removing the duplicates once verified. Carries the effort's two governance commits first: the plan's entry into `docs/plans/` with the documentation that changes because of it, then the ADR 0014 status correction. *Why first:* the smallest fully-settled contract, it retires real duplication, it unblocks WI-2, and it establishes the verification discipline the rest of the effort inherits.

- **WI-2 · IconButton — the icon-only action.** *(deps: WI-1)* An independent control, not a Button variant, composing the unified Spinner for its busy state. Self-contained: it introduces no Foundation change and touches no other component's behaviour. *Why here:* WI-1 unblocks it, and it is the last item that can be built without touching the language.

- **WI-2A · Migrate the ordinary-surface icon buttons.** *(deps: WI-2)* `PasswordToggle` and the file-list remove control become `IconButton`, gaining the minimum hit target and the owned focus indicator. Consumer-specific treatment is preserved through `className`, never by widening the component. *Why separate from WI-2:* a migration is not a component contract, and folding it in would have smuggled a visual change into an authoring Work Item.

- **WI-2B · Migrate the overlay icon buttons, and fix their visibility.** *(deps: WI-2A — both reach into `FileInput.module.css`, so they never run concurrently)* The avatar overlay and thumbnail remove controls become `IconButton`, their washes and positioning preserved. It carries an **accessibility behaviour change** rather than a migration alone: both are revealed on hover only, so a keyboard user can focus a control that never becomes visible, and the reveal is extended to `:focus-within`. The thumbnail control rises from 20px to the 24px floor, which is an intentional visual change and not preservation. *Why last in the phase:* it is the only part of the migration that changes layout and behaviour.

- **WI-3 · Typography — heading and display roles, and text emphasis.** *(deps: —)* Extend the composite text-style family with heading and display roles bound to the heading typeface, add the closed text-emphasis contract, and build the polymorphic component that consumes them. The effort's only **expected** change to the design language, and its only possible crossing into the application. *Why here:* independent of WI-1 and WI-2, and third so its value table can be settled while they ship.

- **WI-4 · Textarea — the multiline field.** *(deps: —)* A Field whose control is a native `textarea`, with its own variant model, and the `SchemaField` seam wired for `textarea` as the final integration step once the component is complete and verified. *Why here:* independent, and it is the instance that makes WI-5 legitimate.

- **WI-5 · Shared Field Layer — consolidate the field structure.** *(deps: WI-4; shaped by all four field instances — **Input, Checkbox, FileInput and Textarea**)* Extract the label, description and error structure the field components share, leaving each control its own geometry, behaviour and adornments. The accessibility half is already extracted and shared, so the layer's genuinely new content is the surrounding markup and its layout. *Why last:* the highest blast radius in the effort, and generalization machinery that must be shaped by all four real instances — **Input, Checkbox, FileInput and Textarea** — rather than three plus a projection.

## 5. Pinned decisions

*Ratified before this plan and **not reopened during implementation**. Pinned at contract level only — every value, name and internal structure below the contract is the Work Item's. §9 lands each of these in an executable owner.*

**Applying to all five.** Each is grounded by the committed product scope and belongs to this layer rather than to a feature; each is built although nothing consumes it yet. Each imports the shared prop vocabulary rather than redeclaring it, never redeclares a native attribute, and never declares a focus indicator of its own.

- **Spinner** — consumes the motion intent tier; the component owns the reduced-motion presentation and mints no token for it; `currentColor` by default with the host supplying its own colour, and an optional role, never a text token; indeterminate only; presentational by default, with announcement owned by the consuming context and the embedded case staying hidden from assistive technology; the Skeleton boundary drawn and recorded, with no shared abstraction between them.
- **IconButton** — independent of Button; its variant axis completes the one Button already opened; `circle | rounded`; three sizes with the minimum hit target as a floor on the smallest; `aria-pressed` stays native and caller-owned while the component owns only the visual response; the accessible name arrives through the native attribute and is required at the type level.
- **Typography** — polymorphic, separating visual style from semantic element, with the element required where a heading or display role is chosen; heading and display bind the heading typeface; colour is **never** part of a text style; no colour is imposed by default, the baseline arriving from the host; an optional closed emphasis vocabulary, named to avoid colliding with the control vocabulary's colour prop, carrying emphasis only and never status.
- **Textarea** — a Field, not an Adorned Control; no busy state; no stylesheet shared with Input and no duplication of it; `plain | outlined`, deliberately diverging from Input's set because the plain variant serves a composer; auto-resize as an opt-in capability, off by default; resize constrained and decoupled from the visual variant, with the invalid combination made unrepresentable; the character limit and any counter owned by the consuming feature.
- **Shared Field Layer** — extracted as its own Work Item rather than inside Textarea's; it owns the field structure and its accessibility associations, each control keeps its own geometry, behaviour and adornments; its API is deliberately open until WI-5.

## 6. Deferred decisions — *surfaced, not resolved by this plan*

Each is settled in its Work Item's Execution Preparation or its Issue, before the work that needs it. None is architectural; none is chosen here.

- **Typography's value table** — the five styles' sizes, weights and line heights, whether a tighter line height is needed for display, and the resulting font weights the application must load. *Before WI-3.*
- **How the reduced-motion presentation expresses its cadence.** That the component owns this presentation is ratified and not reopened; only its expression is open. It is **not** required to bind an existing motion token — `--motion-spin` names the indeterminate spin cadence, and reusing it for an opacity pulse would make one token carry two meanings, which is the responsibility-collapse [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 4 warns against. A component's **own choreography sits outside the binding rule rather than being an exception to it** ([`foundation.md`](../frontend/design-system/foundation.md)), which is the ground this resolves on. A Foundation token is minted **only if** implementation establishes that the value is shared language rather than the component's own — and if it is, that is escalated, not decided inside the Work Item. *Within WI-1.*
- **Migration sizing per component**, and whether any of it earns a dedicated Work Item. *At each Work Item's preparation.*
- **[Finding 0005](../architecture/findings/0005-declared-unimplemented-field-types.md)'s status treatment** once its `textarea` third is resolved — the finding stays open for radio and select, and the register's vocabulary has no value for partly resolved. *Within WI-4.*
- **Whether the variant union IconButton shares with Button is one concept or two that coincide**, and therefore whether it moves to the shared vocabulary. *Within WI-2.*
- **The Shared Field Layer's API and internal structure.** *Within WI-5.*
- **Whether a committed component grounds the language concepts it requires.** Unconfirmed and non-blocking: the ratified decisions removed every case that would have depended on it. Recorded so it is not mistaken for settled.

## 7. Risks & mitigations

- **Reopening a pinned decision under implementation momentum — the dominant risk.** *Mitigation:* §5 is the standing anchor; a Work Item that believes a pinned decision is wrong **stops and escalates** rather than working around it, and a change to a pinned decision is proposed, never taken.
- **The Spinner migration changes appearance.** Button's spinner inherits per-variant text colour across three variants, six roles and two themes; Input's binds a quieter token that the host must now supply itself. *Mitigation:* appearance preservation is an acceptance criterion, verified before the duplicates are deleted — not after.
- **The plain Textarea cannot satisfy non-text contrast.** With no border, what identifies the control is a real accessibility question, and accessibility is an owned invariant — so failure here is a **stop**, not a styling note. *Mitigation:* evaluated as a stop-risk in WI-4's Execution Preparation, before the branch.
- **IconButton's box geometry has no shared token to bind.** The control padding vocabulary is deliberately asymmetric, so a square icon button cannot bind it as a pair. *Mitigation:* the second stop-risk evaluated up front; component-owned geometry is the expected resolution, with its reason stated at the value.
- **Typography crosses into the application.** Font delivery is the application's, not the Foundation's. *Mitigation:* the ratified order — weights decided first, loading reported and approved second — and the crossing declared in the Work Item's scope rather than discovered in its diff.
- **The Shared Field Layer touches four components at once.** *Mitigation:* sequenced last, after every instance has settled, so it competes with no open branch; and its API stays open until it can be shaped by all four.
- **The absent neutral role resurfaces.** It is answered for Spinner and for IconButton's resting state by colour inheritance, but an uncoloured **toggled** IconButton still has no token expressing a persistent on-state. *Mitigation:* resolved in the foreground within WI-2 if possible; if not, it is escalated as a Foundation question and **not** solved by minting a token inside a component Work Item.
- **Scope creep through migration.** *Mitigation:* the §2 excludes list, and the standing rule that a migration earns a dedicated Work Item only when its actual scope establishes the need — never by anticipation.

## 8. Discoveries carried by this plan

*Recorded here so they are not lost between now and the Work Item that touches them. Neither is fixed opportunistically, and this plan is not their home: each becomes a Finding or an Issue at the Work Item that naturally reaches it.*

- **The motion token layer asserts a reduced-motion behaviour that does not exist.** A comment states that a press transform resolves to none under reduced motion; no reduced-motion resolution exists anywhere in the frontend. Surfaced by WI-1, which is where it should be recorded.
- **Two interactive controls inside FileInput's avatar overlay compose no focus indicator**, while a sibling control in the same stylesheet composes the owned one. Unrelated to any Work Item here; recorded when WI-2 prepares, since that is the item whose subject it touches.

## 9. Reconciliation targets

*Where each pinned decision lands when the effort completes. Named now so the destinations are known — and so that **nothing durable remains in this plan** when it goes `Historical`.*

**What landing means.** Each decision is transferred to its **natural owner** — overwhelmingly an executable one. It does **not** mean minting an ADR or authoring a document for each: a decision whose natural owner is a type, a story, a token or a source comment is fully reconciled there. [ADR 0014](../architecture/decisions/0014-document-classes-and-committed-product-scope.md) says so in terms — it sets no precedent for smaller changes, and a new token, a new component or a new Foundation member mints no ADR. One is created only where a decision meets the bar in [Documentation Strategy §8](../architecture/documentation-strategy.md), which none of §5's pinned decisions does.

- **TypeScript** — every component's props, variants and unions, including the required accessible name, the required semantic element, the closed emphasis vocabulary, and the unrepresentable invalid resize combination. The executable owner of a component's contract.
- **Storybook** — rendered appearance, states, and the accessibility gate for each new component.
- **The token layer** — the heading and display text styles, any primitive member they required, and the meaning of each emphasis value stated where a caller reads it.
- **Source comments** — the Spinner / Skeleton boundary, the reduced-motion treatment, and the reason behind each component-owned value that would otherwise surprise a reader.
- **[`foundation.md`](../frontend/design-system/foundation.md)** — updated by WI-3, as expected. Adding heading and display roles changes the typography family's architectural meaning, which [ADR 0012](../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) Decision 2 names as the case that **legitimately does require an edit** — that is the language changing, and the contract explicitly enumerates the roles the family carries. The stability rule is satisfied, not excepted: what must force no edit is adding a component or a token *member*, and no other Work Item in this effort touches the contract.
- **[Finding 0005](../architecture/findings/0005-declared-unimplemented-field-types.md)** — updated by WI-4 when its `textarea` third is resolved; it stays open for radio and select.
- **[`docs/plans/README.md`](README.md)** — the Plan Index gains a row for this plan, in WI-1's first commit.
- **[ADR 0014](../architecture/decisions/0014-document-classes-and-committed-product-scope.md)** — status corrected in WI-1's second commit, under the human's explicit one-time exception.
- Any **deviation** discovered along the way becomes a **finding**; any decision that turns out to be architectural is **proposed**, never taken.

---

> This plan owns strategy, sequencing, rationale, risk, and structure. Implementation, status, progress, and acceptance criteria are owned by each Work Item's Issue, which this plan links — never mirrors.
