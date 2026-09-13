# Finding 0031: The proofs predate the topology they are to share

> **Status:** Open
> **Date:** 2026-09-13
> **Affected areas:** `apps/web/src/modules/auth/screens/Verify/Verify.stories.tsx`; `apps/web/src/modules/auth/screens/Onboarding/Onboarding.stories.tsx`; `apps/web/src/modules/auth/screens/Profile/Profile.stories.tsx`; `apps/web/src/features/recovery/screens/Recovery.stories.tsx`
> **Reported by:** Basel Ghonaim (surfaced while recording the testing topology, [#716](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/716))

## Observation

The [testing topology](../../development/testing-topology.md) was recorded after the proof it governs had been written, and some of that proof is not in the lane that owns it. Four story files are affected; the other twenty-one construct no double and are correct as they stand.

**Duplicated — the owning lane exists and already proves it.** These are redundancy rather than debt, because nothing is waiting on a lane that does not exist:

| Browser case | Already owned by |
|---|---|
| `Verify` · *the code field forgives what is typed* | `shared/one-time-code/normaliseCode.test.ts` — four cases over the same inputs |
| `Verify` · *the cooldown refusal says what it is* and *the client limiter says something else* | `shared/channel-verification/services/executeVerification.test.ts` — *"tells the address cooldown apart from the client limiter"* |
| `Verify` · *sending is reported in place* | the same file — *"reports the attempt through the state it was handed"* |
| `Verify` · *the wait comes from the server* | `services/resolveVerification.test.ts` and `shared/one-time-code/resendCooldown.test.ts` |
| `Verify` · *arriving with no window offers resend at once* | `resendCooldown.test.ts` — *"starts open, because nothing has been sent yet"* |
| `Verify` · *a failed read still lets the code be typed* | `resolveVerification.test.ts` — *"reports a failed read as failed"* |
| `Recovery` · *the step chooses the screen* | `features/recovery/services/screenFor.test.ts` |
| `Recovery` · *a failed read offers a retry* | `features/recovery/services/resolveRecovery.test.ts` |
| `Onboarding` · *a failed read offers a retry* | `features/journey/services/resolveJourney.test.ts` |
| `Profile` · *choosing a picture starts the upload* | `features/profile/services/avatarUpload.test.ts` |
| `Profile` · *saving is reported in place* | `features/profile/services/executeProfileUpdate.test.ts` |
| `Profile` · *a server error is announced* — **the wording half only** | `features/profile/services/profileErrorHandler.test.ts`; that the message is announced in an alert region is the component's, and stays |

**Outside its lane — the owning lane is adopted but not built.** These are the transition the topology's closed list names, and they wait on the component lane:

| Case | What it asserts |
|---|---|
| `Onboarding` · *the position is asked for once* | a read count, through a counter and a 150 ms sleep |
| `Onboarding` · *the journey waits for the session* | a read count of zero, through a 200 ms sleep |
| `Recovery` · *the position is asked for once* | a read count, through a counter and a 150 ms sleep |
| `Recovery` · *confirming re-reads rather than assuming* | that a second read occurs |
| `Onboarding` · *skipping says it was skipped* | a spy on outbound moves, held in `useState<JourneyMove[]>` |
| `Profile` · *skipping issues no request* | a spy — that no request was made |
| `Onboarding` · *leaving never waits on the close* | that navigation does not await a promise |

**Interaction is the larger class and is not enumerated here.** Typing, clicking, disabled state and the values that follow need a renderer but not a browser, so they belong to the component lane under [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) Decision 5. They are spread across the same four files, and listing them case by case would be an inventory that the first cleanup invalidates.

## Why it matters

A lane that holds proof it does not own is trusted for something it was not built to guarantee. The duplication is the cheaper symptom: the same behavior is asserted twice, in the slower lane as well as the one that owns it, and the browser copy is the one that required a gateway double — which is what published three capability ports and put a dead parameter in five production signatures.

The lifecycle cases are the sharper symptom. Two of them assert through elapsed time, which is a lane telling its reader that it could not observe what it was asked to prove.

## Why it is recorded rather than resolved

Nothing here can be resolved before the component lane exists, and the two classes are resolved by different work: the duplicated cases are deleted once the topology is the rule, and the out-of-lane cases move once there is a lane to move them to. Both are Work Items with their own evidence, and [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) is deliberately a decision and not a migration.

Recording the inventory here rather than in the [topology](../../development/testing-topology.md) keeps that document a Contract: it states the rule, and this register states which proof does not yet meet it — the same division [Finding 0030](0030-the-capabilities-predate-the-structure-they-share.md) holds against the capability structure.

## Not decided here

The order in which the two classes are corrected. Whether a duplicated case is deleted or its assertion narrowed to the half the browser lane does own — the profile error case shows both halves in one case. What the component lane is built on. Where the production seams that only these cases use are removed, which is its own Work Item.
