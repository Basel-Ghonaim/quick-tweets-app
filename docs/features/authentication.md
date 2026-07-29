# Feature: Authentication

> **Status:** Active.
> **Authority:** The authoritative source for the **authentication feature** — what it does, how its flows work, how it **composes** the platform, and its feature-specific configuration and policies. It owns the feature, **not the mechanisms it composes**: every shared mechanism it touches is owned by a platform document and linked here, never restated.
> **Scope:** The auth feature module (`src/modules/auth/`) and its behavior. The wire contract is the [API contract](../api/api-contract.md)'s; the server-side security mechanisms are [Backend Security](../backend/security.md)'s; the transport and the client half of the token model are the [frontend API client](../frontend/api-client.md)'s.
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organization is the current implementation of **this feature only — explicitly not the canonical template for future features** (the template is deliberately deferred by the [frontend architecture](../frontend/architecture.md) until a second feature validates or reshapes it). Anything not described here is not yet built, not architecturally rejected.
> **Version:** 1.1
> **Last Updated:** 2026-07-29
> **Owner:** Basel Ghonaim

## What the feature does

Authentication is the frontend's first — and currently only — fully built feature. It provides:

- **Register** — account creation with username, full name, email, and password. The form presents an avatar picker, but registration itself is **Media-free**: the account is created without an image, and an avatar is set separately through the authenticated profile update (`PATCH /users/me`), not at register. The pre-auth register-with-avatar path (the original [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) concern) was retired in favour of authenticated-only media ([ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)); the Media subsystem is owned by [`backend/media.md`](../backend/media.md).
- **Login / Logout** — credential sign-in, and sign-out that revokes the server session.
- **Silent session restore** — a returning user is signed back in on app startup, from the server, without re-entering credentials.
- **The auth page** — a split-panel screen (brand panel + form card) whose sign-in/sign-up tabs are **URL-driven** (`/auth/signin`, `/auth/signup`); switching tabs navigates, so the active form is deep-linkable. The social-login buttons on the page are **visual placeholders** — no OAuth is implemented.

## Responsibility boundary

The authentication feature **owns**: user identity state (who is signed in), **session orchestration** (when a session is restored, established, and ended), and authentication-specific **policies** (its form rules and wording, its error-message enrichment).

It does **not** own: transport, the token model and its storage, request retries and the 401 replay, form execution, control rendering, or error normalization. Those responsibilities belong to their platform owners and are **composed** here.

In one line: the feature decides *when and why*; the platform decides *how*.

## How the feature composes the platform

The feature implements almost nothing generic itself — it configures and composes platform subsystems, each owned elsewhere:

| The feature needs | It composes | Owned by |
|---|---|---|
| Its wire endpoints and payloads | `POST /auth/register · login · logout · refresh` | [API contract](../api/api-contract.md) |
| Requests with credentials + auth | the authenticated Axios client | [Frontend API Client](../frontend/api-client.md) |
| The token model it participates in | in-memory access token, `HttpOnly` refresh cookie | [API client](../frontend/api-client.md) (client half) · [Backend Security](../backend/security.md) (server half) |
| Its forms | schema configs driving the form engine | [Frontend Forms](../frontend/forms.md) |
| Its controls | `SchemaField`-bound inputs, buttons | [Frontend Design System](../frontend/design-system.md) |
| One typed error shape | normalized `AppError` | [Frontend Error Handling](../frontend/error-handling.md) |
| Its data entities (`User`, `RefreshToken`) | the schema behind the endpoints | [Data model](../architecture/data-model.md) |

Where the platform needs something back from the application — the token getter and the session callbacks — the wiring happens in the **composition root**, not in this feature ([frontend architecture](../frontend/architecture.md)).

## The session lifecycle

The feature's own contribution is the **choreography** — when and why the platform pieces are invoked:

