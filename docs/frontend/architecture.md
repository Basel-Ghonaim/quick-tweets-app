# Frontend Architecture

> **Status:** Active.
> **Class:** Contract ([Documentation Strategy §3](../architecture/documentation-strategy.md)) — the outer architecture it states is a rule, not a report of the current tree.
> **Authority:** The authoritative source for the frontend's **outer architecture** — the four zones (`app/` · `pages/` · `features/` · `shared/`), the dependency boundaries between them, the page-group contract, the composition root, and the thin platform utilities no other document owns — and for the **capability structure**, the one internal organisation every capability shares. It owns the **structure between subsystems** and the layers a capability is organised in, not any subsystem's mechanism: each platform subsystem's mechanism is owned by its own document (see the platform index below), per-feature behavior by the feature documents, the system topology and request lifecycle by the [system overview](../architecture/system-overview.md), and the underlying principles by [Engineering Principles §3](../development/engineering-principles.md).
> **Scope:** The structure of `apps/web/src/` — how the frontend is zoned, how the zones may depend on each other, where features meet the platform, and how each capability inside them is organised.
> **Maturity:** This document describes the **intended and settled** architecture; where the code currently deviates from a rule, the deviation is **recorded in the [findings register](../architecture/findings/)** — never silently absorbed into this document. The capability structure was written once authentication, recovery, the session and channel verification had been built in two different shapes, and reconciles them ([Engineering Principles §3](../development/engineering-principles.md)). Anything not described here is not yet stabilized, not architecturally rejected.
> **Version:** 3.0
> **Last Updated:** 2026-09-15
> **Owner:** Basel Ghonaim

## Why zones at all

The frontend is divided so that **things that change together live together, and things that change for different reasons cannot reach into each other**. Product features churn with product decisions; the platform evolves slowly behind stable surfaces; assembly changes only when the application's composition changes. Giving each kind of change its own zone — with dependencies allowed in only one direction — bounds the blast radius of every change: a feature can be added, reworked, or removed without touching its neighbors, the platform can evolve without knowing who consumes it, and all wiring is absorbed by a single place instead of leaking everywhere.

## The shape: four zones

The frontend is divided into four zones with distinct roles ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 1):

- **`app/` — the composition root.** The only place where the application is assembled: the store is composed, shared infrastructure is wired to app-layer dependencies, and the router mounts the route subtrees. It holds no business logic and no UI beyond the app shell.
- **`pages/` — the composition.** One folder per **page group**: a URL subtree with the layout its routes share. A page group arranges capabilities, holds the route and the layout, and owns the loading, error and empty states of the arrangement. It is the only zone permitted to import several features, and it owns no fact.
- **`features/` — the capabilities.** One folder per capability: a fact and the operations on it. A feature owns no route, no layout and no other feature, and it may legitimately have no UI at all.
- **`shared/` — the platform.** Mechanisms and vocabulary no single feature owns — transport, errors, forms, the design system, the query cache — plus the platform capabilities that meet [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6, product content, cross-tier definitions, and a few thin utilities. `shared/` may know the product's nouns and its words; it may never know a **feature**.

The whole document in one line:

```text
app assembles  ·  pages compose  ·  features own  ·  shared provides
```

## The dependency rule

Dependencies point in **one direction**:

```text
app  →  pages  →  features  →  shared
```

Each zone may import the zones below it and never a zone above.

- **`shared/` imports nothing** from `features/`, `pages/` or `app/` — the platform never depends on a feature, on a composition, or on the application that hosts it.
- **`features/` import `shared/`**, never `pages/` or `app/`.
- **`pages/` import `features/` and `shared/`**, never `app/`. A page may not reach transport directly and may not own state.
- **`app/` may import all three** — composing them is precisely its job.

**A slice never imports a sibling in its own zone**: one feature never imports another, and one page group never imports another. **The rule does not reach `shared/`**, which is divided by mechanism rather than by domain, so its parts compose one another freely; what bounds them is the direction above ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 1, as revised).

