# Feature: Authentication

> **Status:** Active.
> **Authority:** The authoritative source for the **authentication feature** — what it does, how its flows work, how it **composes** the platform, and its feature-specific configuration and policies. It owns the feature, **not the mechanisms it composes**: every shared mechanism it touches is owned by a platform document and linked here, never restated.
> **Scope:** The auth feature module (`apps/web/src/modules/auth/`) and its behavior. The wire contract is the [API contract](../../api/api-contract.md)'s; the server-side security mechanisms are [Backend Security](../../backend/security.md)'s; the transport and the client half of the token model are the [frontend API client](../../frontend/api-client.md)'s.
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organization is the current implementation of **this feature only — explicitly not the canonical template for future features** (the template is deliberately deferred by the [frontend architecture](../../frontend/architecture.md) until a second feature validates or reshapes it). Anything not described here is not yet built, not architecturally rejected.
> **Superseded in part:** this document states that the feature owns **session orchestration** — restore, establishment, and ending. [ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) decides otherwise: the session is a platform capability, and this feature owns the act of authenticating — signing in and registering — which commits a session and does not own it. **Where this document and that ADR disagree on ownership, the ADR governs.** The implementation has separated them — the session lives at `shared/session`, this feature at `features/authentication` — and what is written below still describes the fused feature; it is restated in the migration's documentation phase.
> **Version:** 1.8
> **Last Updated:** 2026-09-10
> **Owner:** Basel Ghonaim

## What the feature does

Authentication is the frontend's first — and currently only — fully built feature. It provides:

