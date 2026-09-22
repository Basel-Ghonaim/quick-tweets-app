# Feature: Authentication

> **Status:** Active.
> **Authority:** The authoritative source for the **authentication feature**, which is signing in and registering. It covers what the feature does, how its flow works, how it **composes** the platform, and its feature-specific configuration and policies. It owns the feature, **not the mechanisms it composes**: every shared mechanism it touches is owned by a platform document and linked here, never restated.
> **Scope:** The authentication capability (`apps/web/src/features/authentication/`) and its behavior. The wire contract is the [API contract](../api/api-contract.md#auth)'s; the server-side security mechanisms are [Backend Security](../backend/security.md)'s; the transport and the client half of the token model are the [frontend API client](../frontend/api-client.md)'s; the session a success commits is the platform's ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md)).
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organisation is the [capability structure](../frontend/architecture.md#the-capability-structure), which every capability shares and which that document owns. Anything not described here is not yet built, not architecturally rejected. **This document is interim:** its flat placement under `docs/features/` and its shape hold until feature documentation is restructured.
> **Version:** 3.0
> **Last Updated:** 2026-09-22
> **Owner:** Basel Ghonaim

## What the feature does

Authentication is **signing in and registering**:

- **Register.** A reader creates an account with a username, an email address and a password, and nothing else. A name and a picture are not collected here: they are the [profile](profile.md) feature's, offered once the account exists, and registration is **Media-free** ([ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)). Registering also opens the post-registration [journey](journey.md) on the server, in the same transaction as the account ([API contract](../api/api-contract.md#onboarding-journey)).
- **Sign in**, with a username or an email address and a password.

Either one **commits a session**. Signing **out** and silent **restore** are not this feature's: both are the session's lifecycle, and the session is platform ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 3).

**The rest of what a reader meets under `/auth` is not this feature's.** The URL space and the layout belong to the auth **page group**, which composes this feature with the [recovery](recovery.md), [profile](profile.md) and [journey](journey.md) features and with the platform's [Channel Verification](../backend/channel-verification.md). The three features are described by documents of their own. The page group and Channel Verification's client half have none yet ([Finding 0036](../architecture/findings/open/0036-documentation-the-feature-split-found-missing.md)).

## Responsibility boundary

Authentication is **the act of proving or creating an identity** ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 1). It **owns** signing in and registering: their forms, the validation they compose, the state of their requests, and the wording of their refusals. It owns registration **whole**, but provisionally: registration also creates an account, and a Users capability may later claim that half.

It does **not** own **the session**: who is signed in, with what token, whether that has been settled, and its restore, refresh and ending. That is the platform's, at `shared/session`. **Authentication commits a session and may react to its ending; the session knows nothing of authentication.** It owns no route either: the auth page group mounts its two screens and decides who may reach them.

Transport, the token model and its storage, request retries and the 401 replay, form execution, control rendering and error normalization belong to their platform owners and are **composed** here. So do the credential rules the forms apply.

In one line: the feature decides *when and why* an identity is proved; the platform decides *how*, and holds what results.

## How the feature composes the platform

The feature implements almost nothing generic itself. It configures and composes platform subsystems, each owned elsewhere:

