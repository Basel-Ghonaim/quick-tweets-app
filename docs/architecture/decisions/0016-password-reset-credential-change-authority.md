# ADR 0016: Password Reset — Credential-Change Authority, Owned Separately and Composed from What Exists

> **Status:** Proposed
> **Date:** 2026-09-03
> **Deciders:** Basel Ghonaim

## Context

**Recovering access to one's own account is committed product scope** ([overview](../../project/overview.md)), and nothing in the codebase serves it. `auth.routes.ts` publishes `register · login · logout · refresh · logout-all`; there is **no password-change path of any kind**, for a recovering user or an authenticated one.

Two of the mechanisms it needs already exist, and both were built anticipating this consumer. [ADR 0015](0015-mail-delivery-boundary-and-abuse-control.md) Decision 7 justifies Delivery owning a per-recipient cap **by naming account recovery**: *"Account recovery is unauthenticated and has no actor to key on at all, which is precisely why the recipient cap must live in Delivery."* And [ADR 0009](0009-channel-verification-platform-capability.md) produced a credential lifecycle — mint, digest at rest, constant-time comparison, single use, one opaque failure, a record-anchored cooldown, a sweep — whose shape recovery needs almost exactly.

**That proximity is the hazard, not the opportunity.** The obvious move is to extend Channel Verification, and it has to be refused *in writing*: a reader who finds two flows minting single-use emailed codes will reasonably ask why one capability does not serve both, and the absence of an answer is how a narrow boundary gets widened later by someone with less context. ADR 0009 answered that question for its own boundary. Nothing answers it for recovery's.

**What genuinely has no owner is the authority itself.** Auth owns the password value, its hashing and the session; User owns the address; Channel Verification owns proof of control over an endpoint. **Nobody owns *who may change a credential, and on what evidence*.** That is [ADR 0002](0002-refined-adr-threshold.md) criterion 2's ground — a boundary that must be preserved independently of whatever implements it — and it is the same ground ADR 0009 stood on before it had a consumer.

## Decision

**This record draws a boundary and implements nothing.**

**1. Password Reset owns one fact:** *"this bearer is currently authorized to set a new password for this account."* It is **momentary** (it exists to be spent), **single-use**, **expiring**, and held by an **unauthenticated** actor.

**2. It is not Channel Verification, and does not extend it.** The two facts differ in every dimension that would have to be reconciled to merge them:

| | Channel Verification | Password Reset |
|---|---|---|
| Subject | an endpoint value | an account |
| Actor | the authenticated holder | an anonymous bearer |
| Lifetime | standing and defeasible | momentary, consumed on use |
| Consequence | a status others may read | a credential changes; every session dies |

ADR 0009 Decision 2 gives that capability **exactly one fact**, about an endpoint, and its trustworthiness is a function of that narrowness. Widening it to carry credential-change authority would dissolve the property the capability exists to have.

**3. It is an Auth capability, and lives in `apps/api/src/modules/auth/`** — it owns a distinct fact of its own (Decision 1), but it is not a *platform* capability and not a module of its own.

The distinction is not a matter of taste here, because **the repository already draws it consistently**: every platform capability publishes a barrel — `channel-verification`, `mail-delivery`, `media` — and **no feature does** — `auth`, `tweets`, `comments`, `users`, `follows`. A platform capability exists because something *else* reads its fact. **Nothing reads recovery's fact**; it is produced and spent inside one flow, so there is no surface to publish and no consumer to publish it to.

Auth is also where the operation lands: the password hash, its comparison, and the session revocation the flow must perform are all Auth's, and **Auth already carries this exact shape** — `RefreshToken`, a short-lived credential table with a scheduled cleanup job. Recovery's credential is a second instance of a pattern the module already holds.

**4. It reuses Channel Verification's pattern by copying it, not by extracting a shared abstraction.** [Engineering Principles §3](../../development/engineering-principles.md) builds generalization machinery *"when a second instance exists to shape it"* — and this is that second instance, so extraction is now permissible rather than premature. It is still declined for now: the two differ precisely in the load-bearing parts (who the caller is, what the subject is, what the transaction must guarantee), and an abstraction drawn today would be shaped by the instance that already exists rather than by both. **Extraction is earned by a third instance agreeing with the second, not by the second arriving.**

**5. Delivery is composed and never owned** — the direction ADR 0009 Decision 7 fixed, unchanged here. Recovery composes the same mechanism, and its message content is its own.

**6. The answer to a reset request is neutral, and neutrality is a property of the contract rather than of the interface.** The status, the body and the shape are identical whether or not an account exists, and **existence is never revealed by advancing to a further step** — a second screen that appears only for real accounts is the same disclosure with more clicks. This continues the posture [Backend Security](../../backend/security.md) already holds for login and registration, and it is ratified product direction ([UX brief](../../features/authentication/product/ux-brief.md) §4).

**The residual is stated rather than discovered:** a request for a real address does work a request for an unknown one does not, so *timing* remains an imperfect oracle even when the response is byte-identical. Closing that is an implementation obligation, not a boundary question, and it is named in what this ADR does not decide.

**7. It requires no proven endpoint, and never writes verification state.** Requiring proof would be circular — it would lock out precisely the users recovery exists for, and it would be a gating policy, which is out of scope by decision. Writing verification state would breach ADR 0009 Decision 2's sole authority: a password changing is not an endpoint changing, so the proof is untouched and stays true.