- **Register** — account creation with username, email, and password, and nothing else. `name` is optional profile data set later via `PATCH /users/me` (absent = no display name; the read side falls back to `username`), and registration is **Media-free**: no avatar is collected here. The pre-auth register-with-avatar path (the original [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) concern) was retired in favour of authenticated-only media ([ADR 0008](../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)); the Media subsystem is owned by [`backend/media.md`](../../backend/media.md).
- **Login / Logout** — credential sign-in, and sign-out that revokes the server session.
- **Silent session restore** — a returning user is signed back in on app startup, from the server, without re-entering credentials.
- **The post-registration journey** — profile completion and email verification, presented as one surface whose step is named by the server. The account is complete before any of it and nothing an account may do depends on it ([ADR 0008](../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) Decision 2, as revised); the journey's own state and transitions are the [API contract](../../api/api-contract.md)'s.
- **Profile completion** — name, bio and avatar, saved or skipped, with the avatar uploaded when it is chosen rather than at submit. It lives here temporarily: its destination is a User feature that does not exist, and the mechanism that will carry it there is proposed in [#623](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/623).
- **Email verification** — requesting a code and confirming it, composing the [Channel Verification](../../backend/channel-verification.md) capability. Whether an address is proven is that capability's fact, never this feature's.
- **Account recovery** — asking for a code, confirming it, and setting a new password, composing the [Password Reset](../../backend/password-reset.md) capability. Where the reader stands is that capability's fact and never this feature's; the flow ends at sign-in rather than in a session ([ADR 0016](../../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 8).

## Responsibility boundary

The authentication feature **owns**: user identity state (who is signed in), **session orchestration** (when a session is restored, established, and ended), and authentication-specific **policies** (its form rules and wording, its error-message enrichment).

It does **not** own: transport, the token model and its storage, request retries and the 401 replay, form execution, control rendering, or error normalization. Those responsibilities belong to their platform owners and are **composed** here.

In one line: the feature decides *when and why*; the platform decides *how*.

## How the feature composes the platform

The feature implements almost nothing generic itself — it configures and composes platform subsystems, each owned elsewhere:

| The feature needs | It composes | Owned by |
|---|---|---|
| Its wire endpoints and payloads | `POST /auth/register · login · logout · refresh`, and the journey, verification and recovery surfaces | [API contract](../../api/api-contract.md) |
| Requests with credentials + auth | the authenticated Axios client | [Frontend API Client](../../frontend/api-client.md) |
| The token model it participates in | in-memory access token, `HttpOnly` refresh cookie | [API client](../../frontend/api-client.md) (client half) · [Backend Security](../../backend/security.md) (server half) |
| Its forms | schema configs driving the form engine | [Frontend Forms](../../frontend/forms.md) |
| Its controls | `SchemaField`-bound inputs, buttons | [Frontend Design System](../../frontend/design-system/README.md) |
| One typed error shape | normalized `AppError` | [Frontend Error Handling](../../frontend/error-handling.md) |
| Its data entities (`User`, `RefreshToken`) | the schema behind the endpoints | [Data model](../../architecture/data-model.md) |

Where the platform needs something back from the application — the token getter and the session callbacks — the wiring happens in the **composition root**, not in this feature ([frontend architecture](../../frontend/architecture.md)).

## The session lifecycle

The feature's own contribution is the **choreography** — when and why the platform pieces are invoked:

1. **Startup restore.** On mount, the feature calls the refresh endpoint (the `HttpOnly` cookie travels automatically). Success → the server returns the **session** (the minimal identity `{ id, username }` — of which `id` is the **stable** key and `username` a mutable display handle owned by the User domain — and a fresh access token), which hydrates the store — the user is signed in without credentials. The feature identifies the signed-in user by `id`, never by the handle, so a server-side handle change (`PATCH /users/me`) never invalidates the session. The full profile is owned by the canonical current-user resource, `GET /users/me`, not by Auth. Failure → the refresh session has expired, so a clean logged-out state is set and the login screen is shown. The check is **non-blocking**: the shell renders immediately and the store hydrates when the answer arrives, so a returning user can see a logged-out frame before the session lands. It is also **hint-gated** — with no session hint present the call is not made at all. Restore reads nothing from the client; the server is the source of truth for *who* is returning.
2. **Login / Register.** A schema config defines the form; the form engine validates and hands the typed payload to the feature's injected action, which marks the request pending, calls the repository, and stores the user + access token in the feature's state. Failures arrive as one normalized `AppError`, are passed through the feature's message enrichment, land in the per-request error state, and surface as a form-level alert.
3. **Ongoing session.** During normal use the transport layer keeps the session alive (attaching the token, silently refreshing on expiry — the mechanism is the [API client](../../frontend/api-client.md)'s). The feature's part is the **expiry behavior** wired on its behalf in the composition root: when a refresh ultimately fails, the callback dispatches the feature's reset action — a clean local sign-out.
4. **Logout.** Logout calls the server to revoke the session (`POST /auth/logout`), which invalidates the refresh cookie server-side.

## Recovery — one route, and the server names the step

Account recovery is three steps on **one** route. Which of them renders is read from the server, never tracked by the client: a step's URL would be a second, reader-editable copy of a position the capability owns, and that shape was built once for the onboarding journey and rejected. The same conclusion is reached here for a stronger reason — the position *is* a credential, so the client cannot hold it at all ([ADR 0017](../../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)).

Three consequences follow, and they are the feature's own:

- **A reload lands on the step the reader reached, able to finish it.** Nothing is remembered on the client for that to work; the answer is asked for again.
- **A read that failed is not an answer.** It renders a retry rather than the first screen, because sending a reader back to the beginning would discard a recovery the server still holds.
- **No number on these screens is the client's.** The resend window and whether one may still be asked for are read from the position, so a countdown never reports something no server said.

Two things the reader can do are actions rather than claims about the step, and the distinction is what keeps the server authoritative. **Leaving** is always available and always safe, since the position outlives the visit. **Starting over** is confined to the code step: it abandons the attempt, and what actually moves the server is the request the address form then makes — which supersedes the position outright. At the password step it is deliberately absent, because a new request would discard control the reader has already proved.

Unlike the journey's read, this one waits for nothing. These endpoints are anonymous, so there is no session whose absence could be mistaken for an answer.

## Inside the feature — the current implementation (not a template)

The module is internally layered; this is a description of **what exists**, not a rule for future features:

- **Repository behind an interface.** All four auth endpoints are called through an `AuthRepository` interface with one REST implementation over the authenticated client — the feature's flows never touch HTTP directly, and the transport can be substituted in tests (the same factory-with-default-parameter injection convention used across the project).
- **DTO ↔ entity mapping.** Wire shapes and domain shapes are separate types bridged by a small mapper, so a contract change touches the mapper, not the flows ([Engineering Principles §4](../../development/engineering-principles.md)).
- **A per-request state machine.** The auth slice holds the identity (`user`, in-memory `accessToken`) plus an independent `{status, error}` record per request type (login, register, logout). The slice is **purely synchronous** — all async orchestration lives in the hooks — with a per-request error-clear and a single reset action that returns the whole feature to its initial state.
- **Hooks as the feature's public surface.** Consumers use the module's designated `hooks/` barrel: the flow hooks (`useLoginFlow` / `useRegisterFlow`) merge form state and request state into one typed contract (`AuthFlowReturn`), `useAuthState` derives the identity (`isLoggedIn` is computed, never stored), `useLogout` and the startup-restore hook cover the rest. Internal orchestration hooks are not exported. The module owns its own typed store hooks rather than reaching into the app zone, which is what closed [Finding 0002](../../architecture/findings/0002-modules-app-store-dependency.md).
- **Feature services.** The shared login/register flow (the single owner of the auth request choreography) and **error-message enrichment** — auth-specific wording layered over the normalized error for a handful of types (validation, conflict, forbidden, rate-limited) before it reaches the UI.
- **Configuration, not code, for forms.** The login and register forms are schema configs (fields, validators, layout spans) plus a message catalog; the [form engine](../../frontend/forms.md) does the rest. The validators are the feature's **client-side pre-check**; the [contract](../../api/api-contract.md) remains authoritative for what the server ultimately accepts (the current pre-check rules drift from the contract in places — tracked in [#263](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/263)). The wording is the feature's.

## Feature policies

- **What persists where:** **nothing is persisted on the client.** The access token lives in memory (the Redux auth slice) only; the user is fetched from the server on restore rather than cached; and the refresh token is never visible to the feature at all — the feature *applies* the platform's token model, it does not define it.
- **Errors speak auth.** Platform errors stay one typed shape; the feature only replaces the *message* for auth-relevant cases (e.g. a `conflict` becomes "This account is already registered. Try logging in.") — wording is feature-owned, the shape and pipeline are not.

## Relationship to the platform documentation

This document composes; it never re-documents. If a mechanism seems missing here — how the 401 replay works, how tokens rotate, how validation executes, how errors normalize — it is deliberately absent: follow the links to its owning document. The reciprocal rule also holds: platform documents never describe this feature's flows.

---

> This document owns the authentication **feature** — its capabilities, flows, composition, and policies. Every mechanism it composes is owned by its platform document (see the composition map), the wire contract by the [API contract](../../api/api-contract.md) — linked here, never duplicated.