| The feature needs | It composes | Owned by |
|---|---|---|
| Its endpoints and payloads | `POST /auth/login` and `POST /auth/register` | [API contract](../api/api-contract.md#auth) |
| Requests with credentials | the authenticated Axios client | [Frontend API Client](../frontend/api-client.md#three-clients) |
| What a success answers, and where it goes | the session's response shape, its mapper and its commit (`shared/session`) | [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md); the session's lifecycle awaits a document of its own ([platform index](../frontend/architecture.md#the-platform-index)) |
| The token model it participates in | in-memory access token, `HttpOnly` refresh cookie | [API client](../frontend/api-client.md#the-client-side-of-the-token-model) (client half) · [Backend Security](../backend/security.md#authentication-the-token-model) (server half) |
| Its forms | schema configs driving the form engine | [Frontend Forms](../frontend/forms.md) |
| The username, email and new-password rules | definitions the server also states (`shared/validation`) | [Frontend Architecture — platform index](../frontend/architecture.md#the-platform-index); which tier owns them is open ([Finding 0026](../architecture/findings/open/0026-no-tier-owns-the-credential-rules.md)) |
| Its controls | `SchemaField`-bound inputs, buttons, the message region | [Frontend Design System](../frontend/design-system/README.md) |
| One typed error shape | normalized `AppError` | [Frontend Error Handling](../frontend/error-handling.md) |
| Its words | the catalogue's authentication entries, in the active language | [Frontend Localisation](../frontend/localisation.md) |
| The account it creates or signs in to | the `User` entity | [Data model](../architecture/data-model.md) |

Where the platform needs something back from the application, namely the token getter and the session callbacks, the wiring happens in the **composition root**, not in this feature ([frontend architecture](../frontend/architecture.md#the-composition-root)).

## Committing a session

The feature's contribution is the **act**, not the fact that results. A reader signs in or registers; what that produces is the session's, and the session is the platform's.

1. **Sign in or register.** A schema config defines the form. The [form engine](../frontend/forms.md) validates it and hands the typed values to the feature's action, which marks that flow's request pending and calls the capability's **gateway**. On success the feature **commits a session**, meaning the platform records who is signed in and with what token, and then marks the request fulfilled. Only then does the reader move on: to the feed after signing in, into the [journey](journey.md) after registering. A failure arrives as one normalized `AppError`. It takes the feature's own wording where the feature has some, lands in that flow's error state, and is shown as a form-level alert, and the reader stays on the screen that can report it.
2. **Everything after that is the session's.** Silent restore on startup, keeping the token current, and ending a session belong to `shared/session` and are not described here, whether the ending is a command the reader gives or a reaction to an ending the server has already made. What the transport does while a session is alive is the [API client](../frontend/api-client.md)'s. The feature's one reaction is to the ending: both flows' request states reset, so that a fresh sign-in never opens on a stale refusal.

The dependency runs one way: **authentication commits a session and may react to its ending; the session knows nothing of authentication** ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 5).

## Inside the capability

It is organised as the [capability structure](../frontend/architecture.md#the-capability-structure) says, in the layers that structure names. What follows is what each layer holds here, not a rule; the rule is that document's.

- **`model/`**: the credentials each form collects.
- **`gateway/`**: the capability's calls to the server, behind its own port with one REST implementation over the authenticated client. The request wire shapes and the mapper between them and the model live here too, so a contract change touches the mapper and not the flow ([Engineering Principles §4](../development/engineering-principles.md)). What a success answers is the session's shape, mapped by the session's own mapper, since a session is authentication's entire output.
- **`services/`**: three things. The one flow that sign-in and registration share, which is the single owner of the request choreography. The guard that moves a reader on only after a success. And the feature's wording, layered over the normalized error for a handful of error types before it reaches the interface.
- **`store/`**: one `{status, error}` slot per flow a reader starts, **sign-in and registration, and nothing else**. The identity is not here; it is the session's. The slice is synchronous, because the orchestration is the flow service's.
- **`forms/`**: the two form definitions, built from the active catalogue. **Sign-in checks presence only.** It checks an existing credential and must not apply the account-creation policy, and the server's sign-in validation does not apply it either. **Registration applies the full rules**: the username's length and characters, the email address's format, the new-password policy, and a matching confirmation. The rules themselves are read from the cross-tier definitions, whose owning tier is open ([Finding 0026](../architecture/findings/open/0026-no-tier-owns-the-credential-rules.md)), and what the server finally accepts is the [contract](../api/api-contract.md#auth)'s.
- **`hooks/`**: the two flow hooks. Each merges form state and request state into one typed contract and hands its screen the fields to render, so that no screen names a schema.
- **`screens/`**: `SignIn` and `SignUp`, which present what their hooks return. Sign-in also shows a notice another flow hands it on arrival, as recovery does after a reset.
- **The root barrel is the only way in.** It offers the two screens and the slice's reducer and actions: the reducer because the composition root must register it, which is mechanical wiring rather than a second spokesperson. That surface, and the rule that no screen reaches the forms or the services, are asserted by the capability's own `boundary.test.ts`.

**A known deviation stands:** the screens name the routes they send a reader to, which a capability does not own. The destinations are the feed, the journey, recovery and each other. They are recorded in [Finding 0030](../architecture/findings/open/0030-the-capabilities-predate-the-structure-they-share.md), together with the question of how a screen learns a destination it does not own.

## Feature policies

- **What persists where:** **this feature persists nothing on the client.** What a success yields is committed to the session, which holds the access token in memory, and the refresh token never reaches this feature at all. The feature *applies* the platform's token model; it does not define it.
- **Errors speak auth.** Platform errors stay one typed shape; the feature replaces only the *message*, for a handful of error types. A refused sign-in is reported for the form as a whole and never says which field was wrong. The wording belongs to the feature and lives in the catalogue; the shape and the pipeline do not.

## Relationship to the platform documentation

This document composes; it never re-documents. If a mechanism seems missing here, such as how the 401 replay works, how tokens rotate, how validation executes or how errors normalize, it is deliberately absent: follow the links to its owning document. The reciprocal rule also holds: platform documents never describe this feature's flows.

---

> This document owns the authentication **feature**, signing in and registering: its flow, composition and policies. Every mechanism it composes is owned by its platform document (see the composition map), and the wire contract by the [API contract](../api/api-contract.md), linked here and never duplicated.