**8. Completing a reset revokes every session**, through Auth's existing per-user revocation, and the flow ends at login rather than in an authenticated app. This is ratified product direction (UX brief `D5`); it is recorded here because it is a *security* obligation of the capability, not only a navigational one — a credential change that left old sessions alive would leave the attacker it was invoked against still signed in.

**9. Its timing and its code format are its own configuration, never Channel Verification's.** The boundary this record draws in the large holds in the small too: a shared setting would let one flow's operational retuning silently move the other's security properties, and neither owner would see it happen.

The values approved with this boundary are a **10-minute credential lifetime**, a **60-second resend cooldown**, and a **12-character code drawn from Crockford Base32** — the alphabet that omits `I`, `L`, `O` and `U`. Each is recorded here rather than left wholly to implementation because each follows from something this record decides:

- The lifetime is **shorter than verification's** because Decision 1's credential changes a password, and authority to change a credential should be spendable for less time than a status report.
- The excluded letters matter more to the actor Decision 1 names — someone locked out, retyping from a phone — than to a holder already signed in.
- The length is what makes the single paste-friendly field the right control rather than a segmented one, a decision the [design direction](../../features/authentication/product/ux-direction.md) already took and which shortening the code would reopen.

**They remain tunables, and this ADR does not own them.** It records the values approved alongside the boundary; where they live and how they are carried is configuration.

## What this ADR does not decide

Deliberately deferred, each to a named home:

- **The credential's storage shape** — table, columns, indexes, and whether the digest reuses Channel Verification's construction. Schema, settled in implementation.
- **The endpoints, their payloads and their status codes** — the [API contract](../../api/api-contract.md)'s, co-versioned when they are built.
- **How response neutrality is achieved against timing** — Decision 6's residual; an implementation obligation.
- **The emailed-link path.** The UX brief's `D3` ratifies two independent paths for this flow. The code path is sequenced first; **nothing here reopens or removes the link**, and the credential model is required not to foreclose it.
- **How Decision 9's values are carried** — the setting names, their place in the environment schema, and any later retuning. Configuration, owned by the effort's execution plan and the schema, not by this record.
- **Delivery's reserved recovery floor.** [ADR 0015](0015-mail-delivery-boundary-and-abuse-control.md) Decision 6's, whose stated condition this record's acceptance meets.

## Alternatives considered

- **Extend Channel Verification to issue reset credentials.** *Rejected.* It would give a capability defined by owning **one** fact a second, differently-shaped one, and would make an authenticated endpoint-proof mechanism serve an anonymous credential-change actor. The narrowness is the trustworthiness.
- **Build a generic one-time-credential platform capability now, serving both.** *Deferred.* The second instance has arrived, which makes this permissible rather than speculative — but the two instances disagree on actor, subject and transaction shape, which is where the abstraction would have to be right. Drawn now it would encode the first instance's assumptions, which is the failure Engineering Principles §3 exists to prevent.
- **A separate `modules/password-reset/`.** *Rejected.* Nothing reads its fact, so it would publish a barrel with no consumer; and reaching Auth's hashing and session revocation would force Auth to publish **its first barrel** to serve exactly one caller — machinery for a single case, and a capability boundary where the repository's own pattern places none.
- **Reuse the `refresh_tokens` table for the reset credential.** *Rejected.* Different lifetime, different authority, and a shared table makes one control's retention setting silently govern the other's — the coupling ADR 0015 Decision 5 refused for the same reason.
- **Require a proven address before allowing recovery.** *Rejected as circular*, per Decision 7.
- **Sign the user in on a successful reset.** *Rejected* by ratified direction (`D5`), and by Decision 8's reasoning: the sessions being revoked are the ones that may belong to an attacker.
- **Reveal on the request screen whether the account exists**, to spare a user a mistyped address. *Rejected.* It is an enumeration oracle, it is the anti-pattern the product's own research recorded in a real product, and the cost lands on every account to save one user one retry.

## Consequences

- **Auth gains a second credential and a second scheduled sweep**, mirroring `RefreshToken` and its cleanup job. Its module grows; its published surface does not, because it still publishes none.
- **Delivery gains its second consumer**, which **meets [ADR 0015](0015-mail-delivery-boundary-and-abuse-control.md) Decision 6's stated condition** — *"the second consumer is what earns the partition."* The partition takes the shape of a **reserved recovery floor** and is **its own Work Item, sequenced before recovery sends any mail**, so the first release cannot ship the starvation D6 named: verification traffic exhausting the per-address budget that recovery needs.
- **The API contract gains the recovery endpoints** when they are built, co-versioned then ([Documentation Strategy §10](../documentation-strategy.md)).
- **A platform document is not created now.** Under the Stable-Core rule ([ADR 0004](0004-stable-core-platform-document-rule.md)) it is earned once the subsystem exists in code; until then this record is the interim one, exactly as ADR 0009 was for Channel Verification.
- **[ADR 0009](0009-channel-verification-platform-capability.md) is unchanged**, and this record is the answer to the question its Context left open when it placed password reset out of scope.
- Status moves from `Proposed` to `Accepted` **on merge**; its lifecycle thereafter is the [Documentation Strategy](../documentation-strategy.md)'s.
