# Finding 0034: Four capabilities are described by a document that does not own them

> **Status:** Resolved
> **Date:** 2026-09-15
> **Resolved:** [#786](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/786) — the authentication document no longer describes any of the four. Recovery, profile and the journey have documents of their own; channel verification was ruled out of scope, and its client half's missing document is Finding 0036's.
> **Affected areas:** [`docs/features/authentication/authentication.md`](../../../features/authentication.md); `apps/web/src/features/journey/`; `apps/web/src/features/profile/`; `apps/web/src/features/recovery/`; `apps/web/src/shared/channel-verification/`
> **Reported by:** Basel Ghonaim (surfaced while the documents were restated to four zones, [#740](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/740))

## Observation

The authentication feature document was written when `modules/auth/` held one fused module. The code no longer does: **journey**, **profile** and **recovery** are features of their own, and **channel verification** is a platform capability — each with its own barrel, its own layers and its own fence.

The document still describes all four. Its list of what a reader meets under `/auth` names the post-registration journey, profile completion, email verification and account recovery, and it is the only place any of them is described. **None of the four has a document.**

[Documentation Strategy §3](../../documentation-strategy.md) gives a feature document **one** business capability, and Principle 3 gives a document one clearly defined subject. This one currently carries five.

## Why it matters

A reader looking for how recovery behaves has one place to go, and it is a document whose declared subject is something else. Anything written about recovery there is invisible to anyone reading by subject, and the next change to recovery has no obvious home for its documentation — which is how the descriptions drift apart from the capabilities they describe.

It also hides a real question. Whether each capability earns a document is the **Stable-Core rule**'s to answer ([ADR 0004](../../decisions/0004-stable-core-platform-document-rule.md), Strategy §3): a subsystem earns one when it has at least one fact that is real, settled, cross-cutting, non-obvious and not already owned elsewhere. Four capabilities have never been put to that test, because the question never came up while one document covered them all.

## Why it is recorded rather than resolved

Deciding which of the four earns a document, and where profile's finally lives once a Users capability exists, is not a restatement's to take — the Work Item that found this was correcting documents against code the ADRs had already settled. Creating four documents inside it would be inventing the answer to a question nobody has asked, which is the scope creep [Engineering Execution Standard §7](../../../development/engineering-execution-standard.md) forbids.

The document states the gap plainly in the meantime, so a reader is not misled about who owns what.

## Not decided here

Which of the four earns its own document under the Stable-Core rule · whether recovery and the journey are documented as features or as part of the auth page group's surface · where profile's description lives, given that [Finding 0030](../open/0030-the-capabilities-predate-the-structure-they-share.md) leaves the capability's own home open until a Users capability exists.

## Addendum — 2026-09-21, resolved ([#786](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/786))

**None of the four is described by the authentication document any more.** [Recovery](../../../features/recovery.md), [profile](../../../features/profile.md) and the [journey](../../../features/journey.md) have documents of their own. They sit flat under `docs/features/` beside [authentication](../../../features/authentication.md), which now covers signing in and registering and points at the rest in one line. All four documents declare themselves interim: their placement and shape hold until feature documentation is restructured. The document this Finding names moved in the same change, from the path cited above to `docs/features/authentication.md`.

**The three questions this Finding left open were answered in that Work Item.**

- Recovery, profile and the journey were each put to the Stable-Core rule. The rule is worded for platform documents, so it was applied with *cross-cutting* read as "spans the tiers, or reaches past the capability's own code". All three passed, the journey narrowly.
- Recovery and the journey are documented as features, because the code places them there.
- Profile's description lives in its own document, which says that the capability is temporary until a Users capability exists, and that where it then lives is that capability's question.

**Channel verification was ruled out of scope.** It is platform, and its server half already has a document. That its client half has none is recorded with the other gaps the split exposed, in [Finding 0036](../open/0036-documentation-the-feature-split-found-missing.md).