**Story files are exempt from the zone direction** — a story renders a thing in the composition a reader actually meets, and that composition is a page (Decision 9). Production code is not exempt.

Three mechanisms carry the boundaries:

- **Path aliases** — `@app/*`, `@pages/*`, `@features/*`, `@shared/*` — declare an import's zone explicitly at the call site.
- **The root barrel** — a capability or page group is consumed only through its root `index.ts`. Anything not exported there is private.
- **Checks rather than review** — the direction, the sibling rule and a page's transport boundary are held by `apps/web/src/zones.test.ts`, and each capability and page group holds its own rules in its `boundary.test.ts`.

Where shared infrastructure genuinely needs app-layer knowledge (the auth client needs the store's token), the dependency is **inverted** rather than allowed to point backwards: the platform exposes a setup seam and the composition root injects the dependency (the mechanism is the [frontend API client](api-client.md)'s). This layout is the frontend application of the layering, acyclicity, and platform-vs-feature principles ([Engineering Principles §3](../development/engineering-principles.md)).

Where a platform component must *render* something the application owns, the element is taken rather than the dependency. Navigation is the case: the router is mounted by the composition root and a router's link throws outside it, so a presentation component that imported one could not render on its own. The Design System's `Link` accepts the navigating element from its caller instead, restricted by the props that element must accept rather than by a list of tags — which is why the layer holds no router and needs none. **A seam is the answer when the platform must call the application; taking the element is the answer when it only has to render one.** When a second component needs to navigate, that repetition earns the seam and this converts to the inversion above.

These rules are the **intended architecture**. An import that violates them is an **implementation deviation** — recorded in the [findings register](../architecture/findings/), never treated as part of the design.

## The composition root

Assembly happens once, at the edge, in a fixed order:

1. **Bootstrap** — before anything renders, the entry point runs the bootstrap step, which wires shared infrastructure to app-layer dependencies (injecting the token getter and session callbacks into the auth client — the inversion described above).
2. **Providers** — one component nests every provider the application mounts, so the entry point holds a single child and the nesting order lives in one place rather than at the edge. The composed Redux store is among them, itself a composition: each capability that owns state contributes its slice — a feature's or the platform's, since the platform may own one ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md)) — and the shared data layer contributes its API slice and middleware, under one store.
3. **The app shell** — the router mounts each page group's route subtree, and starts session restore without gating first render on it (a hook the platform's session provides).

The design system's foundations (tokens and themes) are loaded once at the entry as a side effect, so every feature renders against the same visual base. **Which** theme, and the direction the document reads in, are settled before any of that: both are resolved by the Design System and *selected* by the application ([ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 4), and the selection is stamped on the document from the markup, ahead of the first paint, because a module cannot run early enough to avoid a flash.

The composition root is deliberately **thin**: it wires and constructs the dependencies it injects, but implements no feature behavior of its own. Any logic found in `app/` beyond assembly is misplaced.

## The page-group contract (outer)

**A page group publishes a route subtree; a capability publishes none** ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 2). The rule sits on the thing that owns routes, so a capability that owns none — liking, following, editing a profile — is not pushed out of the zone by the wording.

What a page group promises the rest of the application:

- It is a **self-contained folder** under `pages/` — everything the composition owns lives inside it.
- Its **root barrel is its only public surface**, and what it offers is the **route subtree**. A group exposing its screens one by one would let the composition root learn which screens exist and what they are called; exposing the subtree instead means the composition root decides **whether and where** the group is mounted while the group keeps **what is inside it**, and a new screen never widens the surface.
- It **composes capabilities** and holds none of their logic, reaching each only through its root barrel.
- It **owns no fact**: it may not reach transport directly, and it may not own state.
- A group is a **routing and layout unit, never a domain claim**. One may hold routes with opposite access modes, so an access guard belongs visibly at each route and is never inherited from the group.

