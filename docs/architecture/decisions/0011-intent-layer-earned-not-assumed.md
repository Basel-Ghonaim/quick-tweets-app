# ADR 0011: The Intent Layer Is Earned, Not Assumed — Tiering by Role Rather Than by Token Type

> **Status:** Accepted
> **Date:** 2026-08-04
> **Deciders:** Basel Ghonaim
> **Amends:** [ADR 0010](0010-design-system-platform-reestablishment.md) — Decision 3
> **Revised:** 2026-08-05 — Decision 1 now cites ADR 0010 Decision 2's corrected test for *speculative*; the criterion itself is unchanged.

## Context

[ADR 0010](0010-design-system-platform-reestablishment.md) Decision 3 established the three-tier token model and declared it **token-type agnostic** — *"it governs color, spacing, typography, elevation, motion, and any future token type **identically, and is defined once for all of them**."*

Colour proved the model. The clause was never tested against a second family until **WI-4A**'s preparation asked what a semantic tier for spacing, typography, border, shadow and motion should contain — and the agnosticism clause turned out to carry an ambiguity that only a second family could expose. *Governed identically* can mean **the model is authored once and applies to any family**, or it can mean **every family populates every tier**. Colour alone cannot distinguish the two readings, because colour populates all three either way.

Read as uniform population, the clause manufactures vocabulary: an intent name such as `--control-border-width-thin` would stand for exactly one value that has no second purpose and no axis along which it could ever resolve differently. Naming that is not abstraction; it is ceremony, and unwarranted names are the origin of the token sprawl that makes mature systems unusable at scale.

The question reached this ADR as a binary — author an intent tier for **every** family, or let a curated scale be the binding surface for any family that **does not re-theme**. Both proposed tests are wrong, and wrong in opposite directions:

- **Re-theming is too narrow.** Theme is one contextual axis among several this system has already committed to. **Decision 6** commits to a script-aware typography seam and direction-agnostic authoring; the accessibility contract raises **reduced motion**; density is a standard demand on any control vocabulary. Each is a resolution axis of exactly the same shape as theme, and a test that recognises only theme is blind to all of them.
- **Token type is too broad.** It forces the tier to be populated by symmetry rather than by need, and pays the sprawl cost for families that will never use it.

The test that survives both is neither. A family needs an intent layer when it has **a vocabulary of purposes distinct from its vocabulary of values** — and the reason a design system exists at all is to own the mapping from **declared intent to appearance** (Decision 1). Where a family has purposes, leaving that mapping inside components scatters the system's own authority across its consumers. Where a family has only magnitudes, an intent name adds a hop and names nothing.

## Decision

1. **The intent (semantic) layer is earned, not assumed.** A token family populates the semantic tier when — and only when — it meets at least one of two conditions:
   - **(a) Contextual resolution.** Its values must resolve differently along some contextual axis — theme, density, reduced motion, script, direction, brand, platform.
   - **(b) Role divergence.** Two of its values are the same magnitude today but serve different purposes, so they must be free to diverge. This is the condition the fill / on-surface split already satisfied, and it applies **I4** and ADR 0010 Decision 4 unchanged.

   A family meeting neither is bound directly from its **curated primitive scale**, and its semantic tier stays **empty until a reason appears**. "A reason" is ADR 0010 Decision 2's test — a platform basis, a named commitment, or an axis this family completes — not the presence of a consumer.

2. **Token-type agnosticism means the model is defined once, not that every family populates every tier.** The architecture is authored once and governs any family, present or future; which tiers a given family populates is decided by the criterion in Decision 1. The **Component** tier was already optional under ADR 0010 Decision 3; the **Semantic** tier is now optional on the same terms and by the same reasoning. The tiers themselves, their order, and their meanings are unchanged.

3. **The binding rule is restated, not relaxed.** A consumer binds to the **semantic** token where its family has one, and to the **curated primitive scale** where its family has none. **Hardcoded literals remain prohibited without exception** — that half of the rule is not touched, and a family without a semantic tier is not a licence to write a raw value.

4. **Where a family qualifies, its intent vocabulary names roles in the language, never parts of components.** `--control-padding-inline-small`, shared by every control, is the shape; `--button-padding-inline-small`, `--input-padding-inline-small` and one per component is the failure mode that turns a fifteen-token vocabulary into a seven-hundred-token one at thirty components. Component tokens remain permitted, scoped, and derived — they name a component's local concerns, never a new intent.

5. **The classification that results from applying the criterion today.** This is the criterion's **output**, not a second rule; a family moves when its evidence changes, and the criterion governs.

   | family | tier | why |
   |---|---|---|
   | **Colour** | intent | theme is (a); the fill / on-surface split is (b) |
   | **Typography** | intent | script-aware resolution and density are (a) |
   | **Motion** | intent | **reduced motion is (a)** — the same structural need theme creates for colour |
   | **Spacing** | **hybrid** | control-scoped spacing qualifies under (a) via density; **layout spacing does not** and continues to bind the scale directly |
   | **Border radius, border width** | scale | neither condition met; a second brand would introduce (a) for radius, and the tier is authored then, not now |
   | **Shadow** | undecided | classified at its first consumer — not to gate admission, but because whether black shadows on a dark surface force a theme resolution is *evidence* only a rendered consumer supplies |

