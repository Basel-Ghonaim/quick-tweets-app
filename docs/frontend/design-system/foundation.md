# Design System — Foundation Contract

> **Status:** Active.
> **Authority:** The authoritative source for the Design System's **design language** — the token tiers, what admits a concept into the vocabulary, where a token is declared, how themes resolve, and where the boundary runs between shared language and values a consumer owns. It states the **operative contract**. Where a rule was decided by an ADR, that ADR owns the reasoning and this document cites it; where no ADR owns a rule, this document owns both the rule and its reason, and none is created for it ([ADR 0012](../../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) Decision 5).
> **Scope:** The design language, independently of who consumes it.
> **Stability:** This is a contract, not a description of the system's current state. Adding a component, a token member, or a feature must require **no change here**. A new token *family*, or a change to an existing family's architectural meaning, is what changes it.
> **Class:** Contract ([Documentation Strategy §3](../../architecture/documentation-strategy.md)).
> **Version:** 1.3
> **Last Updated:** 2026-08-21
> **Owner:** Basel Ghonaim

## What the language is for

A consumer declares **intent** — a primary action, an invalid field, a raised surface — and the Design System is the sole authority on what that looks like ([ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md)). Consumers own composition and content; the system owns the language they compose in.

The language **precedes its consumers**. A rule here is not made valid by the number of components that bind it, and does not become invalid when one is removed or replaced.

## The tiers

Every visual value is a CSS custom property, and every family sits at one of two tiers.

**Primitive** — a curated scale. A step on it has no meaning beyond its position: a palette entry, a spacing step, a type size. Primitives exist so that the values a designer chooses are finite and deliberate.

**Intent** — a named role. It says what a value is *for*, not what it is, and it is the tier a consumer normally binds. A family reaches this tier only by earning it ([ADR 0011](../../architecture/decisions/0011-intent-layer-earned-not-assumed.md)); **a family that earns no intent tier is a result, not a gap**.

### Which tier a consumer binds

Bind the **intent** tier wherever the family has one. That is the whole point of the tier: it survives a change of value, and it is what makes the system re-themeable.

Bind a **curated scale directly** only where the family carries its tier on the scale itself — where a step *is* the vocabulary and no role could add meaning. Composing internal layout from a spacing scale is the ordinary case; reaching into the palette is not, because colour always has a role.

**A missing token is a stop, not a licence to reach lower.** The first reach for a primitive is what reintroduced the drift this layer was rebuilt to remove. Extend the vocabulary deliberately, or keep the value local.

**A stop is an escalation, not a refusal.** It halts *silent* invention — reaching into a primitive, or writing a literal, because the vocabulary was thin at the moment of need. It does not halt the vocabulary from growing: the sentence above already prescribes extending it deliberately, and that is the route a stop **opens** rather than closes. What a stop forbids is one author deciding it alone and in passing.

**A design need the vocabulary cannot express is evidence the vocabulary is incomplete, never evidence the design is wrong.** Design leads the language and settles what it must be able to say; this contract settles where a value lives, what tier it sits at, and what it is called. The two are not in competition, and neither is subordinate: an extension is proposed, reviewed and merged like any other change to this layer, and it becomes canonical on the same human-authorized merge.

## What is language, and what is not

The binding rule governs the **presentation language**: colour, spacing, typography, motion, elevation. A value that is not language is **outside the rule rather than an exception to it** — a component's intrinsic geometry, its own choreography, an implementation detail.

The question is never *"is this a literal?"* but **"is this something consumers must agree on?"**

## Token admission

**This section admits a concept into the vocabulary. It does not decide whether a component exists** — that is the [authoring contract](components.md)'s, and it turns on different evidence. The tests are not interchangeable: *coincidence is not identity* and *roles are admissible, granularities are not* are claims about tokens, and applying them to a component set produces answers about nothing.

**A token names a shared design concept, never a shared value.** Two consumers writing the same literal is not a token; the language is what they must *agree* on. Conversely, two roles that resolve to the same value stay two tokens — **coincidence is not identity**.

