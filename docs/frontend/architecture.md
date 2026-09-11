# Frontend Architecture

> **Status:** Active.
> **Class:** Contract ([Documentation Strategy §3](../architecture/documentation-strategy.md)) — the outer architecture it states is a rule, not a report of the current tree.
> **Authority:** The authoritative source for the frontend's **outer architecture** — the feature-sliced layout (`app/` · `modules/` · `shared/`), the dependency boundaries between those zones, the module contract, the composition root, and the thin platform utilities no other document owns — and for the **capability structure**, the one internal organisation every capability shares. It owns the **structure between subsystems** and the layers a capability is organised in, not any subsystem's mechanism: each platform subsystem's mechanism is owned by its own document (see the platform index below), per-feature behavior by the feature documents, the system topology and request lifecycle by the [system overview](../architecture/system-overview.md), and the underlying principles by [Engineering Principles §3](../development/engineering-principles.md).
> **Scope:** The structure of `apps/web/src/` — how the frontend is zoned, how the zones may depend on each other, where features meet the platform, and how each capability inside them is organised.
> **Maturity:** This document describes the **intended and settled** architecture; where the code currently deviates from a rule, the deviation is **recorded in the [findings register](../architecture/findings/)** — never silently absorbed into this document. The capability structure was written once authentication, recovery, the session and channel verification had been built in two different shapes, and reconciles them ([Engineering Principles §3](../development/engineering-principles.md)). Anything not described here is not yet stabilized, not architecturally rejected.
> **Superseded in part:** the **outer architecture** this document states — the three zones, the dependency rule, and the module contract — is superseded by [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md), which decides four zones (`app` · `pages` · `features` · `shared`) and moves the route-subtree rule from the feature to the page group. **Where this document and that ADR disagree, the ADR governs.** What is written below describes the architecture the code was built to, not the one it is moving to; it is restated in its new operative form as the structure lands ([ADR 0012](../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) Decision 5). The composition root, the platform index, the thin-utility rule and the capability structure are unaffected; the last is written to the four zones.
> **Version:** 2.1
> **Last Updated:** 2026-09-11
> **Owner:** Basel Ghonaim

## Why zones at all

The frontend is divided so that **things that change together live together, and things that change for different reasons cannot reach into each other**. Product features churn with product decisions; the platform evolves slowly behind stable surfaces; assembly changes only when the application's composition changes. Giving each kind of change its own zone — with dependencies allowed in only one direction — bounds the blast radius of every change: a feature can be added, reworked, or removed without touching its neighbors, the platform can evolve without knowing who consumes it, and all wiring is absorbed by a single place instead of leaking everywhere.

## The shape: three zones

The frontend is **feature-sliced** into three zones with distinct roles:

- **`app/` — the composition root.** The only place where the application is assembled: the store is composed, shared infrastructure is wired to app-layer dependencies, and the router mounts the features. It holds no business logic and no UI beyond the app shell.
- **`modules/` — the feature slices.** One self-contained folder per product feature (currently `auth`). A feature owns its own pages, components, state, and domain logic, and **composes** platform subsystems rather than re-implementing them.
- **`shared/` — the platform.** Domain-agnostic subsystems every feature may use (transport, errors, forms, design system, data layer) plus a few thin utilities. The platform has **zero knowledge of any feature**.

The whole document in one line:

```text
app assembles  ·  modules compose  ·  shared provides
```

`app` wires the pieces together, `modules` build features *out of* platform pieces, and `shared` supplies those pieces while knowing nothing about who uses them.

## The dependency rule

Dependencies point in **one direction**:

```text
app  →  modules  →  shared
```

- **`shared/` imports nothing** from `modules/` or `app/` — the platform never depends on a feature or on the application that hosts it.
- **`modules/` import `shared/`**, never `app/`, and **never each other** — cross-feature needs are met by promoting the shared piece to the platform, not by coupling two features.
- **`app/` may import both** — composing features and platform is precisely its job.

Two mechanisms carry the boundaries:

