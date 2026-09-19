# Feature: Authentication

> **Status:** Active.
> **Authority:** The authoritative source for the **authentication feature** — what it does, how its flows work, how it **composes** the platform, and its feature-specific configuration and policies. It owns the feature, **not the mechanisms it composes**: every shared mechanism it touches is owned by a platform document and linked here, never restated.
> **Scope:** The authentication capability (`apps/web/src/features/authentication/`) and its behavior. The wire contract is the [API contract](../../api/api-contract.md)'s; the server-side security mechanisms are [Backend Security](../../backend/security.md)'s; the transport and the client half of the token model are the [frontend API client](../../frontend/api-client.md)'s.
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organisation is the [capability structure](../../frontend/architecture.md#the-capability-structure), which every capability shares and which that document owns. Anything not described here is not yet built, not architecturally rejected.
> **Version:** 2.0
> **Last Updated:** 2026-09-19
> **Owner:** Basel Ghonaim

## What the feature does

Authentication is **signing in and registering**. It provides:

- **Register** — account creation with username, email, and password, and nothing else. `name` is optional profile data set later via `PATCH /users/me` (absent = no display name; the read side falls back to `username`), and registration is **Media-free**: no avatar is collected here. The pre-auth register-with-avatar path (the original [#256](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/256) concern) was retired in favour of authenticated-only media ([ADR 0008](../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)); the Media subsystem is owned by [`backend/media.md`](../../backend/media.md).
- **Login** — credential sign-in, which commits a session.

Signing **out** and silent **restore** are not this feature's: both are the session's lifecycle, and the session is platform ([ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 3).

**The rest of what a reader meets under `/auth` is not this feature either.** The URL space and the layout are the auth **page group**'s, and each of the following is a capability of its own that the group composes. They are described here because no document yet owns them:

- **The post-registration journey** — profile completion and email verification, presented as one surface whose step is named by the server. The account is complete before any of it and nothing an account may do depends on it ([ADR 0008](../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) Decision 2, as revised); the journey's own state and transitions are the [API contract](../../api/api-contract.md)'s.
- **Profile completion** — name, bio and avatar, saved or skipped, with the avatar uploaded when it is chosen rather than at submit. It is the `profile` feature (`apps/web/src/features/profile/`); where it lives once a Users capability exists is still undecided ([Finding 0030](../../architecture/findings/0030-the-capabilities-predate-the-structure-they-share.md)).
- **Email verification** — requesting a code and confirming it, composing the [Channel Verification](../../backend/channel-verification.md) capability. Whether an address is proven is that capability's fact, never this feature's.
- **Account recovery** — asking for a code, confirming it, and setting a new password, composing the [Password Reset](../../backend/password-reset.md) capability. Where the reader stands is that capability's fact and never this feature's; the flow ends at sign-in rather than in a session ([ADR 0016](../../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 8).

## Responsibility boundary

Authentication is **the act of proving or creating an identity** ([ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 1). It **owns**: signing in and registering — their forms, the validation they compose, the state of their requests, and the wording of their refusals. It owns registration **whole**, provisionally: registration also creates an account, and a Users capability may later claim that half.

It does **not** own **the session** — who is signed in, with what token, whether that has been settled, and its restore, refresh and ending. That is the platform's, at `shared/session`. **Authentication commits a session and may react to its ending; the session knows nothing of authentication.**

It also does not own transport, the token model and its storage, request retries and the 401 replay, form execution, control rendering, or error normalization. Those belong to their platform owners and are **composed** here.

In one line: the feature decides *when and why* an identity is proved; the platform decides *how*, and holds what results.

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

## Committing a session

The feature's contribution is the **act**, not the fact that results. A reader signs in or registers; what that produces is the session's, and the session is the platform's.

1. **Sign in / register.** A schema config defines the form; the [form engine](../../frontend/forms.md) validates and hands the typed payload to the feature's action, which marks the request pending and calls the capability's **gateway**. On success the feature **commits a session** — the platform records who is signed in and with what token — and the reader is where the composition sends them. Failures arrive as one normalized `AppError`, pass through the feature's own wording, land in the per-request error state, and surface as a form-level alert.
2. **Everything after that is the session's.** Silent restore on startup, keeping the token current, and ending a session — as a command the reader gives or as a reaction to an ending the server has already made — belong to `shared/session` and are not described here. What the transport does while a session is alive is the [API client](../../frontend/api-client.md)'s.

The dependency runs one way: **authentication commits a session and may react to its ending; the session knows nothing of authentication** ([ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 5).

## Recovery — one route, and the server names the step

Account recovery is three steps on **one** route. Which of them renders is read from the server, never tracked by the client: a step's URL would be a second, reader-editable copy of a position the capability owns, and that shape was built once for the onboarding journey and rejected. The same conclusion is reached here for a stronger reason — the position *is* a credential, so the client cannot hold it at all ([ADR 0017](../../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)).

Three consequences follow, and they are the feature's own:

- **A reload lands on the step the reader reached, able to finish it.** Nothing is remembered on the client for that to work; the answer is asked for again.
- **A read that failed is not an answer.** It renders a retry rather than the first screen, because sending a reader back to the beginning would discard a recovery the server still holds.
- **No number on these screens is the client's.** The resend window and whether one may still be asked for are read from the position, so a countdown never reports something no server said.

Two things the reader can do are actions rather than claims about the step, and the distinction is what keeps the server authoritative. **Leaving** is always available and always safe, since the position outlives the visit. **Starting over** is confined to the code step: it abandons the attempt, and what actually moves the server is the request the address form then makes — which supersedes the position outright. At the password step it is deliberately absent, because a new request would discard control the reader has already proved.

Unlike the journey's read, this one waits for nothing. These endpoints are anonymous, so there is no session whose absence could be mistaken for an answer.

## Inside the capability

It is organised as the [capability structure](../../frontend/architecture.md#the-capability-structure) says, in the layers that structure names. What follows is what each holds here, not a rule — the rule is that document's:

- **`gateway/`** — the capability's calls to the server, behind its own port with one REST implementation over the authenticated client. The wire shapes and the mapper between them and the model live here too, so a contract change touches the mapper and not the flows ([Engineering Principles §4](../../development/engineering-principles.md)).
- **`store/`** — one `{status, error}` slot per flow a reader starts: **login and register, and nothing else.** The identity is not here; it is the session's. The slice is purely synchronous, with all async orchestration in the hooks.
- **`hooks/`** — the flow hooks that merge form state and request state into one typed contract, composed from the layers beneath.
- **`screens/`** — `SignIn` and `SignUp`, which present what their hooks return.
- **The root barrel is the only way in**, and it offers the two screens and the slice's reducer and actions — the reducer because the composition root must register it, which is mechanical wiring rather than a second spokesperson. What its surface is exactly is asserted by the capability's own `boundary.test.ts`.
- **Feature services.** The shared login/register flow (the single owner of the auth request choreography) and **error-message enrichment** — auth-specific wording layered over the normalized error for a handful of types (validation, conflict, forbidden, rate-limited) before it reaches the UI.
- **Configuration, not code, for forms.** The login and register forms are schema configs (fields, validators, layout spans) plus a message catalog; the [form engine](../../frontend/forms.md) does the rest. The validators are the feature's **client-side pre-check**; the [contract](../../api/api-contract.md) remains authoritative for what the server ultimately accepts (the current pre-check rules drift from the contract in places — tracked in [#263](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/263)). The wording is the feature's.

## Feature policies

- **What persists where:** **nothing is persisted on the client.** The access token lives in memory, in the **session's** slice; the user is fetched from the server on restore rather than cached; and the refresh token is never visible to this feature at all — the feature *applies* the platform's token model, it does not define it.
- **Errors speak auth.** Platform errors stay one typed shape; the feature only replaces the *message* for auth-relevant cases (e.g. a `conflict` becomes "This account is already registered. Try logging in.") — wording is feature-owned, the shape and pipeline are not.

## Relationship to the platform documentation

This document composes; it never re-documents. If a mechanism seems missing here — how the 401 replay works, how tokens rotate, how validation executes, how errors normalize — it is deliberately absent: follow the links to its owning document. The reciprocal rule also holds: platform documents never describe this feature's flows.

---

> This document owns the authentication **feature** — its capabilities, flows, composition, and policies. Every mechanism it composes is owned by its platform document (see the composition map), the wire contract by the [API contract](../../api/api-contract.md) — linked here, never duplicated.