Several consumers make a concept obvious, but consumer count is **evidence, never a gate** ([ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2). A concept may be admitted with one consumer or none if it is genuinely part of the language; a value may be refused with several if they merely coincide.

**Roles are admissible; granularities are not.** Naming a role is a claim the language can make. Naming how many steps a ramp has is a claim about the product, which only a design settles.

**Values are provisional.** Authoring a role ahead of a design is safe precisely because a value is a swap; it must never harden into a commitment to the value.

### Building and writing ahead of a consumer

The language precedes its consumers, so *"nothing uses it yet"* is never the question. The question is whether the need is **grounded** — and what may be *written* about something unbuilt is a separate question from whether it may be *built*.

| Act | Verdict |
|---|---|
| Building a concept the product has committed to, before any consumer exists | ✅ grounded — [committed product scope](../../project/overview.md) is the evidence |
| Building something with no platform basis, no commitment, and completing no open set | ❌ ungrounded — reserved, not built ([ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2) |
| Writing down committed scope, declared as a commitment | ✅ the Commitment class ([Documentation Strategy §3](../../architecture/documentation-strategy.md)) |
| Writing something unbuilt as though it exists | ❌ Principle 5, unchanged |

Consumer count belongs to none of these rows. Where it applies is narrower and elsewhere: **generalization machinery** waits for a second instance to shape it ([Engineering Principles §3](../../development/engineering-principles.md)).

## The local / shared boundary

This is the single home for the rule; other documents link to it.

A value stays with its owner until a shared design concept is actually established:

- **Component-local** — intrinsic geometry, choreography, and treatments only that component can express. A control's own dimensions, an animation's curve, a wash that makes a control legible over unpredictable media.
- **Feature- or page-local** — composition and identity belonging to one product surface. A page's brand treatment is not design language because nothing else must agree with it.
- **Shared** — a concept more than one consumer must agree on, whether or not more than one exists yet.

**Promotion is by concept, not by repetition.** When two owners need the same *concept*, neither depends on the other: the concept moves to the layer that can own it and both become consumers. When two owners merely happen to use the same *value*, nothing moves.

**A prototype is not a source of the language.** An implementation built before the design exists is evidence that a concept may be missing — never the definition of the concept, and never the source of its value. Which implementations are prototypes is not this document's to say, since it names no consumer; the [frontend architecture](../architecture.md) identifies them.

## Naming — the prefix carries the rule

A family's prefix names the anatomy that owns the concept, and the prefix is part of the contract because it tells a reader whether a token applies to them.

- **Role** — a semantic visual role such as primary or error. **Never the ARIA `role` attribute.** Anything that carries a role binds it, including components that are not controls.
- **Control** — what only an interactive control has: its density, its disabled and loading emphasis, its minimum hit target, its selection geometry.
- **Field** — what the Field anatomy owns: its label, its description, the space between its stacked parts.

**Typography is the one family the anatomy prefix does not govern**, because a typographic role is not an anatomy. Text styles are composite — weight, size, line height and family bundled into one declaration, so a call site applies a whole style and cannot pick it apart. Four roles exist: **label**, text whose purpose is to name or identify; **body**, text read as content; **heading**, text that titles the content beneath it; and **display**, the one piece of text a surface is built around. An alert's title is a label though an alert is not a control, and a heading is a heading whether or not it is carried by a heading element — a role says how text reads, never which element carries it.

Typographic **sizes are typographic**, not a control's density. A component decides how its own size maps onto them, and that mapping is a component choice rather than a rule.

## Residency

**A token whose value varies with a resolution axis is declared under that axis in every one of its resolutions, and never axis-invariantly.** The two selectors match the same element at equal specificity and the axis-invariant declaration loads afterwards, so a token declared in both would outrank every resolution instead of being overridden by one — silently, and in the opposite order from how contrast is verified.

**Theme is a resolution axis, not a tier** — the first of possibly several, which is why it is structured as one axis among others rather than as the whole concept. Every theme resolves the same keys, so switching is setting one attribute and no component participates.

A key whose value is identical across resolutions is still declared in each: uniform values are permitted, an axis-invariant shortcut is not.

## Disposition

**Every token family declares its status** — `active`, `superseded`, or `intentionally-unconsumed` — and the declaration must agree with where the family sits.

**This is not a consumer check.** A family nobody uses may be perfectly good curated vocabulary; what is not acceptable is a family whose status nobody has decided. An undecided family is how a wrong assumption gets planned around.

A family becomes **superseded** only when its replacement **exists and has been proven**, at which point it moves to the retirement route and is deleted mechanically. Until then it stays at its tier however old it is — parking an asset there without a proven replacement is how something still in use gets deleted.

## Anatomy

Shared structural vocabulary, because the naming prefixes above are meaningless without it. Two structures, composable rather than nested — the second is not the first's inner detail.

**Adorned Control** — *prefix · control · suffix*. A control flanked on the inline axis by affordances whose composition it owns. A caller supplies a node per side and never a layout, so supplying one can never displace an affordance the control composes itself.

An affordance is **decorative** or **interactive**, and that distinction settles four things at once: whether it is focusable, whether it needs an accessible name, whether it carries the owned focus indicator, and whether it must meet the minimum hit target. It is decided by **interactivity, never by appearance** — an indicator can look like a control and not be one.

**Field** — *label · control slot · description · error*, with the wiring that associates them. The association is derived, not remembered: a field cannot render a message without linking it.

The two are independent. A Field whose control is an Adorned Control is both; a control with affordances and no label is only the first.

**The boundary.** Prefix and suffix are positions on the inline axis. A block control whose affordances sit at an edge is not an Adorned Control, and widening the shape to admit one is how a superset of every consumer's needs gets built instead of a contract.

**This is vocabulary, not structure.** Naming an anatomy does not create a component that implements it.

## Enforcement

These rules are **mechanically enforced wherever they can be**, and the checks in the layer are the authority on what is enforced — not a list here, which would go stale the first time one was added. **A rule earns a check once its failure has actually been observed**, so the check set records what has gone wrong rather than what might.

What a check cannot decide stays a review judgement: a check can see that a reference resolves and where a token is declared, but not whether the tier a consumer chose was the right one.

---

> This document owns the **design language**. How a component in this layer is built is owned by [components.md](components.md); the boundary, ownership model and navigation by [README.md](README.md); the reasoning behind a rule an ADR decided by that ADR; props and variants by TypeScript; rendered behaviour by Storybook.
