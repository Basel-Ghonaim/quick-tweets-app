# Frontend Zone Migration — Execution Plan

> **Status:** Historical
> **Type:** Migration
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-11
> **Parent Issue:** [#678](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/678)
> **Supersedes:** —
> **Archived:** 2026-09-11 — superseded by [Frontend Capability Structure](frontend-capability-structure.md) during Phase 1. Its durable facts now live in [ADR 0018](../../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md), [ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md), the [frontend architecture](../../frontend/architecture.md) and Findings 0023–0029; this plan is retained as provenance.

**Historical — superseded.** Drafted outside the tracked tree and adopted in the first branch of its first Work Item, per [ADR 0006](../../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 2. It governed the effort's strategy and sequencing until the plan that superseded it took over; §10 records what it delivered and what it handed on.

**Preliminary by intention.** This plan is deliberately coarse. A structural migration discovers things — a dependency nobody predicted, a placement the decisions do not cover, a proof that turns out to be missing — and a plan that specified every Work Item in advance would be wrong by the second phase and followed anyway. What is fixed here is the **objective, the phase order, and the dependencies between phases**. What is not fixed is the content of any Work Item.

---

## 1 · Purpose & goals

Adopt the four zones [ADR 0018](../../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) decides — `app → pages → features → shared` — in the web application, and leave the rules that hold them mechanically enforced.

**Delivers:** the zones exist and hold what the ADR says each holds; capabilities are separated from composition; the zone direction and the two rules a page must not break are checkable rather than reviewed.

**Does not deliver:** any change to behaviour. No new capability, no new endpoint, no fix to a recorded defect, no `shared/` refactor beyond the one exception below, no answer to the Users question. **A reader must not be able to tell this happened.**

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

- **A move is a move.** History survives the migration: nothing is deleted and re-added. This carries [ADR 0013](../../architecture/decisions/0013-applications-and-cross-tier-packages.md)'s migration invariant forward to a second restructure.
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

**Intent:** each capability inside the current auth module becomes a feature in its own right — account recovery, the onboarding journey, and profile (the last temporary, pending the Users decision). The session is not among them: [ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) made it platform and authentication a feature, and a Work Item outside this plan placed both at `shared/session` and `features/authentication` before this phase's extractions. Recovery's dependency on the session is therefore a legal import, not an edge this phase must resolve.

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

- The outstanding lint errors and every other recorded defect — **known, deliberately untouched**. (The base query's token read was one of them; it closed as a consequence of ADR 0019, outside this plan.)
- The `shared/` refactor, acknowledged as future work on its own terms — with one scoped exception already taken: the session, decided by ADR 0019 and placed by a Work Item outside this plan.
- The Users capability, and where profile behaviour finally lives.
- A domain layer, and any composition layer beyond the page group — both deferred by ADR 0018 with conditions stated.
- The cross-feature contract mechanism, which ADR 0018 narrows rather than closes.
- Adopting a translation layer. The copy decision prepares for it; this effort does not perform it.
- Any new behaviour, capability, endpoint or component.

---

## 10 · Reconciliation

*Final. Written as the plan moved to `Historical` — superseded, not completed.*

### Why it was superseded

Its objective was to move the capabilities inside the auth module into the four zones. The analysis that preceded journey's extraction found that moving was not enough: the capabilities did not share one internal structure, and journey held presentation and routing that belonged to what renders it. The direction became bringing every capability to one structure, with journey's boundary redefined first. [Frontend Capability Structure](frontend-capability-structure.md) owns that effort, and re-derives the remaining work rather than inheriting this plan's expected Work Items.

### What landed

| Work Item | Delivered | Findings |
|---|---|---|
| [#679](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/679) · [#680](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/680) | the message region joins the Design System; this plan adopted | 0023 · 0024 · 0025 |
| [#681](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/681) · [#682](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/682) | the navigation helpers become `shared/routing` | — |
| [#683](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/683) · [#684](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/684) | the validation rules join `shared/validation`, their messages `shared/copy` | 0026 · 0027 |
| [#685](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/685) · [#686](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/686) | the auth copy joins the catalogue | — |
| [#687](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/687) · [#688](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/688) | the session leaves the module as a feature of its own — a placement ADR 0019 then reversed | — |
| [#691](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/691) · [#692](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/692) — *outside this plan* | the session at `shared/session`, authentication at `features/authentication` | 0028 · 0029 |
| [#693](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/693) · [#694](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/694) | account recovery moves to `features/recovery` | — |

Phase 0 is complete. Phase 1 delivered recovery, and the session outside it; journey and profile had not moved.

### Where the durable facts landed

| Fact | Now owned by |
|---|---|
| The four zones, what each owns, and the one-way rule between them | [ADR 0018](../../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) |
| Authentication is a feature, the session is platform, and when a capability is platform | [ADR 0019](../../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) |
| The platform index, including the session | the [frontend architecture](../../frontend/architecture.md) |
| The deviations the work surfaced | [Findings 0023–0029](../../architecture/findings/) |

### Handed on, not done

Journey and profile remain in the legacy zone; no page group exists; the composition root reaches the auth routes through the legacy zone's barrel; nothing checks the zone direction; the frontend architecture's outer rules are not restated to four zones. The superseding plan carries each of them.

Its working rules — a move is a move, and a Work Item's class sets its evidence — are carried forward by the superseding plan's §3. Parent [#678](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/678) tracked this plan, and continues as the parent of the plan that superseded it: the effort is the same one, carried on.
