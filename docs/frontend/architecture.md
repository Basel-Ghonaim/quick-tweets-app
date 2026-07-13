# Frontend Architecture

> **Status:** Active.
> **Authority:** The authoritative source for the frontend's **outer architecture** — the feature-sliced layout (`app/` · `modules/` · `shared/`), the dependency boundaries between those zones, the module contract, the composition root, and the thin platform utilities no other document owns. It owns the **structure between subsystems**, not the subsystems themselves: each platform subsystem's internals are owned by its own document (see the platform index below), per-feature behavior by the feature documents, the system topology and request lifecycle by the [system overview](../architecture/system-overview.md), and the underlying principles by [Engineering Principles §3](../development/engineering-principles.md).
> **Scope:** The structure of `src/` — how the frontend is zoned, how the zones may depend on each other, and where features meet the platform.
> **Maturity:** This document describes the **intended and settled** outer architecture; where the code currently deviates from a rule, the deviation is **recorded in the findings register and linked below** — never silently absorbed into this document. The **internal structure of a feature module is deliberately not canonized here**: authentication is the only fully-built feature, and a canonical feature template will be documented only once a second feature validates — or diverges from — its structure. Anything not described here is not yet stabilized, not architecturally rejected.
> **Version:** 1.0
> **Last Updated:** 2026-07-12
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

These rules are the **intended architecture**. An import that violates them is an **implementation deviation** — recorded in the findings register and linked under *Known deviations* below, never treated as part of the design. One direction violation currently exists: feature hooks reaching up to the app zone's typed store hooks ([Finding 0002](../architecture/findings/0002-modules-app-store-dependency.md)).

## The composition root

Assembly happens once, at the edge, in a fixed order:

1. **Bootstrap** — before anything renders, the entry point runs the bootstrap step, which wires shared infrastructure to app-layer dependencies (injecting the token getter and session callbacks into the auth client — the inversion described above).
2. **Providers** — the composed Redux store is mounted. The store is itself a composition: each feature contributes its slice, and the shared data layer contributes its API slice and middleware, under one store.
3. **The app shell** — the router mounts feature pages under their routes, gating first render on session initialization (a hook the auth feature provides).

The design system's foundations (tokens and themes) are loaded once at the entry as a side effect, so every feature renders against the same visual base.

The composition root is deliberately **thin**: it wires and constructs the dependencies it injects, but implements no feature behavior of its own. Any logic found in `app/` beyond assembly is misplaced.

## The module contract (outer)

The contract exists to **protect a feature's independence and hide its internals**: because nothing outside a module can see past its barrel, no other code can couple to how the feature is built — which keeps every feature independently developable, reworkable, and removable, and is precisely what leaves its internal structure free to evolve (and free to remain undocumented until it stabilizes, below).

What a feature module promises the rest of the application:

- It is a **self-contained folder** under `modules/` — everything feature-specific lives inside it.
- Its **designated public barrels are its only public surface** — currently the root barrel (the feature's page and its store slice) and the `hooks/` sub-barrel (the flow and session hooks the app shell consumes). Everything else is private.
- It **composes the platform** — forms through the form engine, controls through the design system, requests through the transport layer — and never re-implements a platform concern.
- It depends **only downward** (on `shared/`), never on another feature or on `app/`.

**The internal structure of a feature is deliberately left undocumented.** The auth module is internally layered (its own store, hooks, services, repository, mappers, and DTOs), but with a single feature built, that layering is a *current implementation*, not yet a proven convention — documenting it now would canonize a template no second feature has validated. The canonical feature-internal template will be documented when the next feature confirms or reshapes it.

## The platform index

Each platform subsystem is owned by its own document — this index is the map, not the content:

| Subsystem (`shared/…`) | What it is | Owning document |
|---|---|---|
| `api/` + `rtk-query/` (transport) | how requests leave the frontend | [Frontend API Client](api-client.md) |
| `errors/` | the error-normalization pipeline | [Frontend Error Handling](error-handling.md) |
| `schema-form/` | the schema-driven form engine | [Frontend Forms](forms.md) |
| `design-system/` | tokens, theming, component conventions | [Frontend Design System](design-system.md) |
| `rtk-query/` (cache/data layer) | the RTK Query cache and data layer | the frontend state-and-data document *(deferred until the data layer matures)* |

### Thin utilities (owned here)

Alongside the subsystems, `shared/` carries a few deliberately small utilities that no other document owns.

**The rule that keeps them utilities:** a utility must be small, feature-agnostic, and free of business logic — a leaf helper with no domain behavior, no state or lifecycle of its own, and no internal architecture worth documenting. That is exactly why these remain utilities rather than platform subsystems: a subsystem earns its own structure and its own document; a utility earns neither. Anything that grows past that line must become (or join) a platform subsystem.

What currently sits under the rule:

- **`hooks/`** — generic React helpers (a latest-value ref for stable callbacks; a request-state reader that derives `isLoading`/`isError`-style flags from a status object).
- **`types/`** — the handful of shapes shared across features (the user shape, the request-state type).

## Known deviations

This document describes the **intended** structure; the code remains the source of truth for the current state, and any divergence is an **implementation deviation recorded in the findings register** — never part of the intended design. Findings document implementation deviations only: **resolving a finding changes the implementation, not the intended architecture** — unless an ADR explicitly changes the architecture itself. Two are currently recorded:

- [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md) — the schema-form ↔ design-system coupling (a platform-internal cycle).
- [Finding 0002](../architecture/findings/0002-modules-app-store-dependency.md) — feature hooks importing the app zone's typed store hooks (a zone-level `app ↔ modules` cycle).

---

> This document owns the frontend's outer architecture — the zones, their boundaries, the module contract, the composition root, and the thin utilities. Each platform subsystem's internals are owned by its document (see the platform index), per-feature behavior by the feature documents, the topology and request lifecycle by the [system overview](../architecture/system-overview.md), and the principles by [Engineering Principles §3](../development/engineering-principles.md) — linked here, never duplicated. Current deviations from the intended structure are recorded in the findings register: [Finding 0001](../architecture/findings/0001-schema-form-design-system-cycle.md) and [Finding 0002](../architecture/findings/0002-modules-app-store-dependency.md).
