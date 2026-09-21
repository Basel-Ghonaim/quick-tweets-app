# Finding 0036: Documentation the feature split found missing

> **Status:** Open
> **Date:** 2026-09-21
> **Affected areas:** `apps/web/src/pages/auth/`; `apps/web/src/shared/channel-verification/`; `apps/api/src/modules/auth/journey/`; `apps/web/src/shared/api/media.ts`; [Documentation Strategy](../documentation-strategy.md) §3 and §6; [API contract](../../api/api-contract.md) (`PATCH /users/me`); [frontend architecture](../../frontend/architecture.md) (the platform index)
> **Reported by:** Basel Ghonaim (surfaced while giving recovery, profile and the journey documents of their own, [#786](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/786))

## Observation

Giving recovery, profile and the journey documents of their own ([Finding 0034](0034-four-capabilities-are-described-by-a-document-that-does-not-own-them.md)) meant checking what each of them points at. **Eight things they point at, or that the work relied on, are missing from the documentation.** They are grouped here because each is the same kind of gap, a subject with no home or a fact its owner does not state, and none of them was the split's to fill.

**Four parts of the code have no owning document:**

- **The auth page group's composition** (`apps/web/src/pages/auth/`). This is the route table and its guards, the two layouts and the progress display, the onboarding screen that turns the journey's answer into a screen or a redirect, and the screens that compose verification and profile, including the words the verification screens hand to channel verification. The [frontend architecture](../../frontend/architecture.md#the-page-group-contract-outer) owns what any page group promises; nothing describes what this one does. Every feature document now points at it, and the pointer ends in code. Before the split, the authentication document's list of what a reader meets under `/auth` was the nearest thing to a description.
- **Channel verification's client half** (`apps/web/src/shared/channel-verification/`). [Channel Verification](../../backend/channel-verification.md) owns the subsystem. Its client half is described nowhere: the ask and the code flows, the resend window it reads, and how it applies to each refusal the wording its consumer hands it. The frontend architecture's [platform index](../../frontend/architecture.md#the-platform-index) already says that half awaits a document of its own. The authentication document's one bullet on email verification was its only description, and the split removed it.
- **The journey's server half** (`apps/api/src/modules/auth/journey/`). The [API contract](../../api/api-contract.md#onboarding-journey) states what its endpoints do, and the [data model](../data-model.md) states how the phase is derived and why the way each step ended is stored. No backend document owns the module itself. That covers how its transitions are enforced, and how it asks Channel Verification whether a challenge is live and whether the channel is proven through a probe the composition root supplies, without importing Channel Verification. Password Reset, Channel Verification, Mail and Media each have such a document.
- **The frontend's reach to Media** (`apps/web/src/shared/api/media.ts`). The upload call profile uses, and the helper that builds a read URL, sit in the transport, and no frontend document mentions them. Where they belong is [Finding 0030](0030-the-capabilities-predate-the-structure-they-share.md)'s open question, and the missing description follows from it.

**Four gaps sit in documents that do own their subject:**

- **The ownership table** ([Documentation Strategy §6](../documentation-strategy.md#6-single-source-of-truth-rules)) has no row for the four backend subsystem documents: [Password Reset](../../backend/password-reset.md), [Channel Verification](../../backend/channel-verification.md), [Mail](../../backend/mail.md) and [Media](../../backend/media.md). Each is the authoritative home of its mechanism, and the map lists each one. The table that answers "who owns this fact" does not.
- **No whole-document criterion for a feature document.** The [Stable-Core rule](../documentation-strategy.md#when-a-platform-document-is-created--the-stable-core-rule) is worded for platform documents, and the only rule on the feature side is Strategy §4's *feature documents map to code modules*. #786 put recovery, profile and the journey to the Stable-Core test anyway. It read *cross-cutting* as "spans the tiers, or reaches past the capability's own code", and said so. That reading is the Work Item's, not the Strategy's.
- **The profile update's clearing forms.** The [contract](../../api/api-contract.md#patch-usersme--update-own-profile) states that `null` clears a name. It does not state that an empty name is refused, nor that a bio is cleared with an empty string and refuses `null` (`apps/api/src/modules/users/user.validator.ts:24-38`). Profile's mapper depends on both facts, so for now its document is the only place they are written down.
- **The one-time-code mechanism's countdown.** The platform index describes `shared/one-time-code` as how a typed code is normalised. The mechanism also holds the resend countdown recovery composes (`apps/web/src/shared/one-time-code/resendCooldown.ts`), and nothing describes that.

The frontend's reach to Media surfaced while profile's document was written. The last two gaps surfaced in the independent review of that work. The rest were identified before it began.

## Why it matters

Each code gap means that a reader who follows the documentation by subject reaches code rather than an owner. The next change to that subject then has no obvious home for its documentation. Finding 0034 recorded that problem for four capabilities. The split settles it for three; it stands for channel verification's client half, and now for three further subjects.

The other gaps are quieter. The ownership table is how a writer checks whether a fact already has a home before writing it down, and the criterion is how anyone decides whether a feature earns a document at all; today habit answers both questions, not a rule. A wire fact written only in a feature document is a fact the contract's readers never meet. A mechanism an index half-describes sends its reader to an owner that does not state what they came for.

## Why it is recorded rather than resolved

Whether each subject earns a document is the Stable-Core rule's to answer, and answering it is a Work Item of its own for each subject. It does not follow from moving three descriptions out of a fourth document. Two of the gaps are also already questions elsewhere: channel verification's document was ruled out of the Work Item that surfaced this, and where Media's upload belongs is Finding 0030's to settle.

The remaining gaps sit in documents that work did not otherwise need to change. Adding rows to the ownership table, or a criterion to the Strategy, changes a constitutional document's rules, which is a decision rather than a correction. Stating the clearing forms in the contract, and the countdown in the index, are corrections to their owners, and each owner is best corrected in its own change.

## Not decided here

Which of the four parts of the code earns a document, and in what order · whether the auth page group is described in a document of its own or beside the frontend architecture's page-group contract · whether the ownership table names every platform document or only recurring classes of fact · whether the Strategy gains a criterion for feature documents, and whether that criterion is a reading of the Stable-Core rule or a rule of its own · whether the one-time-code mechanism stays in the index or earns a document once it is described.