What a capability promises is the [capability structure](#the-capability-structure), which follows — and it applies to a page group only in spirit: a group is organised for the same reasons, but the layers below are a capability's.

## The capability structure

A **capability** owns a fact and the operations on it. It is either a feature ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 3) or a platform capability — the session, channel verification — that meets [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6. **Every capability is organised the same way.** Two capabilities differ in what they hold, never in where a given kind of thing lives: one with no interface or no store has fewer layers than one that has them, and nothing else distinguishes them.

It does not govern the platform's **mechanisms** — the design system, the form engine, the error pipeline, the transport and the query cache — each organised as its own document says, nor the thin utilities below.

### The layers

| Layer | Holds | Present when |
|---|---|---|
| `index.ts` | the capability's public surface | always |
| `model/` | its vocabulary: its entities, and the types more than one of its layers shares | always |
| `gateway/` | its port to the server, the implementation that fulfils it, and the wire shapes and the mapper between them and the model | it reaches the server |
| `services/` | logic that runs without a renderer: orchestration, policy, pure reducers, error handling applied to a normalised error | it holds logic beyond a call |
| `store/` | its slice, the state shape and payloads only the slice uses, its selectors and typed store hooks | its state outlives the component that reads it |
| `forms/` | its form definitions — the fields and the validators they compose | it takes input through the [form engine](forms.md) |
| `hooks/` | everything its interface needs, composed from the layers beneath | React consumes it |
| `screens/` | presentation | it owns the interface that *is* its interaction |
| `boundary.test.ts` | the checks that hold this section's rules for this capability | always |

**A layer a capability does not need is absent, not empty.** Nothing else sits at a capability's root: a file that fits no layer shows the table to be incomplete, which is a change to this section rather than an exception to it. Inside a layer, grouping is the capability's own — a flow under `services/`, the steps of one screen under `screens/`.

### The rules

- **The root barrel is the only way in.** Nothing outside a capability imports past its `index.ts`, and nothing inside it imports itself through its own alias. A capability exposes no second barrel.
- **Each layer carries its own `index.ts`.** It declares what the layer offers the rest of the capability: a file reaches another layer through that barrel, and a sibling in its own layer directly. A layer barrel is internal — nothing outside the capability imports one, so it is not a second way in.
- **Dependencies inside a capability run downward.** `screens` use `hooks`; `hooks` use `services`, `forms`, `store` and `gateway`; `services` use `store` and `gateway`; every layer may use `model`. Nothing imports a layer that uses it.
- **A screen presents.** It renders what its hooks return and calls what they expose. It composes no gateway, runs no orchestration, and holds no rule the server also states ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 6); a route or a step that belongs to someone else reaches it from the page that mounts it (Decisions 2 and 4).
- **A capability's calls to the server live in its own gateway.** The [transport](api-client.md) supplies the clients, the envelope and the interceptors, and holds no capability's endpoints.
- **A capability's boundary is held by its own test.** `boundary.test.ts` checks at least that the capability is reached only through its barrel, that it imports nothing its zone forbids, and — where it has no `screens/` — that it holds no component, stylesheet or story. Whatever the decision that governs the capability adds, it checks too.
- **A platform capability has no `screens/` while [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6 holds**, because under it the platform publishes no product interface. The rule follows that decision and changes with it; where a platform capability's interface lives when a product surface needs one is not settled here.

The rules above state the target. Which capabilities do not yet meet them is the findings register's to say, not this section's; [Finding 0030](../architecture/findings/0030-the-capabilities-predate-the-structure-they-share.md) records where each stood when this section was written.

## The platform index

`shared/` admits four kinds of thing, and nothing that is a feature's ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 5): **platform mechanisms**, **platform capabilities** that meet [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6, **cross-tier deterministic definitions**, and **product content**. Each is owned by its own document where it has one — this index is the map, not the content:

| `shared/…` | Kind | What it is | Owning document |
|---|---|---|---|
| `api/` | mechanism | how a request leaves the frontend | [Frontend API Client](api-client.md) |
| `rtk-query/` | mechanism | the second transport, and the cache built on it | [Frontend API Client](api-client.md) for the transport; the frontend state-and-data document *(deferred)* for the cache |
| `errors/` | mechanism | the error-normalization pipeline | [Frontend Error Handling](error-handling.md) |
| `schema-form/` | mechanism | the schema-driven form engine | [Frontend Forms](forms.md) |
| `design-system/` | mechanism | tokens, theming, component conventions | [Frontend Design System](design-system/README.md) |
| `routing/` | mechanism | the navigating element the Design System takes, and what a destination carries with it | this document, until it has a stable core |
| `one-time-code/` | mechanism | how a typed code is normalised before anything reads it | this document, until it has a stable core |
| `preferences/` | mechanism | which resolution of the design language is active — theme selection and the document's direction | this document, until it has a stable core |
| `session/` | capability | who is signed in, with what token, whether that is settled, and its restore, refresh and ending ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md)) | [Frontend API Client](api-client.md) for the token's residence; the lifecycle awaits its own document |
| `channel-verification/` | capability | proof of control over a communication channel, on this tier ([ADR 0009](../architecture/decisions/0009-channel-verification-platform-capability.md)) | [Channel Verification](../backend/channel-verification.md) owns the subsystem; the client half awaits its own document |
| `validation/` | cross-tier definition | rules the server also states, mirrored here and reconciled by hand | this document, until it has a stable core |
| `copy/` | product content | user-facing text addressed by key, namespaced by surface, and never imported outward by a platform capability | this document, until it has a stable core |