6. **Typography's intent tier is composed of text styles, not sizes.** Where typography qualifies it exposes **composite styles** — size, weight, line-height and tracking bound together as one named intent — because those values are never independently chosen and choosing them separately is how typographic consistency decays. A font-size ramp with a separate weight token is not a semantic typography tier; it is the primitive scale with extra names.

7. **Layout spacing is the consumer's, not the system's.** The Design System owns the language controls are composed in; page rhythm is composition, which **Decision 8** already places outside its ownership. The spacing hybrid is that boundary made concrete rather than a new exception to it.

8. **Any future family expansion is justified against the criterion in Decision 1** — never by token type, and never by symmetry with a family that already has a tier.

9. **Amendment to ADR 0010 Decision 3.** ADR 0010 remains **Accepted**; this ADR amends one clause of one of its decisions:
   - The **token-type agnostic** clause — *"governs … identically, and is defined once for all of them"* — is narrowed to **definition, not population**: the model is authored once and governs every family; which tiers a family populates follows Decision 1 above.
   - The **binding invariant** — *"a consumer binds only to semantic tokens … never primitives, never hardcoded values"* — is amended to Decision 3 above: **semantic where the family has one, the curated scale where it does not, never a hardcoded value.**

   Everything else in ADR 0010 stands unchanged, in particular the three tiers and their meanings, **Decision 4** (theming as a complete resolution at a single root boundary, key-parity, responsibility-purity), and **Decision 5** (accessibility as an owned invariant).

## What this ADR does not decide

- **Where a reduced-motion resolution lives.** Decision 1(a) establishes that motion *has* a contextual axis and therefore earns an intent tier. It does not decide the mechanism, and it does not extend ADR 0010 Decision 5's enumerated guarantees (contrast, a single focus indicator) to motion. The known complication is recorded so it is not lost: collapsing an animation's duration to zero freezes a spinner mid-rotation, which is worse than the motion it removes — so a token alone is not a sufficient mechanism.
- **Concrete token names, values, or the size of any intent vocabulary** — Execution Plan and implementation concerns, unchanged from ADR 0010's deferrals.
- **Shadow's classification** — deferred to its first consumer, by Decision 5's own reasoning.

## Alternatives considered

- **Uniform intent tier for every family (Option A).** Rejected on the merits, not on effort. It has the real virtue of a bright line — no judgement per family, nothing to litigate — and bright lines are undervalued in long-lived systems. But it buys that by naming things that have no purpose to name, and its failure mode at scale is **token sprawl**, which is more damaging than a boundary that requires judgement: sprawl ends adoption, whereas a criterion costs review time. It would also have produced a typography tier shaped as a size ramp, which is the wrong shape regardless of the tiering question.
- **Scale-direct binding for every family that does not re-theme (Option B).** Rejected. Its test is true only if theme is the only context that will ever vary, and this system has already committed to script-awareness and to an accessibility contract that raises reduced motion. It removes the seam precisely where the most likely future changes land. It is also, structurally, a **retroactive ratification of an accident** — the components predate the system, and B's outcome is indistinguishable from leaving them as they are.
- **Deferring the question until more components are migrated.** Rejected: WI-4A authors the vocabulary that WI-5 through WI-8 then bind across five components and Auth. Deciding after those bindings exist is deciding after it is expensive to change, which is the failure `pilot-first` exists to prevent.

## Consequences

- **Accepted:** the boundary now requires **judgement per family** rather than a mechanical rule, and judgement can drift. Mitigation: the criterion is stated as two testable conditions, and any expansion must name which condition it meets — an expansion that cannot is refused.
- **Accepted:** the classification in Decision 5 will be revisited as consumers arrive. A family moving from scale to intent later is **normal extension of a stable foundation**, not evidence the criterion was wrong — the same stance the execution plan's **D10** takes toward tokens a future page needs.
- The mechanical checker cannot enforce Decision 1: it resolves references and is blind to whether a bound token is a scale position or an intent. **I1 becomes partly review-enforced** where it was fully mechanical in intent. This is a real loss of enforceability and is accepted knowingly; it is also true of the prohibition on hardcoded literals, which the checker already cannot see.
- Motion gains an intent tier for a **structural** reason rather than a stylistic one, which makes resolving reduced motion in the token layer the natural mechanism when that decision is taken.
- **Superseded / amended records:** ADR 0010 Decision 3 is **amended** as in Decision 9; ADR 0010 remains **Accepted** and is otherwise unchanged. The [Design System execution plan](../../plans/design-system-reestablishment.md) updates its binding invariant, WI-4A, and the migration Work Items accordingly. The Design System documentation is **not** amended here — its rewrite to the re-established architecture is owned by **WI-10A**, which now carries this decision.
