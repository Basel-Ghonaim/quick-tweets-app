# Finding 0031: The proofs predate the topology they are to share

> **Status:** Open
> **Date:** 2026-09-13
> **Affected areas:** `apps/web/src/modules/auth/screens/Verify/Verify.stories.tsx`; `apps/web/src/modules/auth/screens/Onboarding/Onboarding.stories.tsx`; `apps/web/src/modules/auth/screens/Profile/Profile.stories.tsx`; `apps/web/src/features/recovery/screens/Recovery.stories.tsx`
> **Reported by:** Basel Ghonaim (surfaced while recording the testing topology, [#716](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/716))

## Observation

The [testing topology](../../development/testing-topology.md) was recorded after the proof it governs had been written, and some of that proof is not in the lane that owns it. Four story files are affected; the other twenty-one construct no double and are correct as they stand.

Every case below is **component-lane behavior held in the browser lane**, and every one waits on the component lane the topology adopts but does not yet build. They divide by what they assert, not by whether they can be removed.

**Interaction and rendering — and each also restates a service outcome the unit lane already proves.** The component decides that a control is wired, that a message reaches a region, that a value appears; a service decides what that value or message *is*. Only the second half is redundant, so the remedy is to **narrow** each case to the half this lane owns — never to delete it:

| Browser case | What the component decides — unproven elsewhere | The half already proven |
|---|---|---|
| `Verify` · *the code field forgives what is typed* | that typing into the field runs the normaliser at all | `shared/one-time-code/normaliseCode.test.ts` — four cases over the same inputs |
| `Verify` · *the cooldown refusal says what it is* and *the client limiter says something else* | that clicking *send* issues the request, and the failure reaches a `role="alert"` region | `shared/channel-verification/services/executeVerification.test.ts` — *"tells the address cooldown apart from the client limiter"* |
| `Verify` · *sending is reported in place* | that the in-flight state reaches the button's label | the same file — *"reports the attempt through the state it was handed"* |
| `Verify` · *the wait comes from the server* | that an open window renders the resend control **disabled** | `services/resolveVerification.test.ts` and `shared/one-time-code/resendCooldown.test.ts` |
| `Verify` · *arriving with no window offers resend at once* | that nothing outstanding renders the control **enabled** | `resendCooldown.test.ts` — *"starts open, because nothing has been sent yet"* |
| `Verify` · *a failed read still lets the code be typed* | that a failed read leaves the field usable and the control enabled | `resolveVerification.test.ts` — *"reports a failed read as failed"* |
| `Recovery` · *the step chooses the screen* | that the chosen step's heading is the one rendered | `features/recovery/services/screenFor.test.ts` |
| `Recovery` · *a failed read offers a retry* | that the failure renders a retry control rather than the first screen | `features/recovery/services/resolveRecovery.test.ts` |
| `Onboarding` · *a failed read offers a retry* | the same, for the journey | `features/journey/services/resolveJourney.test.ts` |
| `Profile` · *choosing a picture starts the upload* | that selecting a file reaches the upload at all | `features/profile/services/avatarUpload.test.ts` |
| `Profile` · *saving is reported in place* | that the in-flight state reaches the button | `features/profile/services/executeProfileUpdate.test.ts` |
| `Profile` · *a server error is announced* | that the message is announced in an alert region | `features/profile/services/profileErrorHandler.test.ts` — the wording |

**Lifecycle — nothing here is proven anywhere else.** These wait on the same lane:

| Case | What it asserts |
|---|---|
| `Onboarding` · *the position is asked for once* | a read count, through a counter and a 150 ms sleep |
| `Onboarding` · *the journey waits for the session* | a read count of zero, through a 200 ms sleep |
| `Recovery` · *the position is asked for once* | a read count, through a counter and a 150 ms sleep |
| `Recovery` · *confirming re-reads rather than assuming* | that a second read occurs |
| `Onboarding` · *skipping says it was skipped* | a spy on outbound moves, held in `useState<JourneyMove[]>` |
| `Profile` · *skipping issues no request* | a spy — that no request was made |
| `Onboarding` · *leaving never waits on the close* | that navigation does not await a promise |

**The interaction class is wider than the twelve named above.** Typing, clicking, disabled state and the values that follow need a renderer but not a browser, so they belong to the component lane under [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) Decision 5. The twelve are named because each also restates a service outcome; the rest are spread across the same four files, and listing them case by case would be an inventory that the first move invalidates.

## Why it matters

A lane that holds proof it does not own is trusted for something it was not built to guarantee. Every case above runs in a browser to establish something a renderer alone could establish, and every one of them needed a gateway double to reach its state — which is what published three capability ports and put a dead parameter in five production signatures.

The restated halves compound it rather than cause it: a reader of a service assertion in a browser cannot tell whether the lane is proving the service or the screen, so neither claim is load-bearing.

The lifecycle cases are the sharpest symptom. Two of them assert through elapsed time, which is a lane telling its reader that it could not observe what it was asked to prove.

## Why it is recorded rather than resolved

**Nothing here can be resolved before the component lane exists**, including the restated halves: narrowing a case to the component's half leaves that half still in the browser lane, so the narrowing is work the move does rather than work that precedes it. [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) is deliberately a decision and not a migration, and the lane is its own Work Item with its own evidence.

Recording the inventory here rather than in the [topology](../../development/testing-topology.md) keeps that document a Contract: it states the rule, and this register states which proof does not yet meet it — the same division [Finding 0030](0030-the-capabilities-predate-the-structure-they-share.md) holds against the capability structure.

## Not decided here

What the component lane is built on. Whether a restated half is dropped as the case moves or kept as a second assertion in the lane that then owns both. Where the production seams that only these cases use are removed, which is its own Work Item — and which this Finding does not license, because a seam is removed when nothing needs it, never to make a lane's work easier.

## Addendum — 2026-09-13, the classification was wrong

**The twelve cases in the first table were recorded as *duplicated*, and verification before any deletion proved they are not.** They were to be deleted in the Work Item that followed this Finding. Applying the topology's own test — *if this lane's case were deleted, would the behavior still be proven?* — to each of them in turn answered **no** every time, so none of them could be deleted, and the Work Item's scope was empty.

**What the check found.** Each case asserts **more than one behavior**, and [ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) Decision 3 attributes each to the unit that decides it. `Verify` · *the cooldown refusal says what it is* asserts three: that clicking *send* issues the request, that `too_many_requests` maps to the cooldown wording, and that the mapped message reaches a `role="alert"` region. Only the middle one is a service's, and only it is proven elsewhere. Delete the case and two behaviors stop being proven.

The same shape held for all twelve. The original table collapsed two behaviors into one by reading *the message a reader sees* as the service's outcome, when the service decides the wording and the component decides that it is rendered at all.

**What changed above.** The *duplicated* class is gone; those cases now sit with the rest of the interaction class, as component-lane behavior held in the browser lane, with the already-proven half named per case so the narrowing is not rediscovered. The table's second column — what the component decides, and unproven anywhere — is the part that was missing when this Finding was written. No case was deleted, no test changed, and no production file was touched.

**Why it is recorded rather than quietly fixed.** The classification was wrong for one day and was caught by the rule the same effort had just recorded, before a single test was edited. That sequence is the evidence that the topology is usable as a rule rather than a description, and deleting the mistake would delete the evidence.

The Finding stays `Open`: every case above waits on the component lane.

## Addendum — 2026-09-13, the lifecycle class is resolved ([#719](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/719))

**The component lane is built and gated, and the lifecycle behaviors are in it.** They are proven against the hooks that decide them — `useJourney` and `useRecovery` — rather than through the screens that happened to render them, and the two `setTimeout` proofs are gone. *The journey waits for the session* no longer asserts that nothing happened within 200 ms; it asserts that nothing is asked while the session is unsettled **and that the read follows the moment it settles**, which is the behavior the sleep was standing in for. The lifecycle row above is resolved.

**One case in that table was never lifecycle.** `Profile` · *skipping issues no request* uses no gateway double, does not spy, and asserts that no alert appears and submit stays enabled after a click. `skip` is `useCallback(() => onSettled?.("skipped"))` and reaches no gateway, so there was nothing to spy on. It is **interaction**, and moves to that class — which now holds thirteen named cases, not twelve.

**A gap the move exposed, and which this Finding now records.** Three of the four mutations run against the new tests failed exactly one test each. The fourth did not: removing the `useMemo` that holds `useJourney`'s gateway across renders **breaks nothing**, because every test supplies a stable gateway through the hook's optional parameter, and the memo only matters on the path where none is supplied. **The seam added for testing is what prevents the behavior it protects from being proven.** No test was added to close this — a test that reached for the memo would assert an implementation rather than an outcome ([Engineering Principles §8](../../development/engineering-principles.md)) — and it is evidence for the Work Item that removes the seam rather than for this one.

**Nothing in production changed.** The six tests inject through the existing optional gateway, which stays marked for removal; no prop, parameter or barrel was touched.

The Finding stays `Open`: the interaction class remains, and waits on nothing now but a Work Item to move it.