1. **Startup restore.** Before the routed app renders, the feature calls the refresh endpoint (the `HttpOnly` cookie travels automatically). Success → the server returns the **session** (the minimal identity `{ id, username }` and a fresh access token), which hydrates the store — the user is signed in without credentials. The full profile is owned by the canonical current-user resource, `GET /users/me`, not by Auth. Failure → the refresh session has expired, so a clean logged-out state is set and the login screen is shown. The app shell blocks rendering behind this check, so a returning user never flashes a logged-out view. Restore reads nothing from the client; the server is the source of truth for *who* is returning.
2. **Login / Register.** A schema config defines the form; the form engine validates and hands the typed payload to the feature's injected action, which marks the request pending, calls the repository, and stores the user + access token in the feature's state. Failures arrive as one normalized `AppError`, are passed through the feature's message enrichment, land in the per-request error state, and surface as a form-level alert.
3. **Ongoing session.** During normal use the transport layer keeps the session alive (attaching the token, silently refreshing on expiry — the mechanism is the [API client](../frontend/api-client.md)'s). The feature's part is the **expiry behavior** wired on its behalf in the composition root: when a refresh ultimately fails, the callback dispatches the feature's reset action — a clean local sign-out.
4. **Logout.** Logout calls the server to revoke the session (`POST /auth/logout`), which invalidates the refresh cookie server-side.

## Inside the feature — the current implementation (not a template)

The module is internally layered; this is a description of **what exists**, not a rule for future features:

- **Repository behind an interface.** All four auth endpoints are called through an `AuthRepository` interface with one REST implementation over the authenticated client — the feature's flows never touch HTTP directly, and the transport can be substituted in tests (the same factory-with-default-parameter injection convention used across the project).
- **DTO ↔ entity mapping.** Wire shapes and domain shapes are separate types bridged by a small mapper, so a contract change touches the mapper, not the flows ([Engineering Principles §4](../development/engineering-principles.md)).
- **A per-request state machine.** The auth slice holds the identity (`user`, in-memory `accessToken`) plus an independent `{status, error}` record per request type (login, register, logout). The slice is **purely synchronous** — all async orchestration lives in the hooks — with a per-request error-clear and a single reset action that returns the whole feature to its initial state.
- **Hooks as the feature's public surface.** Consumers use the module's designated `hooks/` barrel: the flow hooks (`useLoginFlow` / `useRegisterFlow`) merge form state and request state into one typed contract (`AuthFlowReturn`), `useAuthState` derives the identity (`isLoggedIn` is computed, never stored), `useLogout` and the startup-restore hook cover the rest. Internal orchestration hooks are not exported. *(The hooks currently import the app zone's typed store hooks — a recorded implementation deviation, [Finding 0002](../architecture/findings/0002-modules-app-store-dependency.md), not intended design.)*
- **Feature services.** The shared login/register flow (the single owner of the auth request choreography) and **error-message enrichment** — auth-specific wording layered over the normalized error for a handful of types (validation, conflict, forbidden, rate-limited) before it reaches the UI.
- **Configuration, not code, for forms.** The login and register forms are schema configs (fields, validators, layout spans) plus a message catalog; the [form engine](../frontend/forms.md) does the rest. The validators are the feature's **client-side pre-check**; the [contract](../api/api-contract.md) remains authoritative for what the server ultimately accepts (the current pre-check rules drift from the contract in places — tracked in [#263](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/263)). The wording is the feature's.

## Feature policies

- **What persists where:** **nothing is persisted on the client.** The access token lives in memory (the Redux auth slice) only; the user is fetched from the server on restore rather than cached; and the refresh token is never visible to the feature at all — the feature *applies* the platform's token model, it does not define it.
- **Errors speak auth.** Platform errors stay one typed shape; the feature only replaces the *message* for auth-relevant cases (e.g. a `conflict` becomes "This account is already registered. Try logging in.") — wording is feature-owned, the shape and pipeline are not.

## Relationship to the platform documentation

This document composes; it never re-documents. If a mechanism seems missing here — how the 401 replay works, how tokens rotate, how validation executes, how errors normalize — it is deliberately absent: follow the links to its owning document. The reciprocal rule also holds: platform documents never describe this feature's flows.

---

> This document owns the authentication **feature** — its capabilities, flows, composition, and policies. Every mechanism it composes is owned by its platform document (see the composition map), the wire contract by the [API contract](../api/api-contract.md), and the recorded hooks-import deviation by [Finding 0002](../architecture/findings/0002-modules-app-store-dependency.md) — linked here, never duplicated.
