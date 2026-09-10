# ADR 0019: Authentication Is a Feature, and the Session Is Platform

> **Status:** Accepted
> **Date:** 2026-09-10
> **Deciders:** Basel Ghonaim
> **Amends:** [ADR 0018](0018-composition-has-a-home-four-frontend-zones.md) — Decision 5, and the consequences that name authentication a page group and identity's mechanism

## Context

[ADR 0018](0018-composition-has-a-home-four-frontend-zones.md) dissolved *authentication* as a feature into a page group, on the assumption that what it contained were separate capabilities. The first of those to be extracted, the session, turned out to hold **two responsibilities fused in one state**.

One is **the act of authenticating** — proving an identity by signing in, or creating one by registering: the forms, the validation they compose, the state of the request each makes, and the wording of its refusals. The other is **the fact of a session** — who is signed in, with what token, and whether that question has yet been answered — together with the lifecycle that restores it silently on load, refreshes it when it expires, and ends it.

The distinction is the code's, not a theory laid over it. The fact has two producers, and only one of them is authentication: a silent restore establishes the same state without any form. The lifecycle imports nothing of signing in or registering. No consumer outside the two authentication screens needs an authentication operation — every external need is the session's truth, its lifecycle, the command to end it, or a reaction to its ending. And the fused state's own comment already draws the line, explaining why a restore must not touch the request state a form reads; a boundary that lives in a comment is one the structure failed to express.

Separating them changes where the session may live. Once authentication is its own capability, it is the session's first consumer — with an intrinsic *write* dependency, since a session is authentication's entire output. A feature may not import another feature. The platform, meanwhile, already depends on the session: its transport attaches the session's token, its documentation already places the token in the session's keeping, and its second transport reaches that state today through an untyped cast because it cannot import a feature. ADR 0018 expected the current user's identity to reach features through a contract. That expectation changes here.

## Decision

### 1. Two capabilities, where one was assumed

**Authentication** is the act of proving or creating an identity. It is a **feature**. **The session** is the fact that results, and its lifecycle. It is **platform**.

### 2. Where each lives

The session lives in the platform zone, as `shared/session`. Authentication lives among the features, as `features/authentication`. The URL space and layout that ADR 0018 named a page group keep their name; the act that runs under that URL space is this feature.

### 3. What the session owns

The fact: who is signed in, with what token, and whether that has been settled. Its lifecycle: silent restore, refresh, and ending — in **both** forms, the command a reader gives and the reaction to an ending the server has already made — including the state of that command. **Identity**: *who is signed in* is the session's fact, and no feature's.

It owns **no form, no route, no product interface, and no content**. It composes no wording of its own; what a reader is told belongs to whoever renders it, exactly as the platform's other capabilities already hold.

### 4. What authentication owns

Signing in and registering: their forms, the validation they compose, the state of their requests, and the wording of their refusals. It owns registration **whole** — provisionally, because registration also creates an account, and a Users capability may later claim that half. Nothing here decides it.

### 5. The dependency runs one way

Authentication commits a session and may react to its ending. **The session knows nothing of authentication.**

### 6. The criterion: when a capability is platform rather than a feature

A capability belongs to the platform when **all four** hold:

1. it publishes **no route and no product interface**;
2. it **depends on no feature**;
3. it is needed by **the platform itself**, or by **more than one feature where composition cannot pass the answer down**;
4. what it owns is **application truth** — the client's relationship to the server or to the document — or shared vocabulary, and **never** a product noun's state, and **never** content.

The session meets all four. Channel verification, already in the platform, met them before this criterion was written; it is now the rule that placed it rather than a precedent that happened to.

### 7. The platform reads the session as a peer

The session's fact is read by the platform's own mechanisms directly, as one part of the platform composing another. The reach through a guess at its shape is retired by this placement, not repaired around.

### 8. Identity's mechanism

ADR 0018 anticipated the current user's identity reaching features through a contract, as the case composition cannot serve. It does not. Features import the session. The contract mechanism remains for its genuinely narrow case — a feature needing behaviour that another feature owns and must keep owning — and identity is no longer an instance of it.

## Alternatives considered

- **Keep one capability, authentication and session fused.** Rejected: the fusion was already known and explained in prose rather than structure, it binds a form's request state to whatever zone the session needs, and it left the session's consumers with no legal path — the platform reaching it through a cast, and a sibling capability reaching it through a peer import.
- **The session as a feature, with a contract for every consumer.** Rejected: ADR 0018 rejected contracts as the general answer, and here they would be the norm rather than the exception — beginning with authentication's own commit, which is not a dependency a contract can sensibly carry.
- **The session in the composition root.** Rejected: that zone holds no logic, and features cannot import it, so authentication could not commit a session at all.
- **Split further — the fact in the platform, its lifecycle as a feature.** Rejected: it cuts one cohesive capability in two for no beneficiary; the lifecycle's consumers may all reach the platform directly.
- **A React context over the store.** Rejected: a second read path over state the store already holds, and it cannot serve the callers that are not React.

## Consequences

- **ADR 0018 is amended in three places.** Its consequence that *"authentication ceases to be a feature"* is narrowed: the URL space and layout are a page group, and the act of authenticating is a feature under it. Its consequence naming identity's mechanism is replaced by Decision 8. Its Decision 5 now admits a stateful platform capability — the platform may own a store slice, as its query cache already did.
- **The platform gains a capability whose name invites accumulation.** What it may hold is enumerated in Decision 3 rather than left to be inferred, and the boundary is held mechanically, as the platform's other boundaries are.
- **A recorded defect closes by construction.** The platform's untyped reach into the session becomes a peer read, and the defect it carried disappears with the reach rather than being patched.
- **This is a decision, not a move.** The fused state is split. The migration plan's proof-by-unchanged-counts does not apply to the Work Item that implements this, and that Work Item must not claim it.
- **The migration plan is wrong once this lands** — it describes the session as a feature and places the platform's refactor out of scope. The implementing Work Item sits outside the plan, precedes its remaining extractions, and amends it.
- **The authentication feature document claims the feature owns session orchestration.** It does not, once this lands; the document is restated when the implementation does.
- **Registration's ownership is provisional**, and this ADR says so rather than leaving it to be inferred from the Users capability's absence.
- **Nothing moves and no behaviour changes** because of this ADR. Sequencing, naming below the two homes named here, and every mechanism belong to the implementing Work Item.

Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
