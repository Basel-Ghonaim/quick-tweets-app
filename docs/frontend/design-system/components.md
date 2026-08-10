# Design System — Component Authoring Contract

> **Status:** Active.
> **Authority:** The authoritative source for **how a component in this layer is built** — its file layout, ref and styling patterns, prop vocabulary, variant model, accessibility baseline, and the ownership rule for values it does not share. It owns **conventions**, never a catalogue.
> **Scope:** Components inside the Design System layer.
> **Stability:** Adding a component must require **no change here**. This document changes when the way we build components changes.
> **Version:** 1.0
> **Last Updated:** 2026-08-10
> **Owner:** Basel Ghonaim

## What this document does not own

A component's props, types and variants are owned by **TypeScript**, which states them executably. Its rendered appearance and interactive states are owned by **Storybook**. Its implementation details are owned by the **source**. Mechanical rules are owned by the **checks**.

**This document must not mirror any of them.** A prose copy of an executable fact has nothing enforcing it and drifts silently, which is the failure this whole documentation model exists to prevent.

## The authoring convention

Every component follows the same shape, so a new one is predictable to build and to consume.

**File layout** — one folder per component holding its implementation, types, stylesheet, stories and barrel. Beyond those, a responsibility earns a directory at its **second** member and stays a flat, self-describing file below it. A folder is never created empty in anticipation.

**Grouping** — components sit under the anatomy they belong to, and the catalogue's taxonomy follows the same one so that code and catalogue cannot disagree. A category is created when something populates it.

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

This is a convention available to any component, not a property of the ones that currently use it.

## Component-owned values

The [Foundation's local / shared boundary](foundation.md) is the rule; this is what it means when authoring.

A value stays with the component when **only that component can express it** — intrinsic geometry, its own choreography, a treatment that exists because of where the component is placed rather than what it means. Such a value is **not a violation of the binding rule**; it is outside the rule's domain, and it does not become a token because it is written as a literal.

A value leaves the component when a **second consumer must agree on the concept** — not when a second consumer happens to write the same number. Promotion goes to the layer that can own the concept, and both become consumers of it.

Where a component-owned value would surprise a reader — because the surrounding code binds tokens and this one does not — **say why at the value**, briefly. That is the comment's job: the reason, not the history.

## Exceptions to a shared contract

A component that **cannot keep a shared contract does not claim it.** Where a component's behaviour genuinely differs from the interface it would otherwise implement, it is typed separately rather than implementing an interface it violates — an interface whose promise is substitutability is worthless once one implementation cannot be substituted.

The reason for such an exception belongs **at the code**, beside the thing it explains, not in a document that cannot see it.

## Component usage documentation

A component may carry its own README **when it is earned**: when usage, composition or a constraint cannot be understood adequately from its types, its stories, its source comments and these conventions.

It must not duplicate the props its types state, the states its stories render, or the rules the Foundation owns. **No component is required to have one**, and one created to fill a structural gap is documentation ceremony rather than guidance.

---

> This document owns the **authoring conventions**. The design language is owned by [foundation.md](foundation.md); the layer's boundary and navigation by [README.md](README.md); props and variants by TypeScript; rendered behaviour by Storybook; the reasoning behind an architectural rule by the ADR that records it.
