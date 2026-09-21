# Feature: Journey

> **Status:** Active.
> **Authority:** The authoritative source for the **journey feature**, the client's hold on where a newly registered reader stands in the post-registration journey. It covers what the feature does, how it **composes** the platform, and its feature-specific policies. It owns the feature, **not the mechanisms it composes**, not the journey's phases and transitions, and not the steps the journey passes through.
> **Scope:** The journey capability (`apps/web/src/features/journey/`) and its behaviour. The journey's phases, its transitions and what each refuses are the [API contract](../api/api-contract.md#onboarding-journey)'s; the steps are the [profile](profile.md) feature's and [Channel Verification](../backend/channel-verification.md)'s.
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organisation is the [capability structure](../frontend/architecture.md#the-capability-structure), which every capability shares and which that document owns. Anything not described here is not yet built, not architecturally rejected. **This document is interim:** its flat placement under `docs/features/` and its shape hold until feature documentation is restructured.
> **Version:** 1.0
> **Last Updated:** 2026-09-21
> **Owner:** Basel Ghonaim

## What the feature does

The journey is the path a reader is offered right after registering: completing a profile, then verifying their email address. The account is complete before any of it, and nothing an account may do depends on it ([ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) Decision 2, as revised).

This feature is **the client's hold on where the reader stands in that journey**. It does four things:

- **Reads** the phase the server names, together with how the profile step was left.
- **Moves** the journey forward, whether leaving the profile step as saved or skipped, or reaching the code step.
- **Closes** it when the reader leaves.
- **Retries** a read that failed.

It has no interface of its own. The screens, the progress display and which move each screen makes belong to the auth page group, which composes this feature with the steps. That group has no document of its own yet ([Finding 0036](../architecture/findings/0036-documentation-the-feature-split-found-missing.md)).

## Responsibility boundary

The journey **owns** the client's read of the journey and the moves it sends: when to ask, what the answer is while it is not yet known, what a failed read reports, and that leaving never waits. It holds the server's answer and nothing of its own.

It does **not** own the phases, the transitions, or whether a move is allowed. Those are the server's, and the [contract](../api/api-contract.md#onboarding-journey) states them. It does not own the **steps**. Editing a profile is the [profile](profile.md) feature's, and whether an address is proven is [Channel Verification](../backend/channel-verification.md)'s: this feature neither reads nor writes that fact. What the server asks Channel Verification, and when, is the [contract](../api/api-contract.md#onboarding-journey)'s and the [data model](../architecture/data-model.md)'s to state. It does not own **the session**, though it waits for it to settle. It does not own **the composition**: how a phase becomes a screen, a redirect or a progress state is the page group's.

Transport and error normalisation belong to their platform owners and are **composed** here.

In one line: the feature asks the server where the reader belongs and tells it when they move; the server decides both.

## How the feature composes the platform

| The feature needs | It composes | Owned by |
|---|---|---|
| Its endpoints and payloads | `GET /onboarding/journey` and `POST /onboarding/journey/advance` | [API contract](../api/api-contract.md#onboarding-journey) |
| The server half: deriving the phase, storing how the profile step was left, consulting Channel Verification | the journey module under `apps/api/src/modules/auth/` | the [API contract](../api/api-contract.md#onboarding-journey) states its behaviour and the [data model](../architecture/data-model.md) how its phase is derived; no backend document owns the module yet ([Finding 0036](../architecture/findings/0036-documentation-the-feature-split-found-missing.md)) |
| Requests as the signed-in reader | the authenticated Axios client | [Frontend API Client](../frontend/api-client.md#three-clients) |
| Whether the session has settled | the session's settled flag (`shared/session`) | [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md); its lifecycle awaits a document of its own ([platform index](../frontend/architecture.md#the-platform-index)) |
| Telling an unauthenticated failure from any other | normalized `AppError` | [Frontend Error Handling](../frontend/error-handling.md) |

## The server names the phase

The phase is **the server's answer**, never a step the client tracks. The page group gives the whole journey one route and renders whatever that answer names, so a reload, a second tab and a typed path all land in the same place. What that means for this feature:

- **It asks only once the session has settled.** Restoring a session does not block the first render, so a read sent earlier would meet a `401` that says nothing about the journey. Until the session has answered, the read stays unresolved.
- **Every answer it waits for replaces the last.** Both endpoints answer with the same shape, so the feature re-syncs from each read and each move it awaits, rather than deriving the next state from its own request. The close is the one move it does not wait for (below). Nothing is remembered across a reload.
- **At `verify`, the read tries the move to `code`.** Only the server knows whether a verification challenge is outstanding, and refusing the move is how it says there is none. A reader who already asked for a code therefore returns to the code step, and one who did not stays where they were.
- **A failed read is not an answer.** It is reported as a failure, never as a closed journey, and it says whether the failure was an unauthenticated one, because that is the one a page can act on differently. Any failed read may be retried.
- **Leaving never waits.** The close is sent and its outcome is not awaited, and a failure to send it is ignored. The feed is public, and a dropped network must not trap a reader on a screen they asked to leave. The contract makes a repeated close harmless.

How the profile step was left is recorded in the journey's own type, `saved` or `skipped`. The profile feature reports the same thing in a type of its own, and the page passes profile's report on as the journey's outcome. The two types are declared separately, so the pass-through holds only while their values agree.

## Inside the capability

It is organised as the [capability structure](../frontend/architecture.md#the-capability-structure) says, in the layers that structure names. What follows is what each layer holds here, not a rule; the rule is that document's.

- **`model/`**: the phase, how the profile step was left, the state both endpoints answer, the moves, and the state of a read. Moves are discriminated so that only leaving the profile step can carry an outcome.
- **`gateway/`**: the capability's own port, for reading and advancing, with one REST implementation over the authenticated client.
- **`services/`**: the read, including the attempted move at `verify`, turned into the server's answer or a failure that says whether it was unauthenticated.
- **`hooks/`**: one hook that holds the server's answer, waits for the session before asking, and offers the move, the close and the retry.
- **No `screens/`, `forms/` or `store/`.** The journey has no interface and takes no input, and nothing it holds outlives the screen that reads it.
- **The root barrel is the only way in**, and it offers the hook and the vocabulary a page composes: the phase, the read and the profile outcome. That surface, and the rule that the journey holds no interface, content, form, control or route, are asserted by the capability's own `boundary.test.ts`.

## Feature policies

- **What persists where:** **nothing is persisted on the client.** Where the reader stands lives on the server, and every visit asks again.
- **It has no words.** The journey reports states rather than messages: a pending read, a failure and whether it was unauthenticated, the answer. Whatever a reader is told about them is worded by the page that renders it.

## Relationship to the platform documentation

This document composes; it never re-documents. If something seems missing here, it is deliberately absent. How a phase is derived, which moves are refused and why, what the code step requires of Channel Verification, and how each screen of the journey looks all belong elsewhere: follow the links to their owners. The reciprocal rule also holds: the contract and the platform documents never describe this feature's reads.

---

> This document owns the journey **feature**: the client's read of the journey, its moves and its policies. The journey's phases and transitions are owned by the [API contract](../api/api-contract.md#onboarding-journey), the steps by the [profile](profile.md) feature and [Channel Verification](../backend/channel-verification.md), and every mechanism it composes by its platform document, linked here and never duplicated.
