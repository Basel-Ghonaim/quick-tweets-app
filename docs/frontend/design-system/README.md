# Design System

> **Status:** Active.
> **Authority:** The entry point for the Design System's documentation — its boundary, its ownership and stability model, its public surface, and where each kind of information lives. **It states no design rules of its own**; it names the document that owns each one.
> **Version:** 1.1
> **Last Updated:** 2026-09-22
> **Owner:** Basel Ghonaim

## What the Design System is

A **platform that owns the product's presentation language** ([ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md)). A consumer declares intent — a primary action, an invalid field — and the system is the sole authority on what that looks and behaves like.

It is a platform, not a feature: features depend on it, it depends on none, and it never imports one.

## What it owns, and what it does not

**It owns** the design language, the conventions for building the components inside it, and the boundary between the two.

**It does not own** the values a consumer uses that are not shared language. A component's intrinsic geometry, a feature's composition, a page's brand treatment — these stay with their owner until a shared concept is actually established. The Design System **defines shared design language; it does not own every value used by the product.**

**It owns no global stylesheet.** It resets nothing, styles no bare element, and applies nothing to the document — that markup belongs to the application, which sets its own ground and mounts the layer. For the same reason the vocabulary **names** a typeface and never loads one: which face to use is the language's, how it is delivered is the application's, and a platform that hardcoded a host would be choosing one for every consumer.

## Foundation and consumers

The two are independent, and conflating them is the error this structure exists to prevent.

| | |
|---|---|
| **Foundation completeness** | every question in the language's domain has a decided answer |
| **Consumer adoption** | how many components, features or pages bind it |
| **Product completeness** | how much of the product is built |
| **Product commitment** | what the product has decided is part of it — the [overview](../../project/overview.md)'s |

**Only the first is the Design System's**, and a Foundation with settled rules is stable at zero adoption. The language **precedes its consumers** ([ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 2), so consumer count is evidence about a concept — never a gate on it, and never a measure of whether the Foundation is sound.

**The stability contract:** adding a component, a token member, or a feature must require **no change to a contract document**. If one is needed, the document was describing adoption rather than defining a contract, and that is a defect ([ADR 0012](../../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md)).

## The public surface

**The barrels are the only public surface.** Everything inside a component — variant folders, hooks, parts, helpers — is private implementation. A consumer imports the layer's root and nothing deeper, and the layer never imports itself through its own alias.

That boundary is what keeps the internals free to move: a restructure is cheap precisely because no consumer can see it.

## Where each fact lives

One fact has one canonical owner. Every other document links to it and none redefines it.

| Question | Owner |
|---|---|
| What does this token mean? Which tier, and when do I bind it? | [foundation.md](foundation.md) |
| When does a value stay local, and when is it shared? | [foundation.md](foundation.md) |
| Why does this rule exist? What was rejected? | the [ADR](../../architecture/decisions/) it cites, where one decided it; otherwise the document stating the rule |
| Does this concept belong in the vocabulary? May I build it with nothing consuming it? | [foundation.md](foundation.md) |
| Does this component belong to this layer, or to a feature? | [components.md](components.md) |
| Which components has the product committed to? | the [project overview](../../project/overview.md) |
| How do I build a component in this layer? | [components.md](components.md) |
| How do I use a particular component? | that component's own README, where one is earned |
| How does a feature or page compose the system? | documentation beside the module that owns it |
| What does this component look like and do? | Storybook |
| What props does it take? | its TypeScript types |
| What is mechanically enforced? | the checks in the layer |
| Where is any of the above, from inside the code? | the map at `apps/web/src/shared/design-system/README.md` |

**Executable sources outrank prose.** Where TypeScript, Storybook or a check states a fact, documentation links to it and does not mirror it — a mirror has nothing enforcing it.

## Related boundaries

Schema-driven **form binding** is owned by the [frontend forms](../forms.md) document; this layer owns only the controls that seam consumes. A circular dependency between the two was recorded in [Finding 0001](../../architecture/findings/resolved/0001-schema-form-design-system-cycle.md) and has since been resolved one-directionally.

The **application layout** is owned by [frontend architecture](../architecture.md), and the **design principles** these conventions apply by [Engineering Principles](../../development/engineering-principles.md).
