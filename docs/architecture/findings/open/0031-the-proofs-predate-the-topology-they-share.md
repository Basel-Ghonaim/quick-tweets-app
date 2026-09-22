# Finding 0031: The proofs predate the topology they are to share

> **Status:** Open
> **Date:** 2026-09-13
> **Affected areas:** `apps/web/src/modules/auth/screens/Verify/Verify.stories.tsx`; `apps/web/src/modules/auth/screens/Onboarding/Onboarding.stories.tsx`; `apps/web/src/modules/auth/screens/Profile/Profile.stories.tsx`; `apps/web/src/features/recovery/screens/Recovery.stories.tsx`
> **Reported by:** Basel Ghonaim (surfaced while recording the testing topology, [#716](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/716))

## Observation

The [testing topology](../../../development/testing-topology.md) was recorded after the proof it governs had been written, and some of that proof is not in the lane that owns it. Four story files are affected; the other twenty-one construct no double and are correct as they stand.

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

**The interaction class is wider than the twelve named above.** Typing, clicking, disabled state and the values that follow need a renderer but not a browser, so they belong to the component lane under [ADR 0020](../../decisions/0020-proof-has-a-home-testing-topology.md) Decision 5. The twelve are named because each also restates a service outcome; the rest are spread across the same four files, and listing them case by case would be an inventory that the first move invalidates.

## Why it matters

A lane that holds proof it does not own is trusted for something it was not built to guarantee. Every case above runs in a browser to establish something a renderer alone could establish, and every one of them needed a gateway double to reach its state — which is what published three capability ports and put a dead parameter in five production signatures.

The restated halves compound it rather than cause it: a reader of a service assertion in a browser cannot tell whether the lane is proving the service or the screen, so neither claim is load-bearing.

The lifecycle cases are the sharpest symptom. Two of them assert through elapsed time, which is a lane telling its reader that it could not observe what it was asked to prove.

## Why it is recorded rather than resolved

**Nothing here can be resolved before the component lane exists**, including the restated halves: narrowing a case to the component's half leaves that half still in the browser lane, so the narrowing is work the move does rather than work that precedes it. [ADR 0020](../../decisions/0020-proof-has-a-home-testing-topology.md) is deliberately a decision and not a migration, and the lane is its own Work Item with its own evidence.

Recording the inventory here rather than in the [topology](../../../development/testing-topology.md) keeps that document a Contract: it states the rule, and this register states which proof does not yet meet it — the same division [Finding 0030](0030-the-capabilities-predate-the-structure-they-share.md) holds against the capability structure.

## Not decided here

What the component lane is built on. Whether a restated half is dropped as the case moves or kept as a second assertion in the lane that then owns both. Where the production seams that only these cases use are removed, which is its own Work Item — and which this Finding does not license, because a seam is removed when nothing needs it, never to make a lane's work easier.

## Addendum — 2026-09-13, the classification was wrong

**The twelve cases in the first table were recorded as *duplicated*, and verification before any deletion proved they are not.** They were to be deleted in the Work Item that followed this Finding. Applying the topology's own test — *if this lane's case were deleted, would the behavior still be proven?* — to each of them in turn answered **no** every time, so none of them could be deleted, and the Work Item's scope was empty.

**What the check found.** Each case asserts **more than one behavior**, and [ADR 0020](../../decisions/0020-proof-has-a-home-testing-topology.md) Decision 3 attributes each to the unit that decides it. `Verify` · *the cooldown refusal says what it is* asserts three: that clicking *send* issues the request, that `too_many_requests` maps to the cooldown wording, and that the mapped message reaches a `role="alert"` region. Only the middle one is a service's, and only it is proven elsewhere. Delete the case and two behaviors stop being proven.

The same shape held for all twelve. The original table collapsed two behaviors into one by reading *the message a reader sees* as the service's outcome, when the service decides the wording and the component decides that it is rendered at all.

**What changed above.** The *duplicated* class is gone; those cases now sit with the rest of the interaction class, as component-lane behavior held in the browser lane, with the already-proven half named per case so the narrowing is not rediscovered. The table's second column — what the component decides, and unproven anywhere — is the part that was missing when this Finding was written. No case was deleted, no test changed, and no production file was touched.

**Why it is recorded rather than quietly fixed.** The classification was wrong for one day and was caught by the rule the same effort had just recorded, before a single test was edited. That sequence is the evidence that the topology is usable as a rule rather than a description, and deleting the mistake would delete the evidence.

The Finding stays `Open`: every case above waits on the component lane.

## Addendum — 2026-09-13, the lifecycle class is resolved ([#719](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/719))

**The component lane is built and gated, and the lifecycle behaviors are in it.** They are proven against the hooks that decide them — `useJourney` and `useRecovery` — rather than through the screens that happened to render them, and the two `setTimeout` proofs are gone. *The journey waits for the session* no longer asserts that nothing happened within 200 ms; it asserts that nothing is asked while the session is unsettled **and that the read follows the moment it settles**, which is the behavior the sleep was standing in for. The lifecycle row above is resolved.

**One case in that table was never lifecycle.** `Profile` · *skipping issues no request* uses no gateway double, does not spy, and asserts that no alert appears and submit stays enabled after a click. `skip` is `useCallback(() => onSettled?.("skipped"))` and reaches no gateway, so there was nothing to spy on. It is **interaction**, and moves to that class — which now holds thirteen named cases, not twelve.

**A gap the move exposed, and which this Finding now records.** Three of the four mutations run against the new tests failed exactly one test each. The fourth did not: removing the `useMemo` that holds `useJourney`'s gateway across renders **breaks nothing**, because every test supplies a stable gateway through the hook's optional parameter, and the memo only matters on the path where none is supplied. **The seam added for testing is what prevents the behavior it protects from being proven.** No test was added to close this — a test that reached for the memo would assert an implementation rather than an outcome ([Engineering Principles §8](../../../development/engineering-principles.md)) — and it is evidence for the Work Item that removes the seam rather than for this one.

**Nothing in production changed.** The six tests inject through the existing optional gateway, which stays marked for removal; no prop, parameter or barrel was touched.

The Finding stays `Open`: the interaction class remains, and waits on nothing now but a Work Item to move it.

## Addendum — 2026-09-13, Verify's interaction is in its lane ([#721](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/721))

**Seven behaviors moved, and the table's third column was wrong for five of them.** Verifying before acting — for the third time on this Finding — found that `executeVerification.test.ts` proves the **mechanism** and not the wording: it stands in its own map and says so, *"this layer knows only that a map was given, never whose it is."* That `too_many_requests` reads as the cooldown wording lives in the screen's own `messages.ts`, and **no unit test asserts it**. So *the cooldown refusal says what it is*, *the client limiter says something else*, *sending is reported in place*, *arriving with no window offers resend at once* and *a failed read still lets the code be typed* restated nothing. They were the only proof of what they assert.

**Three assertions did restate, and were narrowed rather than dropped.** Two were expected — the normaliser's output and the reducer's window — and a mutation found a third: *a failed read still lets the code be typed* repeated a normalised literal too. Each now asserts against the owning lane's own output rather than a copy of it, so the wiring is proven and the transformation is not repeated.

**The correction that matters for the rest of the class:** a story asserting *the words a reader sees* is usually asserting the **screen's** mapping, not a service outcome. The service applies whatever map it is handed. Expect the three remaining files to hold fewer restatements than this Finding's table claims, and check each before narrowing it.

**The doubles stay in `Verify.stories.tsx`.** `standing()` survives because the code screen reads on mount, so even a pure rendering case needs an answerer; `refusing()` left with the cases that used it. That is the mount-time read showing through, not a residual violation, and it is the seam-removal Work Item's to answer.

**A count this Finding has been carrying wrong.** The interaction table holds twelve rows but **thirteen** cases — one row names two — and the reclassified profile case makes **fourteen**, not the thirteen the previous addendum said. Seven are now resolved; seven remain, in `Recovery`, `Profile` and `Onboarding`.

The Finding stays `Open`.

## Addendum — 2026-09-13, Profile's interaction is in its lane ([#723](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/723))

**Four behaviors moved, and this time the table was right about one and wrong about none** — but only checking established that. `profileErrorHandler.test.ts` asserts the **real** catalogue entry, unlike Verify's service test which stood in its own map, so *a server error is announced* genuinely restated and was narrowed. The other three were confirmed un-narrowed by mutation, each run against **both** lanes: breaking the submit label and breaking the file-selection wiring each failed one component test while the unit lane held at 254, which is what proves the unit lane does not cover them.

**A narrowing technique that was available for Verify is not available generally.** Verify's cases could defer to their owner by name — asserting `normaliseCode(typed)` rather than a literal. Profile's could not: `profileErrorHandler` is **not published**, and publishing it so a test could name it would be production adapting to a lane. The assertion was narrowed to what a consumer can see instead — an alert appears, carrying the handled message rather than the raw one — and a mutation that renders the raw message fails it. **Where an owner is private, narrowing asserts the consequence rather than the value.**

**A browser API the component lane does not have.** `new DataTransfer()` is undefined in jsdom, so *choosing a picture starts the upload* could not carry its harness across. The file is put on the input directly instead; the assertion is unchanged, and a mutation that unwires the selection still fails it. The story's note about `pointer-events: none` stayed behind, because that is a browser fact.

**What the browser lane keeps, recorded rather than left silent.** Four cases remain in `Profile.stories.tsx` — the resting layout, the stepper's rendered state, the live bio count, the narrow viewport — and they are the browser lane's by charter. Beyond the named fourteen, the interaction class is wider: `Recovery.stories.tsx` holds fourteen cases of which two are named, and `Onboarding.stories.tsx` three of which one is. Whether the unnamed ones follow is not decided here, and this Finding does not assert they are misplaced without the same per-case check the named ones received.

Eleven of the fourteen named cases are now resolved. Three remain: two in `Recovery`, one in `Onboarding`.

The Finding stays `Open`.

## Addendum — 2026-09-13, the named class is complete ([#725](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/725))

**The last three moved and none narrowed** — a third distinct outcome, after Verify narrowed three of seven and Profile one of four. The difference is a distinction this Finding had not drawn, and it is the useful thing to come out of the three rounds:

> A case **restates** when its assertion **names** another lane's output. It **traverses** when it merely **depends** on one to reach its own subject.

Profile's error case named `AUTH_COPY.profile.invalid`, which `profileErrorHandler.test.ts` asserts — a restatement, and narrowed. These three name a heading, a control and a wording that **no other lane asserts**; the mapping they depend on sits upstream of the assertion rather than inside it. Traversal is what the [topology](../../../development/testing-topology.md) already permits: *another lane may traverse a behavior incidentally; it may not take it as its subject.*

**Two mutations per case established that, rather than reading.** Breaking a mapping — `screenFor({failed})` to `request`, `destinationFor({failed})` to `feed` — failed **both** lanes, which is what proves the unit lane owns it and these cases only pass through. Breaking a rendering — the retry control's name, in each screen — failed **only** the component lane, which is what proves each case has a subject of its own. Had a mapping mutation failed only the component lane, the verdict would have been wrong and the case would have narrowed.

**Where each test lives follows the capability's fences, unamended.** Recovery's sits inside the capability, because its barrel publishes only the screen, and reaches its model and gateway by relative path. Onboarding's sits beside its screen in the legacy zone.

**All fourteen named interaction cases are resolved.** The lifecycle class was resolved in #719.

**The transition row is not closed, and this Finding does not propose closing it.** The interaction class is wider than the fourteen this Finding named: `Recovery.stories.tsx` holds twelve further cases, `Onboarding.stories.tsx` two, `Profile.stories.tsx` four and `Verify.stories.tsx` five. Each was left on the ground that it needs a browser, and **none has had the per-case check the fourteen received**. Whether any belongs in the component lane is a separate evaluation, and until it happens this Finding asserts nothing about them.

The Finding stays `Open` for that evaluation.

## Addendum — 2026-09-13, the evaluation, and a cost the three moves did not name ([#727](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/727))

**The evaluation found the opposite of what the remaining cases' placement assumed.** Twenty-one of the twenty-three unnamed cases assert structure, text, DOM attributes or typing — things a renderer establishes. Only two need a browser for their **assertions**: the two `Compact` cases, which read the viewport.

**But every story in those four files carries `a11y: { test: "error" }`**, which `preview.ts` documents as failing CI on violations, and which was proven to bite: an unlabelled input on `VerifyAsk` failed **three** browser tests and **zero** component tests, though the component lane renders that screen three times. **Each story is therefore also an accessibility assertion on a real rendering, and the component lane has no equivalent.** That is browser-only under this repository's own [topology](../../../development/testing-topology.md), and it is why the remaining twenty-one are not moved: each would trade a cheap assertion for the loss of an axe run.

**Nine states had already lost theirs, and nothing said so.** Each was rendered only by a case that #722, #724 or #726 moved. Five were proven by injecting a violation inside the state's branch and finding the browser lane still green; four were established by reading which stories remain:

| State | Established by |
|---|---|
| `VerifyAsk` error · `VerifyCode` error · `Profile` error · `Recovery` retry · `Onboarding` retry | mutation — the lane stayed green |
| `VerifyAsk` sending · `VerifyCode` resend held · `Profile` submitting · `Profile` avatar uploading | reading — no remaining story reaches them |

**This was a regression introduced by those three Work Items and not named in any of them.** Each reported its Storybook delta as "exactly the cases moved", which was true of the count and silent about what the count carried.

**All nine are restored** by stories whose only purpose is the axe run, asserting presence and nothing else. Each is proven by the mutation that proved it lost: the violation now fails, and fails on the restoring story alone.

**A rule this suggests, deliberately not applied here:** a case may be correctly assigned by subject and still be the only thing rendering a state under axe. Whether the topology should say that a case cannot leave the browser lane while it is a state's sole renderer is a separate decision, recorded here and not taken.

The Finding stays `Open`: the interaction transition row is unchanged, and the twenty-one remain where they are.

## Addendum — 2026-09-14, every state is enumerated, and the rule has a tripwire ([#729](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/729))

**The nine screens hold thirty-three states, and thirteen of them were rendered by nothing.** Each was established by its own isolated mutation — a violation injected inside the state's own branch, the browser lane run over only the story files that could reach it, then reverted. Twenty states failed their mutation and were therefore already rendered; thirteen left the lane green.

| Screen | States with no story |
|---|---|
| `VerifyCode` | submitting |
| `Profile` | avatar uploaded · avatar rejected |
| `Onboarding` | the position being read · the code step |
| `Recovery` | the position being read |
| `RecoveryRequest` | **every one** — refused · lapsed · sending |
| `RecoveryCode` | refused · submitting |
| `RecoveryPassword` | refused · submitting |

**`RecoveryRequest` is the finding inside the finding.** Not one of its three states was rendered, so the first screen of the recovery journey had never been evaluated by axe in any state but its resting one. That is not a regression the three moves caused; it is a gap that predates them and that nothing would have reported.

**All thirteen are restored**, each by one story that reaches the state and asserts its presence, and each proven by the mutation that proved it missing: the violation now fails the lane, and fails **on the restoring story alone** — one failure, never two.

**A second defect surfaced while restoring one of them.** The password step refuses anything without an uppercase letter, a digit and a symbol. A story submitting a weak password therefore never reached the server at all: it was asserting a *validation* message while appearing to assert a server refusal, and would have reported a state it never rendered. Found because the mutation for that state did not bite, which is what the per-state proof is for.

**The rule now has a tripwire.** Per-file branch floors over the nine screens, measured on the browser project alone and carried by the lane's own script. Proven to bite: withdrawing `ThePictureRejected` drops `Profile.tsx` from 92.53% to 91.04%, misses its floor and exits non-zero; restored, it passes.

**Its limit is known and named.** The floors are coarser than the rule they guard. Withdrawing `TheRequestSending` did **not** trip them, because another story passes through the same branch transiently on its way elsewhere — so the tripwire catches a branch nothing else reaches and can miss one that something else crosses incidentally. It is evidence that a rendering stopped, never evidence that every state is covered. **What proves a state covered is the mutation**, and this addendum's thirty-three results are that proof at this date rather than a claim the check can renew.

The Finding stays `Open`: the interaction transition row is unchanged, and the twenty-one unnamed cases remain where they are.

## Addendum — 2026-09-14, the twenty-one are checked, and the class is empty ([#731](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/731))

**Every case this Finding left unevaluated now has a verdict, and all twenty-one belong to the component lane.** Each asserts structure, text, a DOM attribute or typing — things a renderer establishes. The two `Compact` cases stay in the browser lane, because reading the viewport is what a browser is for.

**Twenty-six mutations established that, not reading.** Five broke a mapping and failed **both** lanes — `stepStates` twice, `destinationFor`, and `screenFor` twice — which is what proves the unit lane owns those mappings and these cases only **traverse** them. Twenty-one broke a rendering and failed the **component lane alone**, which is what proves each case has a subject of its own.

**A third distinct outcome, after Verify narrowed three of seven and Profile one of four: none of the twenty-one restated anything.** The distinction #725 drew is why — a case restates when its assertion *names* another lane's output, and these name headings, labels, attributes and copy constants that no unit test asserts. Where they depend on a mapping, they depend on it to reach their subject rather than asserting it.

**Six states would have been stranded, and the check named them before anything moved.** Withdrawing all twenty-one and running #729's floors named `Onboarding.tsx`, `Recovery.tsx` and `RecoveryCode.tsx` in a single run — two phases of the journey and four states of the recovery code step, each rendered by a departing case and nothing else. Six presence-only stories were added **before** the cases left, so no state was unrendered at any commit. Six of the nine screens needed nothing, because the presence-only stories of #727 and #729 already carried them.

### Recovery's floor moves from 70 to 64, and why that is a transition rather than a loss

`Recovery.tsx` is the one file the six new stories did not return to its floor. **No state is missing.** All five of its screen arms were mutated, and every one still fails — on several stories each:

| Arm | The mutation fails |
|---|---|
| pending · retry | *The Position Is Being Read* · *The Read Failed* |
| request | *The Request Refused* · *Lapsed* · *Sending* · *The Address Step After Restart* |
| code | *The Code Refused* · *Submitting* · *Resend Window Is Open* · *Resend Is Spent* · *Code Step Confirms* |
| password | *The Password Refused* · *Submitting* |

What fell is **branches the departing cases traversed on their way somewhere else** — multi-step flows through *start over*, a two-address comparison, and the `screen` predicates reached from several directions within one case. Coverage counts those; a state is not one of them. The floor is a ratchet on a proxy, so lowering it while every state is proven rendered records a **transition between lanes**, not a gap in coverage.

**This is the coarseness recorded against the check when it was built, seen from the other side.** #729 recorded that a branch another story crosses incidentally survives a withdrawal; this records that a branch only a departing case crossed falls without any state going with it. Neither is a defect in the rule — both are the distance between a branch and a state, and both are why **the mutation is the proof and the floor is only a tripwire**.

Adding cases to lift the number back would have been tests written for a metric, which is the inversion [ADR 0020](../../decisions/0020-proof-has-a-home-testing-topology.md) exists to prevent. The floor was lowered on a human ruling rather than by the branch that wanted it lowered, because a check that lowers its own bar is worth nothing.

**The interaction class is empty, and the transition row is closed.** The [topology](../../../development/testing-topology.md) records it.

The Finding stays `Open`: the seam named in *Why it matters* — the `repo?` prop on five screens, the optional gateway on every hook, and the three published ports — is untouched, and every lane in this repository still reaches those screens through it.
