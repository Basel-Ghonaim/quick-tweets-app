# Frontend Zone Migration — Execution Plan

> **Status:** Active
> **Type:** Migration
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-09
> **Parent Issue:** [#678](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/678)
> **Supersedes:** —

**Active.** Drafted outside the tracked tree and adopted here in the first branch of its first Work Item, per [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 2. It governs the effort's strategy and sequencing; it governs no Work Item's contents.

**Preliminary by intention.** This plan is deliberately coarse. A structural migration discovers things — a dependency nobody predicted, a placement the decisions do not cover, a proof that turns out to be missing — and a plan that specified every Work Item in advance would be wrong by the second phase and followed anyway. What is fixed here is the **objective, the phase order, and the dependencies between phases**. What is not fixed is the content of any Work Item.

---

## 1 · Purpose & goals

Adopt the four zones [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) decides — `app → pages → features → shared` — in the web application, and leave the rules that hold them mechanically enforced.

**Delivers:** the zones exist and hold what the ADR says each holds; capabilities are separated from composition; the zone direction and the two rules a page must not break are checkable rather than reviewed.

**Does not deliver:** any change to behaviour. No new capability, no new endpoint, no fix to a recorded defect, no `shared/` refactor, no answer to the Users question. **A reader must not be able to tell this happened.**

**Owns the structure only.** It waits on no backend and proposes none.

---

## 2 · How this plan is meant to be used

This section is the plan's most important one, and it binds harder than any phase below.

**The plan owns** the objective, the phase order, the ordering invariants, and the dependencies between phases.

**The plan does not own a Work Item's contents.** Each Work Item's scope, its steps, and its acceptance criteria are derived **when it is reached** — against the code as it then is, and against what the previous Work Item actually found. Execution Preparation (EES §3) is where that happens, and it happens per Work Item, never in advance.

**A phase that invalidates a later Work Item updates this plan before proceeding.** Executing a plan already known to be wrong is the failure this section exists to prevent. A plan change rides in the branch that discovered the need, as a commit separate from the implementation — never in a branch of its own.

**The expected Work Items in §5 are expectations, not a contract.** Their number, their boundaries and their order may all change. What may not change without escalation is a phase's *place* in the order, because the ordering invariants in §4 are what keep each step safe.

---

## 3 · The rules that govern every Work Item

- **A move is a move.** History survives the migration: nothing is deleted and re-added. This carries [ADR 0013](../architecture/decisions/0013-applications-and-cross-tier-packages.md)'s migration invariant forward to a second restructure.
- **No commit both moves a thing and changes it.** Where something must change to be placed correctly, that is a separate commit or a separate Work Item.
- **Every Work Item is either a *move* or a *decision*, and the class sets its evidence.** A **move** changes nothing observable, so its proof is that the existing evidence is **unchanged** — a shifted count means something was not a move. A **decision** adds exactly the evidence it requires and names it. Adding a test is never scope creep when the test proves a boundary, a behaviour, or the safety of the migration; withholding one to keep a Work Item tidy is (Definition of Done, EES §9).
- **Every Work Item leaves `main` green, and states what it did not run.** Silence never implies a pass.
- **Discoveries are recorded and routed, never absorbed** (EES §11). A latent defect becomes a Finding; separable work becomes a proposed Work Item; neither widens the branch that found it.
- **Any architectural question ADR 0018 does not answer is a stop.** It is raised, not assumed.

---

## 4 · Strategy & sequencing

Four ordering invariants. These are the part of the plan that is genuinely fixed.

1. **Prerequisites before extraction.** Anything several capabilities consume, which would otherwise come to rest in a zone those capabilities may not import, moves **first**. Extracting before that manufactures precisely the violations the migration exists to remove.
2. **Capabilities before composition.** Once the capabilities have left, what remains *is* the composition — it identifies itself rather than being guessed at. Doing it the other way requires deciding what a page is before knowing what is left over.
3. **The composition root is touched once, at the end.** The retiring zone keeps a temporary re-export surface so that no intermediate Work Item has to edit the application's wiring. One cutover, not one per Work Item.
4. **Enforcement lands before the next feature does.** An unenforced boundary is what produced ADR 0018's context. The fences are not the last thing.

---

## 5 · Phases and expected Work Items

**Expected, not fixed.** Each phase states its intent and why it sits where it does; the Work Items under it are the current expectation and are defined properly when reached.

### Phase 0 — Prerequisites, and adoption of this plan

**Intent:** move the shared pieces whose placement is already decided but whose current location would become illegal once the zones separate, and establish the zone aliases the later phases need.

**Four Work Items, measured against the code rather than estimated.** Each of these is consumed by capabilities that could not reach its current home once the zones separate, so each blocks Phase 1: the message region, the navigation helpers, the copy catalogue, and the validation rules. The first also adopts this plan and records the three Findings (§6).

**Why here:** invariant 1. Nothing else can start safely until the things capabilities consume live somewhere capabilities may reach.

### Phase 1 — Capabilities

**Intent:** each capability inside the current auth module becomes a feature in its own right — the session, account recovery, the onboarding journey, and profile (the last temporary, pending the Users decision).

Expected: roughly one Work Item per capability. Largest phase, and the most mechanical.

**Why here:** invariant 2, and because these are moves rather than decisions, so they are the cheapest work in the effort to verify.

### Phase 2 — Composition

**Intent:** what remains — the routes, the layouts, the chrome, and the flows that span capabilities — becomes the page group.

Expected: one or two Work Items.

**Why here:** it is defined by Phase 1's residue, so it cannot responsibly be specified before Phase 1 runs. **This phase is the most likely in the effort to surface a placement the ADR does not settle**, and the most likely to change the shape of what follows it.

### Phase 3 — Cutover and enforcement

**Intent:** the composition root imports the new zones directly; the retiring zone and its temporary surface are removed; the zone direction and the two rules a page must not break become checks.

Expected: two Work Items — the cutover, then the fences.

**Why here:** invariants 3 and 4. The cutover cannot precede the moves, and the fences should not wait behind documentation.

### Phase 4 — Documentation

**Intent:** the frontend architecture document is restated to the four zones in operative form, and the feature documentation follows the structure that now exists.

Expected: one Work Item.

**Why last:** ADR 0018 says its rules are restated *as the structure lands*. Written earlier, the document would describe a structure the code does not have.

---

## 6 · The first Work Item — [#679](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/679)

It carries three things beyond its own scope, which is why it is called out here rather than left to §5.

1. **It adopts this plan.** The plan enters `docs/plans/` in this branch, as its first commit, and is reviewed against the code as it actually stands. Anything this plan gets wrong is corrected there, before it governs anything. **No branch is created to adopt a plan** — this is why the adoption rides with real work.
2. **It records the three Findings** identified during the architectural reassessment. They are recorded, not scheduled, and not split into Work Items of their own:
   - **The verification UI's placement.** It stays where the composition puts it by decision, and is known to want revisiting. Recorded *without* being made conditional on a second consumer appearing.
   - **The message region's prop vocabulary.** It enters the Design System as an interim component without yet speaking the layer's own prop conventions.
   - **The journey's stepper against the committed generic one.** The product commits to a generic stepper; what exists is specific to the registration journey and shares its name. The committed component remains unbuilt, and the naming collision is the thing worth recording.
3. **It does the first prerequisite work** from Phase 0, so that it is a Work Item rather than a plan-adoption branch wearing one's clothes.

---

## 7 · Key dependencies

**Internal, and strictly ordered:** prerequisites → capabilities → composition → cutover → enforcement → documentation. Each depends on the one before it for the reasons in §4; none may overtake its predecessor.

**External: none.** No backend work, no API change, no third-party adoption. Nothing in this effort waits on anything outside the web application.

**One soft dependency worth naming:** the effort should not run concurrently with feature work in the same zone. Every Work Item here rewrites import paths, and a parallel branch would meet them as conflicts across its whole diff.

---

## 8 · Risks & mitigations

| Risk | Mitigation |
|---|---|
| The rendered-story lane is outside CI, and story paths are exactly what a move breaks | It is run per Work Item and its result stated, not inferred from a green CI |
| No gate exercises the running application, so a broken dev server survives every check | Spot-checked at the cutover, and reported as a spot-check rather than as a gate |
| The composition layer accumulates logic — the failure the new zone most invites | Phase 3's fences, and the rule that a page owns no fact; until they land it is a review obligation, which is weaker and should not be relied on for long |
| `shared/` becomes the dumping ground for anything awkward | ADR 0018 Decision 5 enumerates what it admits; anything outside that list is a stop, not a judgement call |
| A Work Item quietly becomes a decision while classed as a move | The evidence rule in §3 catches it — a move whose proof changed was not a move |
| This plan goes stale mid-effort and is followed anyway | §2, and the obligation to update it in the branch that discovered the need |
| A recorded defect is fixed opportunistically because the file is open | §9, and the standing rule that a discovery is recorded rather than acted on |

---

## 9 · Out of scope

Named so no Work Item has to decide whether they belong:

- The base query's token read, the outstanding lint errors, and every other recorded defect — **known, deliberately untouched**.
- The `shared/` refactor, acknowledged as future work on its own terms.
- The Users capability, and where profile behaviour finally lives.
- A domain layer, and any composition layer beyond the page group — both deferred by ADR 0018 with conditions stated.
- The cross-feature contract mechanism, which ADR 0018 narrows rather than closes.
- Adopting a translation layer. The copy decision prepares for it; this effort does not perform it.
- Any new behaviour, capability, endpoint or component.

---

## 10 · Reconciliation

*Added as the effort approaches `Historical`: where the durable knowledge landed, which Findings were recorded, and the forward links.*
