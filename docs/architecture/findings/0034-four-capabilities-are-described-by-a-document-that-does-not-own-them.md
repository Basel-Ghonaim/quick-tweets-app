# Finding 0034: Four capabilities are described by a document that does not own them

> **Status:** Open
> **Date:** 2026-09-15
> **Affected areas:** [`docs/features/authentication/authentication.md`](../../features/authentication/authentication.md); `apps/web/src/features/journey/`; `apps/web/src/features/profile/`; `apps/web/src/features/recovery/`; `apps/web/src/shared/channel-verification/`
> **Reported by:** Basel Ghonaim (surfaced while the documents were restated to four zones, [#740](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/740))

## Observation

The authentication feature document was written when `modules/auth/` held one fused module. The code no longer does: **journey**, **profile** and **recovery** are features of their own, and **channel verification** is a platform capability — each with its own barrel, its own layers and its own fence.

The document still describes all four. Its list of what a reader meets under `/auth` names the post-registration journey, profile completion, email verification and account recovery, and it is the only place any of them is described. **None of the four has a document.**

[Documentation Strategy §3](../documentation-strategy.md) gives a feature document **one** business capability, and Principle 3 gives a document one clearly defined subject. This one currently carries five.

## Why it matters

A reader looking for how recovery behaves has one place to go, and it is a document whose declared subject is something else. Anything written about recovery there is invisible to anyone reading by subject, and the next change to recovery has no obvious home for its documentation — which is how the descriptions drift apart from the capabilities they describe.

It also hides a real question. Whether each capability earns a document is the **Stable-Core rule**'s to answer ([ADR 0004](../decisions/0004-stable-core-platform-document-rule.md), Strategy §3): a subsystem earns one when it has at least one fact that is real, settled, cross-cutting, non-obvious and not already owned elsewhere. Four capabilities have never been put to that test, because the question never came up while one document covered them all.

## Why it is recorded rather than resolved

Deciding which of the four earns a document, and where profile's finally lives once a Users capability exists, is not a restatement's to take — the Work Item that found this was correcting documents against code the ADRs had already settled. Creating four documents inside it would be inventing the answer to a question nobody has asked, which is the scope creep [Engineering Execution Standard §7](../../development/engineering-execution-standard.md) forbids.

The document states the gap plainly in the meantime, so a reader is not misled about who owns what.

## Not decided here

Which of the four earns its own document under the Stable-Core rule · whether recovery and the journey are documented as features or as part of the auth page group's surface · where profile's description lives, given that [Finding 0030](0030-the-capabilities-predate-the-structure-they-share.md) leaves the capability's own home open until a Users capability exists.