- **Path aliases** — `@app/*`, `@modules/*`, `@shared/*` — declare an import's zone explicitly at the call site.
- **Designated public barrels** — a module or platform subsystem is consumed only through its **designated public barrels**: its root `index.ts`, plus any sub-barrel it deliberately exposes (e.g. a module's `hooks/`). Anything not exported through a designated barrel is private.

Where shared infrastructure genuinely needs app-layer knowledge (the auth client needs the store's token), the dependency is **inverted** rather than allowed to point backwards: the platform exposes a setup seam and the composition root injects the dependency (the mechanism is the [frontend API client](api-client.md)'s). This layout is the frontend application of the layering, acyclicity, and platform-vs-feature principles ([Engineering Principles §3](../development/engineering-principles.md)).

Where a platform component must *render* something the application owns, the element is taken rather than the dependency. Navigation is the case: the router is mounted by the composition root and a router's link throws outside it, so a presentation component that imported one could not render on its own. The Design System's `Link` accepts the navigating element from its caller instead, restricted by the props that element must accept rather than by a list of tags — which is why the layer holds no router and needs none. **A seam is the answer when the platform must call the application; taking the element is the answer when it only has to render one.** When a second component needs to navigate, that repetition earns the seam and this converts to the inversion above.

These rules are the **intended architecture**. An import that violates them is an **implementation deviation** — recorded in the [findings register](../architecture/findings/), never treated as part of the design.

## The composition root

Assembly happens once, at the edge, in a fixed order:

1. **Bootstrap** — before anything renders, the entry point runs the bootstrap step, which wires shared infrastructure to app-layer dependencies (injecting the token getter and session callbacks into the auth client — the inversion described above).
2. **Providers** — one component nests every provider the application mounts, so the entry point holds a single child and the nesting order lives in one place rather than at the edge. The composed Redux store is among them, itself a composition: each feature contributes its slice, and the shared data layer contributes its API slice and middleware, under one store.
3. **The app shell** — the router mounts feature pages under their routes, and starts session restore without gating first render on it (a hook the auth feature provides).

The design system's foundations (tokens and themes) are loaded once at the entry as a side effect, so every feature renders against the same visual base. **Which** theme, and the direction the document reads in, are settled before any of that: both are resolved by the Design System and *selected* by the application ([ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 4), and the selection is stamped on the document from the markup, ahead of the first paint, because a module cannot run early enough to avoid a flash.

The composition root is deliberately **thin**: it wires and constructs the dependencies it injects, but implements no feature behavior of its own. Any logic found in `app/` beyond assembly is misplaced.

## The module contract (outer)

The contract exists to **protect a feature's independence and hide its internals**: because nothing outside a module can see past its barrel, no other code can couple to how the feature is built — which keeps every feature independently developable, reworkable, and removable, and is precisely what leaves its internals free to evolve within the [capability structure](#the-capability-structure).

What a feature module promises the rest of the application:

- It is a **self-contained folder** under `modules/` — everything feature-specific lives inside it.
- Its **designated public barrels are its only public surface** — currently the root barrel (the feature's **route subtree** and its store slice) and the `hooks/` sub-barrel (the flow and session hooks the app shell consumes). Everything else is private. A feature exposing its screens one by one would let the composition root learn which screens exist and what they are called; exposing the subtree instead means the composition root decides **whether and where** a feature is mounted while the feature keeps **what is inside it**, and a new screen never widens the surface.
- It **composes the platform** — forms through the form engine, controls through the design system, requests through the transport layer — and never re-implements a platform concern.
- It depends **only downward** (on `shared/`), never on another feature or on `app/`.

**Inside, a feature is organised by the [capability structure](#the-capability-structure)**, which follows.

## The capability structure

A **capability** owns a fact and the operations on it. It is either a feature ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 3) or a platform capability — the session, channel verification — that meets [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6. **Every capability is organised the same way.** Two capabilities differ in what they hold, never in where a given kind of thing lives: one with no interface or no store has fewer layers than one that has them, and nothing else distinguishes them.

It does not govern the platform's **mechanisms** — the design system, the form engine, the error pipeline, the transport and the query cache — each organised as its own document says, nor the thin utilities below.

### The layers

| Layer | Holds | Present when |
|---|---|---|
| `index.ts` | the capability's public surface | always |
| `model/` | its vocabulary: its entities, and the types more than one of its layers shares | always |
| `repository/` | its port to the server, the implementation that fulfils it, and the wire shapes and the mapper between them and the model | it reaches the server |
| `services/` | logic that runs without a renderer: orchestration, policy, pure reducers, error handling applied to a normalised error | it holds logic beyond a call |
| `store/` | its slice, the state shape and payloads only the slice uses, its selectors and typed store hooks | its state outlives the component that reads it |
| `forms/` | its form definitions — the fields and the validators they compose | it takes input through the [form engine](forms.md) |
| `hooks/` | everything its interface needs, composed from the layers beneath | React consumes it |
| `screens/` | presentation | it owns the interface that *is* its interaction |
| `boundary.test.ts` | the checks that hold this section's rules for this capability | always |

**A layer a capability does not need is absent, not empty.** Nothing else sits at a capability's root: a file that fits no layer shows the table to be incomplete, which is a change to this section rather than an exception to it. Inside a layer, grouping is the capability's own — a flow under `services/`, the steps of one screen under `screens/`.

### The rules

- **The root barrel is the only way in.** Nothing outside a capability imports past its `index.ts`, and nothing inside it imports itself through its own alias. A capability exposes no second barrel; this replaces the sub-barrel allowed above.
- **Dependencies inside a capability run downward.** `screens` use `hooks`; `hooks` use `services`, `forms`, `store` and `repository`; `services` use `store` and `repository`; every layer may use `model`. Nothing imports a layer that uses it.
- **A screen presents.** It renders what its hooks return and calls what they expose. It composes no repository, runs no orchestration, and holds no rule the server also states ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 6); a route or a step that belongs to someone else reaches it from the page that mounts it (Decisions 2 and 4).
- **A capability's calls to the server live in its own repository.** The [transport](api-client.md) supplies the clients, the envelope and the interceptors, and holds no capability's endpoints.
- **A capability's boundary is held by its own test.** `boundary.test.ts` checks at least that the capability is reached only through its barrel, that it imports nothing its zone forbids, and — where it has no `screens/` — that it holds no component, stylesheet or story. Whatever the decision that governs the capability adds, it checks too.
- **A platform capability has no `screens/` while [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6 holds**, because under it the platform publishes no product interface. The rule follows that decision and changes with it; where a platform capability's interface lives when a product surface needs one is not settled here.

The rules above state the target. Which capabilities do not yet meet them is the findings register's to say, not this section's; [Finding 0030](../architecture/findings/0030-the-capabilities-predate-the-structure-they-share.md) records where each stood when this section was written.

## The platform index

Each platform subsystem is owned by its own document — this index is the map, not the content:

| Subsystem (`shared/…`) | What it is | Owning document |
|---|---|---|
| `api/` + `rtk-query/` (transport) | how requests leave the frontend | [Frontend API Client](api-client.md) |
| `errors/` | the error-normalization pipeline | [Frontend Error Handling](error-handling.md) |
| `schema-form/` | the schema-driven form engine | [Frontend Forms](forms.md) |
| `design-system/` | tokens, theming, component conventions | [Frontend Design System](design-system/README.md) |
| `preferences/` | which resolution of the design language is active — theme selection and the document's direction | this document, until it has a stable core |
| `session/` | the session — who is signed in, with what token, whether that is settled, and its restore, refresh and ending ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md)) | [Frontend API Client](api-client.md) for the token's residence; the lifecycle awaits its own document |
| `rtk-query/` (cache/data layer) | the RTK Query cache and data layer | the frontend state-and-data document *(deferred until the data layer matures)* |

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

> This document owns the frontend's outer architecture — the zones, their boundaries, the module contract, the composition root, and the thin utilities — and the capability structure every capability shares. Each platform subsystem's mechanism is owned by its document (see the platform index), per-feature behavior by the feature documents, the topology and request lifecycle by the [system overview](../architecture/system-overview.md), and the principles by [Engineering Principles §3](../development/engineering-principles.md) — linked here, never duplicated. Current deviations from the intended structure are recorded in the [findings register](../architecture/findings/).
