# ADR 0003: Cross-Tier Shared Facts — a Workspace Foundation of Independent Zero-Dependency Leaf Packages

> **Status:** Superseded by [ADR 0013](0013-applications-and-cross-tier-packages.md)
> **Date:** 2026-07-09
> **Deciders:** Basel Ghonaim

## Context

The project is a two-tier application in one repository: a React 19 frontend (`src/`, built by Vite) and an Express 5 + Prisma + Zod backend (`server/`, built by `tsc`/`tsx`). They are **two independent npm projects** — separate `node_modules`, different TypeScript versions (frontend 5.9, backend 6.0), no workspace, no cross-tier module resolution.

Certain **deterministic facts** are defined on *both* tiers and reconciled by hand, which drifts. Verified on `main`:

- **Auth validation constraints** are duplicated — frontend `src/modules/auth/config/authValidationRules.ts` ↔ backend `server/src/modules/auth/auth.validator.ts`. Their drift is exactly what [#263](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/263) fixed.
- **Error-code identity** is duplicated — frontend `src/shared/errors/types.ts` (`ErrorType`) ↔ backend `server/src/shared/errors/types.ts` (`ErrorType`) ↔ the API contract's `ErrorBody`. It was hand-reconciled before (Issues #195–#197) and is **currently inconsistent** (the wire type `rate_limit` is absent from both code unions). That inconsistency is a standalone correctness defect, cited here only as evidence of drift — it is fixable independently of this decision and of Option C′, and is neither owned nor deferred by this ADR.
- **Public wire shapes** are duplicated — e.g. frontend `src/shared/types/user.ts` (`User`) ↔ the backend user DTO ↔ the API contract.

The Option C′ architectural review established that **more than one real cross-tier fact is already duplicated today**, so the *boundary* for sharing such facts should be decided now — even though its implementation is deliberately deferred. Two constraints shape the decision: the backend `tsconfig` sets `rootDir: "./src"` with `declaration: true`, so a shared **directory** consumed by relative path breaks the backend `tsc` build. Given the repository's current build boundaries, a workspace-managed package consumed through normal package resolution is the **cleanest supported** cross-tier boundary; alternative source-sharing approaches would require broader build and TypeScript configuration changes that this decision intentionally avoids (this is a judgement about *this* repository's setup, not a claim that no other approach could work). The frontend/backend TypeScript-version skew similarly argues for consuming a compiled artifact rather than cross-compiling shared source.

This is a repository-wide decision with **no natural single-document owner** (it spans the frontend, the backend, and the build tooling) and it **must be preserved independently of its deferred implementation** — [ADR 0002](0002-refined-adr-threshold.md)'s criterion 2 for creating an ADR.

## Decision

Adopt a **Workspace Foundation** that hosts **independent, zero-runtime-dependency leaf packages** for sharing deterministic facts between the frontend and the backend, governed by these rules:

1. **One ownership category per leaf.** Each leaf package holds exactly one kind of fact (for example: validation constraints; error-code identity). Categories are never mixed within a package.
2. **No generic `shared` dumping-ground package.** A catch-all cross-tier package is prohibited; different fact-kinds get different leaves.
3. **Shared definitions only.** A leaf holds pure, framework-agnostic facts (numbers, regex/pattern literals, stable code identities). **Execution, messaging, UX, and tier-framework code stay in their owning layer** — Zod schemas and the schema-form validators (execution), React, Express, Prisma models, Redux state, tier-internal DTOs, and **all message text** (backend security-safe fallbacks *and* frontend UX/localized copy) are never shared. For errors specifically: *share the error identity, not the presentation text.*
4. **Dependency direction is fixed.** A leaf is a true leaf: it depends on nothing, and both tiers depend on it (`frontend → leaf`, `backend → leaf`, `leaf → ∅`). A leaf carries **zero runtime dependencies** and imports nothing from either tier or any framework.
5. **The first planned consumer is auth validation constraints** — but this ADR implements **neither** the workspace **nor** any leaf package.
6. **Error-code identity and public wire types are independent, subsequent paths** — each its own later leaf or boundary decision, **not** merged into the first implementation slice.

This ADR records the **boundary and its rules only**. Implementation is a later standalone phase, executed after the current fix plan completes — unless a real dependency forces earlier re-evaluation.

## Alternatives considered

- **No cross-tier infrastructure — keep hand-reconciling.** Rejected: at least two facts already drift (auth constraints, per #263; error-code identity, including the current `rate_limit` gap). Discipline alone has already failed to hold them consistent.
- **A single generic `shared` package for all cross-tier facts.** Rejected: it merges distinct ownership categories — which have different owners, review sensitivity, and change cadence — into a dumping ground, re-creating the coupling this decision exists to prevent.
- **A shared top-level directory consumed by relative import.** Rejected: with the backend `tsconfig`'s `rootDir: "./src"` and `declaration: true`, out-of-root source breaks the backend `tsc` build, and making it work would require broader build/TypeScript configuration changes this decision intentionally avoids. A workspace-managed package consumed through normal package resolution is the cleanest *supported* boundary given the repository's current build setup — not a claim that it is the only conceivable approach.
- **Sharing executable schemas or types — Zod schemas, Prisma models, tier DTOs, React, Redux state.** Rejected: it couples one tier to another tier's framework or library and moves execution/tier-internal shapes across the boundary. Only deterministic *definitions* are shared; execution stays owned by its layer.
- **Sharing message text.** Rejected: backend fallback/security-safe messages and frontend UX/localized copy are tier-owned presentation, not shared facts.
- **Implement the full cross-tier migration now (big-bang).** Rejected: it over-scopes a decision that should be made once and consumed incrementally. The boundary is decided here; consumers are added independently, smallest proven consumer first.

## Consequences

- The project has a sanctioned boundary for cross-tier facts: **independent, zero-dependency leaf packages, one ownership category each, and no dumping ground.**
- **Nothing is implemented by this ADR** — no workspace, no leaf package, no product-code change. Establishing the foundation later entails: introducing npm workspaces (the repository is not workspace-based today); creating one leaf per category; **boundary enforcement** (zero runtime dependencies, forbidden cross-tier/framework imports, a restricted package `exports` surface, and a CI check); and build ordering. Leaves should ship **compiled** (`.js` + `.d.ts`) to absorb the frontend/backend TypeScript-version skew and to satisfy the backend `rootDir` constraint.
- **The first consumer (auth validation constraints) and the subsequent paths (error-code identity; public wire types) are separate later Work Items.** The existing `src/modules/auth/config/authValidationRules.ts` seam introduced by #263 becomes a re-export/adapter when the first leaf lands, so the forms, the validation engine, and the messages change nothing.
- **Dependency-direction limit:** a leaf depends on nothing and is depended on by both tiers. A package that ever needs a runtime dependency or a tier import is, by definition, out of bounds for this foundation.
- **Reversibility is high.** Because leaves are pure data with zero dependencies, the decision is cheaply reversible: a leaf's contents inline back into each tier's own module and the workspace is removed, with no runtime, framework, or ownership entanglement to unwind.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
