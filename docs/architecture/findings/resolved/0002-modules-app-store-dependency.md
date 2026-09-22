# Finding 0002: Feature modules depend on the app zone's typed store hooks

> **Status:** Resolved
> **Date:** 2026-07-02
> **Resolved:** 2026-07-11 (PR #287)
> **Affected areas:** `src/modules/auth/hooks`, `src/app/store`
> **Reported by:** Basel Ghonaim (surfaced by the E6 documentation review, Work Item #252)

## Observation

Feature-module code imports from the **app zone**, violating the intended one-directional dependency rule (`app → modules → shared`). Because the app zone also imports the module (the router mounts its page; the store composes its slice), the two zones form an **app ↔ modules cycle**.

The intended relationship is **one-directional**: a feature module depends only downward on the platform (`shared/`); it never reaches up into the application that composes it.

## Evidence

Verified on `main` (2026-07-02).

**The upward imports** — five auth hooks consume the typed store hooks from `@app/store` (defined in `src/app/store/hooks.ts`):

- `src/modules/auth/hooks/useAuthState.ts:1` — `import { useAppSelector } from "@app/store";`
- `src/modules/auth/hooks/useAuthFlow.ts:1` — `import { useAppSelector } from "@app/store";`
- `src/modules/auth/hooks/useLogout.ts:2` — `import { useAppSelector } from "@app/store";`
- `src/modules/auth/hooks/useAuthActions.ts:2` — `import { useAppDispatch } from "@app/store";`
- `src/modules/auth/hooks/useInitAuth.ts:2` — `import { useAppDispatch } from "@app/store";`

**The counter-direction** — the app zone imports the module: `src/app/routes/App.tsx:2-3` (`@modules/auth/hooks`, `@modules/auth`) and `src/app/store/store.tsx:2` (`modules/auth/store`).

So `modules → app` **and** `app → modules` — a two-way dependency between zones.

## Principle / boundary violated

- **Acyclic dependencies** ([Engineering Principles §3](../../../development/engineering-principles.md)): dependencies point one way and never form a cycle; two units importing each other means a responsibility is misplaced.
- **Layered zones, dependencies inward** (same §3, and the [frontend architecture](../../../frontend/architecture.md)'s dependency rule): a feature depends on the platform; nothing below the composition root depends on the composition root.

The misplaced responsibility is the **typed store hooks**: they are consumed by features but live in the zone that composes features.

## Resolution direction (not scheduled here)

The intended end state keeps the rule strict: `modules/` never import `app/`. The typed hooks (or equivalents) must become consumable from **below** the module boundary — candidate remedies are hosted in [Issue #253](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/253), which owns the fix. A finding records the problem; it does not schedule the fix (Documentation Strategy §9).

## Resolution

Resolved on 2026-07-11 by [PR #287](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/287) (Issue #253).

The misplaced responsibility — the typed store hooks — was relocated **below** the module boundary. The auth module now owns `useAuthSelector` / `useAuthDispatch` in `src/modules/auth/store/hooks.ts`, typed against its **own** slice (`{ auth: AuthState }`) through react-redux directly rather than the app-composed `RootState`. No `@app/store` import remains under `src/modules/`, so the `modules → app` edge — and the `app ↔ modules` cycle — is removed; the dependency now points one way (`modules → react-redux`). The change is compile-time-only (behavior-preserving): the selectors and dispatched actions are unchanged. A node store-level characterization test (`src/modules/auth/store/authStoreContract.test.ts`) locks the auth store-access contract the hooks depend on.

## Links

- Surfaced during Work Item E6 — the frontend architecture document ([`frontend/architecture.md`](../../../frontend/architecture.md)) states the intended rule and links back to this finding.
- Remedy tracked in [Issue #253](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/253). Related boundary *hygiene* (aliases, missing barrel) is deliberately **not** part of this finding — tracked as cleanup in Issue #254.
