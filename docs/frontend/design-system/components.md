# Design System — Component Authoring Contract

> **Status:** Active.
> **Authority:** The authoritative source for **which components belong to this layer and how one is built** — the admission test, what a shared part is, file layout, ref and styling patterns, prop vocabulary, variant model, accessibility baseline, when a story may be amended, and the ownership rule for values it does not share. It owns the **test and the conventions**, never a catalogue: which components the product has committed to is the [overview](../../project/overview.md)'s.
> **Scope:** Components and shared parts under `components/`. The layer's peer subsystems sit outside it: the design language is [foundation.md](foundation.md)'s, and `icons/` has no authoring contract today — where an icon departs from a convention stated here, the reason is at the code.
> **Stability:** Adding a component must require **no change here**. This document changes when the way we build components changes.
> **Class:** Contract ([Documentation Strategy §3](../../architecture/documentation-strategy.md)).
> **Version:** 1.2
> **Last Updated:** 2026-08-27
> **Owner:** Basel Ghonaim

## What this document does not own

A component's props, types and variants are owned by **TypeScript**, which states them executably. Its rendered appearance and interactive states are owned by **Storybook**. Its implementation details are owned by the **source**. Mechanical rules are owned by the **checks**.

**This document must not mirror any of them.** A prose copy of an executable fact has nothing enforcing it and drifts silently, which is the failure this whole documentation model exists to prevent.

## Component admission

Whether a component belongs to this layer is decided here. It is **not** the [Foundation's token-admission test](foundation.md), which admits a concept into the vocabulary and answers a different question on different evidence.

Two conditions, both required.

**It is grounded**, in the sense [ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2 defines — a platform basis, a named commitment, or a set already opened. For a component the commitment is the product's [committed scope](../../project/overview.md). A component that meets none of the three is speculative and is not built; **one that is grounded is built whether or not anything consumes it yet.**

**It belongs to the language rather than to a product surface.** The dividing question is whether its meaning survives the product: a control, an affordance or a presentational primitive any surface could compose belongs here, while something whose meaning *is* a product concept — a tweet card, a comment, a navigation surface — is a feature's, composed *from* this layer. The committed scope names both kinds and sorts neither; this test does the sorting.

Admission is not a design: deciding a component belongs here settles nothing about its API, variants or tokens.

## Shared parts

**Not everything in this layer is a component.** A **shared part** is a fragment that components compose rather than a control a consumer reaches for. It is reached only from inside the layer, never through the public surface, and no consumer names it.

**The admission test above does not apply to it.** That test asks whether a thing belongs to the language or to a product surface, and a part answers to neither: it exists because more than one component here would otherwise write the same rule, and that is the whole of its justification. A part with a single component composing it is that component's own internals under another name.

**Every other convention binds it** — file layout, styling, the shared helpers, the prop vocabulary where it takes props, the focus indicator, and the accessibility baseline. A part exists so that one rule is not written several times; one that drifts from the conventions defeats the reason it was extracted.

**A part is not a shell.** A shell selects between variants and is a component ([the variant model](#the-variant-model)); a part is composed by components that stay responsible for it.

## The authoring convention

Every component follows the same shape, so a new one is predictable to build and to consume.

**File layout** — one folder per component holding its implementation, types, stylesheet, stories and barrel. Beyond those, a responsibility earns a directory at its **second** member and stays a flat, self-describing file below it. A folder is never created empty in anticipation.

**Grouping** — components sit under the **category** they belong to, and the catalogue's taxonomy follows the same one so that code and catalogue cannot disagree. A category is created when something populates it. **A category is not an anatomy**: an [anatomy](foundation.md) is shared structural vocabulary a component may implement, a category is where its files sit, and most categories name no anatomy at all.

**Ref and identity** — forward a ref to the underlying native element, with an explicit display name. Where a component owns the element and its internals need it, the ref is **published** rather than cast: a forwarded ref may be a callback, and casting one fails silently.

**Styling** — CSS Modules for static rules, runtime custom properties for the token-driven parts. A component's root class is named for the root; the rest name a variant, a size, or a state. Class lists and custom-property merges go through the shared helpers rather than being assembled or cast at each call site.

**Prop vocabulary** — declared once in the shared contract and imported, never redeclared. Props **extend the native element**, with the attributes the vocabulary shadows omitted once. An attribute the element already owns is never redeclared as a prop.

**Variant props** — a component whose variants take different props is a **discriminated union** on the variant, so a prop belonging to one variant cannot be passed with another.

**Accessibility** — a field's identifiers and its description wiring are **derived**, not remembered, so a component cannot render a message without associating it. Validity is exposed on the element; error text is announced. Where a native control is visually replaced, the real control stays present and accessible.

**Focus** — a component **never declares an indicator of its own**; it composes the owned one. Because the element that receives focus is not always the element that should show it, the indicator provides attachment forms sharing a single definition — on the focused element, on a wrapper that owns the visible boundary, on a sibling when the control is visually replaced, and inset where a clipping ancestor would cut an outward ring.

**The rule:** a new component adopts this layout, ref pattern, styling approach, prop vocabulary and accessibility baseline. Departures are deliberate exceptions, not new defaults.

## The variant model

When a component has **materially different interaction modes**, it is built as a shell with variants:

- the **shell** owns the cross-variant concerns — the label, the messages, identifier generation — and selects a variant;
- each **variant** owns its own folder and implements a **single shared contract** the shell supplies;
- because every variant satisfies the same contract, the shell treats them uniformly and a new one slots in without changing the shell.

This is a convention available to any component, not a property of the components that use it.

## Component-owned values

Whether a value stays with the component, becomes shared, or is promoted is decided by the [Foundation's local / shared boundary](foundation.md), which owns that rule. This document adds only what follows from it when authoring.

Where a component-owned value would surprise a reader — because the surrounding code binds tokens and this one does not — **say why at the value**, briefly. That is the comment's job: the reason, not the history.

## Exceptions to a shared contract

A component that **cannot keep a shared contract does not claim it.** Where a component's behaviour genuinely differs from the interface it would otherwise implement, it is typed separately rather than implementing an interface it violates — an interface whose promise is substitutability is worthless once one implementation cannot be substituted.

The reason for such an exception belongs **at the code**, beside the thing it explains, not in a document that cannot see it.

## Amending a story

**Storybook owns what a story asserts; this owns when an author may change it.** The two separate cleanly — a story's content is not this document's, but the authority to rewrite an assertion is a question about the work rather than about the story.

A story asserts a guarantee. It is amended when **the guarantee itself changed and the Work Item authorises that change** — in its own commit, with the reason, and with the **new** assertion proved to bite.

**A story that fails because the Work Item did not authorise the change is a stop, not an obstacle.** Relaxing an assertion so a diff passes removes the guarantee the assertion existed to hold, and does it in the one place nothing else is watching: no check reads a story, and a weakened assertion still runs green.

## Component usage documentation

A component may carry its own README **when it is earned**: when usage, composition or a constraint cannot be understood adequately from its types, its stories, its source comments and these conventions.

It must not duplicate the props its types state, the states its stories render, or the rules the Foundation owns. **No component is required to have one**, and one created to fill a structural gap is documentation ceremony rather than guidance.

---

> This document owns the **authoring conventions**. The design language is owned by [foundation.md](foundation.md); the layer's boundary and navigation by [README.md](README.md); props and variants by TypeScript; rendered behaviour by Storybook; the reasoning behind an architectural rule by the ADR that records it.
