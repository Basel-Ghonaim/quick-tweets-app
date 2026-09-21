# Feature: Recovery

> **Status:** Active.
> **Authority:** The authoritative source for the **recovery feature**: what it does, how its flow runs, how it **composes** the platform, and its feature-specific policies. It owns the client half of account recovery, **not the mechanisms it composes** and not the server half. Whether the bearer of a code may set a new password, and where a reader stands, are [Password Reset](../backend/password-reset.md)'s, linked here and never restated.
> **Scope:** The recovery capability (`apps/web/src/features/recovery/`) and its behaviour. The wire contract is the [API contract](../api/api-contract.md#password-reset)'s; the reset cookie's place in the HTTP surface is [Backend Security](../backend/security.md#the-reset-session-cookie)'s; the client its requests travel on is the [frontend API client](../frontend/api-client.md#three-clients)'s.
> **Maturity:** This document describes the feature **as currently implemented** and grows with it. Its internal organisation is the [capability structure](../frontend/architecture.md#the-capability-structure), which every capability shares and which that document owns. Anything not described here is not yet built, not architecturally rejected. **This document is interim:** its flat placement under `docs/features/` and its shape hold until feature documentation is restructured.
> **Version:** 1.0
> **Last Updated:** 2026-09-21
> **Owner:** Basel Ghonaim

## What the feature does

Recovery is **setting a new password for an account whose holder cannot sign in**. It is three steps on one screen:

- **Asking for a code.** The reader gives an address and moves to the code step whatever the address was. The answer is neutral by design, and that neutrality is the [contract](../api/api-contract.md#password-reset)'s and [Password Reset](../backend/password-reset.md)'s, not this feature's.
- **Confirming the code.** The reader types or pastes it, asks for another while one may still be asked for, or starts over with a different address.
- **Setting the new password**, under the same policy registration applies. The flow ends at sign-in rather than in a session ([ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) Decision 8).

## Responsibility boundary

Recovery **owns** the recovery screen and its three steps, their forms and the validation they compose, the client's read of where the reader stands, and the wording of its refusals. It also owns the only two things a client may add to the server's answer: the address it has just submitted, and whether the reader is starting over.

It does **not** own where the reader stands, the code, or whether a code is usable. Those are held on the server ([ADR 0017](../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)), and the client asks rather than decides. It does not own **the session**: a completed reset has already revoked every session on the server, and recovery clears whatever this tab still holds through the platform's session ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md)) rather than holding any of its own. It owns no route either: the auth page group mounts the screen and decides who may reach it.

Transport, the cookie, form execution, control rendering, error normalisation, how a typed code is normalised and the password policy's rules belong to their platform owners and are **composed** here.

In one line: the feature decides what a reader sees and may do at each step; the server decides which step it is.

## How the feature composes the platform

| The feature needs | It composes | Owned by |
|---|---|---|
| Its endpoints and payloads | the five password-reset endpoints | [API contract](../api/api-contract.md#password-reset) |
| The server half: the position, the code, what completion produces | the Password Reset subsystem | [Password Reset](../backend/password-reset.md) · [ADR 0016](../architecture/decisions/0016-password-reset-credential-change-authority.md) · [ADR 0017](../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md) |
| Requests that carry the reset cookie and no token | the credentialed public client | [Frontend API Client](../frontend/api-client.md#three-clients) |
| Its forms | schema configs driving the form engine | [Frontend Forms](../frontend/forms.md) |
| Its controls | `SchemaField`-bound inputs, the code input, buttons, the message region | [Frontend Design System](../frontend/design-system/README.md) |
| One typed error shape | normalized `AppError` | [Frontend Error Handling](../frontend/error-handling.md) |
| Its words | the recovery catalogue, in the active language | [Frontend Localisation](../frontend/localisation.md) |
| The address rule and the new-password policy | rules the server also states (`shared/validation`) | [Frontend Architecture — platform index](../frontend/architecture.md#the-platform-index); which tier owns them is open ([Finding 0026](../architecture/findings/0026-no-tier-owns-the-credential-rules.md)) |
| A typed code's normalisation, and the resend countdown | the one-time-code mechanism (`shared/one-time-code`) | [Frontend Architecture — platform index](../frontend/architecture.md#the-platform-index) |
| Clearing any session this tab still holds | the session's ending (`shared/session`) | [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md); its lifecycle awaits a document of its own ([platform index](../frontend/architecture.md#the-platform-index)) |

## One route, and the server names the step

The three steps share **one** screen. Which of them renders is read from the server and never tracked by the client. Why the position is held there, and why a URL per step was rejected, is [ADR 0017](../architecture/decisions/0017-recovery-session-and-the-proof-a-reset-produces.md)'s. What follows is what that means for this feature:

- **A reload lands on the step the reader reached, able to finish it.** Nothing is remembered on the client for that to work: the screen asks again where the reader stands.
- **A read that failed is not an answer.** It renders a retry rather than the first step, because sending a reader back to the beginning would discard a recovery the server still holds. Every way the read can fail collapses into that one state: it never answers `404` and never needs a session.
- **The step after a confirmation is re-read, not assumed.** Confirming answers with nothing, so the feature asks for the position again rather than deciding the next step itself.
- **Nothing here waits for the session.** These endpoints are anonymous, so, unlike the journey's read, there is no session whose absence could be mistaken for an answer.

Two things a reader can do are actions rather than claims about the step, and that distinction is what keeps the server authoritative. **Leaving** is always available and always safe: every step links back to sign-in, and the position outlives the visit. **Starting over** is offered only at the code step. It abandons this attempt and returns to the address form, and what actually moves the server is the request that form then makes, which supersedes the position outright. At the password step it is deliberately absent, because a new request would discard control the reader has already proved.

## The steps

1. **Asking.** The address form checks that an address is present and well formed, then asks for a code. The server answers with the position, and the code step renders. The client keeps the address it submitted in memory, for this visit only. The address form is prefilled with it whenever the reader returns to that form. The code step confirms that a code is on its way only when this visit asked for one, since after a reload there is nothing to confirm. If the server later answers that the reader is back at the beginning, the address form says the attempt lapsed.
2. **Confirming.** The code field checks presence only, because the code's shape is the server's to judge and a malformed code must not be told apart from a wrong one. The code is normalised before it is sent: the server normalises nothing and refuses every unusable code alike, so a lowercase code would otherwise look like a wrong one. **The resend window is the server's number.** Its seconds count down on the client from the value the position reports, and every new position restarts the count, even when it repeats the same value. When the position says no more may be asked for, the resend control gives way to a line saying so. The seconds are not announced; only the moment the window opens is, because that is what changes what the reader can do.
3. **Setting the password.** The new password and its confirmation are checked against the policy registration applies, read from the same place. Once the server accepts it, the feature **clears any session this tab still holds**: the reset has already revoked every session on the server, and a leftover one would only earn a `401` on its next call. The reader is then sent to sign-in with a notice that the password has changed.

## Inside the capability

It is organised as the [capability structure](../frontend/architecture.md#the-capability-structure) says, in the layers that structure names. What follows is what each layer holds here, not a rule; the rule is that document's.

- **`model/`**: the step, the position as the client reads it, the state of a read, and the screen the route shows. The screen is the server's step, a wait for it, or a retry after a failed read; the one thing the client adds is that the reader is starting over.
- **`gateway/`**: the five calls behind the capability's own port, over the credentialed public client. The position's wire shape and the mapper that renames it into the model live here too. The gateway takes no address when resending and no code when applying, because the position holds both.
- **`services/`**: the logic that runs without a renderer. It resolves the read into the server's answer or a single failed state, chooses the screen from a read and whether the reader is starting over, completes a reset and ends the session, and words a refusal.
- **`forms/`**: the three steps' form definitions, built from the active catalogue.
- **`hooks/`**: one hook holds the server's answer and replaces it with every answer the server gives. A second adds what this visit contributes: the submitted address and the starting-over flag. There is one hook per step's form, and one for the resend window.
- **`screens/`**: the recovery screen, which renders the step its hooks choose, and the three steps within a shared layout. The code field is bound directly rather than through the form engine's `SchemaField` seam, because that seam does not forward the input attributes a pasted code needs, and the code's alphabet has letters, so the keyboard must not be numeric.
- **No `store/`.** Nothing recovery holds outlives the screen that reads it.
- **The root barrel is the only way in**, and it offers the recovery screen and nothing else. That surface, and the rule that no screen reaches the forms or the services, are asserted by the capability's own `boundary.test.ts`.

**A known deviation stands:** the steps name the sign-in route directly, which a capability does not own. It is recorded in [Finding 0030](../architecture/findings/0030-the-capabilities-predate-the-structure-they-share.md), together with the question of how a screen learns a destination it does not own.

## Feature policies

- **What persists where:** **nothing is persisted on the client.** The position lives on the server, addressed by a cookie JavaScript cannot read. The address a reader submitted lives in memory for the visit and is gone on reload.
- **Refusals are opaque on purpose.** Every refusal about a code or a position is the server's single `400` ([contract](../api/api-contract.md#password-reset)). The feature words it as one message and never names a cause, because naming one would distinguish what the server deliberately does not. The per-IP limiter's refusal gets recovery's own words too. Every other error keeps the platform's message.
- **The wording is the feature's; the shape and the pipeline are not.** Its labels, hints and refusals are recovery's own entries in the catalogue, in the reader's language. The validation messages are the ones every form shares.

## Relationship to the platform documentation

This document composes; it never re-documents. If a mechanism seems missing here, such as how the position is opened and superseded, how the code is checked, what a completed reset proves, or how the cookie is hardened, it is deliberately absent: follow the links to its owner. The reciprocal rule also holds: [Password Reset](../backend/password-reset.md) never describes this feature's screens.

---

> This document owns the recovery **feature**: its steps, flow, composition and policies. Every mechanism it composes is owned by its platform document (see the composition map), the server half by [Password Reset](../backend/password-reset.md), and the wire contract by the [API contract](../api/api-contract.md), linked here and never duplicated.