**Content and definitions are not mechanisms**, and the distinction is the ADR's: one is data the server also states, the other is words a reader meets, and only the second is translated.

### Thin utilities (owned here)

Alongside the subsystems, `shared/` carries a few deliberately small utilities that no other document owns.

**The rule that keeps them utilities:** a utility must be small, feature-agnostic, and free of business logic — a leaf helper with no domain behavior, no state or lifecycle of its own, and no internal architecture worth documenting. That is exactly why these remain utilities rather than platform subsystems: a subsystem earns its own structure and its own document; a utility earns neither. Anything that grows past that line must become (or join) a platform subsystem.

What currently sits under the rule:

- **`hooks/`** — generic React helpers (a latest-value ref for stable callbacks; a request-state reader that derives `isLoading`/`isError`-style flags from a status object).
- **`types/`** — the handful of shapes shared across features (the user shape, the request-state type).
- **`brand/`** — the product's mark, drawn inline so it takes the colour of the text around it. It is the one thing here that is not domain-*neutral*: it is the product's identity rather than a general capability. That sits inside the rule rather than against it — what the zone forbids is knowing about a **feature**, and a mark knows about none. It is not a Design System component for the same reason: the [admission test](design-system/components.md) asks whether a thing's meaning survives the product, and this one's does not.

## Known deviations

This document describes the **intended** structure; the code remains the source of truth for the current state, and any divergence is an **implementation deviation recorded in the [findings register](../architecture/findings/)** — never part of the intended design. Findings document implementation deviations only: **resolving a finding changes the implementation, not the intended architecture** — unless an ADR explicitly changes the architecture itself.

**Which deviations stand is the register's to say, not this document's.** A list here describes adoption rather than defining a rule, and it goes stale the moment a finding is opened or resolved — which is what happened to the two it used to name.

---

> This document owns the frontend's outer architecture — the four zones, their boundaries, the page-group contract, the composition root, and the thin utilities — and the capability structure every capability shares. Each platform subsystem's mechanism is owned by its document (see the platform index), per-feature behavior by the feature documents, the topology and request lifecycle by the [system overview](../architecture/system-overview.md), and the principles by [Engineering Principles §3](../development/engineering-principles.md) — linked here, never duplicated. Current deviations from the intended structure are recorded in the [findings register](../architecture/findings/).
