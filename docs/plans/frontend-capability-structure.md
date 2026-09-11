# Frontend Capability Structure — Execution Plan

> **Status:** Active
> **Type:** Refactoring
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-11
> **Parent Issue:** —
> **Supersedes:** [Frontend Zone Migration](frontend-zone-migration.md)

**Active.** Drafted outside the tracked tree and adopted here in the first branch of its first Work Item, per [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 2. It governs the effort's strategy and sequencing; it governs no Work Item's contents.

---

## 1 · Purpose & goals

Bring every frontend capability to **one internal structure**, clean the boundaries between the capabilities the onboarding journey composes, and finish placing them in the four zones [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) decides.

The structure is owned by the [frontend architecture](../frontend/architecture.md), not by this plan. This plan sequences the work that brings the code to it.

**Delivers:**

- every capability — feature or platform — organised the same way, whatever it holds: one with no interface or no store differs from one that has them only by the layers it omits;
- journey reduced to what it is: the server-held fact of a reader's onboarding progress and the moves on it, with no interface;
- screens that present and nothing else, receiving everything they render from hooks;
- each piece of logic with the capability that owns it, and the wiring between capabilities with the page that composes them;
- the rules that hold all of this, checked rather than reviewed.

**Does not deliver:** any change a reader can observe. A behaviour change — including one that corrects a recorded defect — is its own Work Item, never part of a restructure.

**Owns the structure only.** It waits on no backend and proposes none.

---

## 2 · How this plan is meant to be used

**The plan owns** the objective, the phases and their objectives, the ordering invariants, and the questions each phase waits on.

**It does not own Work Items.** Their number, their boundaries and their contents are derived when a phase is reached — against the code as it then is, and against what the previous Work Item found ([EES §3](../development/engineering-execution-standard.md)). A phase may take one Work Item or several; nothing here fixes which.

**A Work Item that finds this plan wrong corrects it in its own branch**, as a commit separate from the implementation. What may not change without escalation is a phase's place in the order, because the invariants in §4 are what keep each step safe.

---

## 3 · The rules that govern every Work Item

- **Every Work Item is a move or a decision, and the class sets its evidence.** A move changes nothing observable, so its proof is that the existing evidence is unchanged — a shifted count means something was not a move. A decision adds the evidence it requires and names every delta.
- **One capability per Work Item.** A consumer is touched only where the capability's change forces it: an import line, or an argument that no longer exists.
- **No commit both moves a thing and changes it.** A relative import that a move would break is converted to an alias first, in its own commit, so the move itself stays byte-identical.
- **A behaviour change is its own Work Item.**
- **No Work Item proceeds against a question it depends on** (§5). It waits for the ruling.
- **A capability brought to the structure gains its boundary test in the same Work Item**, each fence shown to bite by mutation.
- **Every Work Item leaves `main` green and states what it did not run.** The rendered-story lane is outside CI and is the behavioural contract for screens; it is run on every Work Item that touches a screen, a story, or anything a story imports.
- **Discoveries are recorded and routed, never absorbed** (EES §11).

---

## 4 · Strategy & sequencing

**Five ordering invariants. These are the fixed part of the plan.**

1. **The target precedes the work.** The structure is recorded before any capability is brought to it, so no Work Item decides it for the rest.
2. **Capabilities before composition.** Every capability a page composes is clean before the page is, so what remains in the page is what it composes and nothing it should have handed away.
3. **A question is answered before the work that depends on it.** Capabilities that wait on nothing proceed while rulings are pending; only what depends on a ruling waits.
4. **The composition root is touched once**, at the cutover.
5. **Enforcement lands when it needs no exemption list.** Each capability's own fence arrives with it; checks across every capability arrive once all of them conform.

### Phase 0 — The target

**Objective:** record the capability structure, and adopt this plan in the same branch.

### Phase 1 — Journey

**Objective:** journey becomes a capability with no interface, organised as the structure says, in the features zone.

**Why first:** it is the smallest boundary, it depends on none of the questions in §5, and it is the variant — no interface, no store — most likely to be organised arbitrarily, so it is the best test of whether the structure holds. It also settles the surface that profile's dependency on it is resolved against.

What journey holds today is judged file by file, never assumed to belong: presentation derived from its state belongs to whatever renders it, and a rule of journey's own that its consumer currently supplies belongs to journey.

### Phase 2 — Capabilities converge

**Objective:** every other capability — profile, authentication, recovery, the session, channel verification — organised as the structure says, and depending on no capability it should not.

It covers profile ceasing to speak journey's vocabulary and to borrow authentication's wording, and the rules profile mirrors from the server joining the platform's other cross-tier definitions ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 6). Whether channel verification's request and confirmation become one lifecycle is question B, and waits for it.

### Phase 3 — Presentation finds its homes

**Objective:** place the pieces of interface no capability yet owns — the verification screens and the journey's progress display — and settle how a screen receives a test double without naming a repository.

**Why here:** each waits on a question in §5, and each must be answered before the page that renders it is built.

### Phase 4 — Composition

**Objective:** the auth page group exists and composes capabilities rather than hosting their logic — the journey's affordances rendered by the page, the route targets supplied by it, and no state of its own.

**Why here:** it is defined by what the capabilities leave behind ([ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 4). Specified earlier, it would have to decide what a page is before knowing what is left over.

### Phase 5 — Cutover and enforcement

**Objective:** the composition root imports the new zones directly; the legacy zone and its alias are removed; the zone direction, the two rules a page must not break, and the capability structure become checks.

### Phase 6 — Documentation

**Objective:** the frontend architecture's outer rules are restated to four zones, and the feature documentation follows the capabilities that now exist.

**Why last:** ADR 0018 restates the outer architecture *as the structure lands*; written earlier it would describe zones the code does not have. The capability structure is not held back with it — it is a rule for whoever adopts it, and is recorded in Phase 0 ([ADR 0012](../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) Decision 5).

---

## 5 · Questions the phases wait on

None is answered here. Each is the human's, and each gates only the work that depends on it.

| | Question | Gates |
|---|---|---|
| **A** | Where does the interface of a platform capability live when a product surface needs it? The verification screens are channel verification's interaction, yet the platform publishes no product interface ([ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) Decision 6), a feature is defined by a fact it owns (ADR 0018 Decision 3), and a page cannot share a screen with another page. [Finding 0023](../architecture/findings/0023-verification-ui-is-placed-by-composition.md) | the verification screens, Phase 3 |
| **B** | Does channel verification own its request-then-confirm sequence as one lifecycle? Split in two, the resend window crosses the page's state to get from one screen to the next | channel verification, Phase 2 — and the page, which cannot shed that state until it is answered |
| **C** | When profile stops borrowing authentication's error wording, does it keep the same words — preserving behaviour, and a message known to be wrong — or correct them? | profile's boundaries, Phase 2 |
| **D** | How does a screen receive a test double without its public signature naming a repository? | the screens that carry one today, Phase 3 |
| **E** | Where does the journey's progress display live? [Finding 0025](../architecture/findings/0025-journey-stepper-holds-the-committed-steppers-name.md) | the progress display, Phase 3 |

---

## 6 · The first Work Item — [#695](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/695)

It adopts this plan, supersedes the [frontend zone migration](frontend-zone-migration.md), records the capability structure in the [frontend architecture](../frontend/architecture.md), and registers the capabilities that predate the structure as a Finding. It touches no code.

No branch is created to adopt a plan, which is why the adoption rides with the structure the plan builds toward.

---

## 7 · Key dependencies

**Internal:** the phases in order, each on the one before it for the reasons in §4. Within a phase, only what a question in §5 gates waits.

**External: none.** No backend work, no API change, no third-party adoption.

**One soft dependency worth naming:** the effort should not run concurrently with feature work in the same zones. Every Work Item rewrites import paths, and a parallel branch would meet them as conflicts across its whole diff.

---

## 8 · Risks & mitigations

| Risk | Mitigation |
|---|---|
| The structure does not fit a variant not yet built | Journey — the variant least like the rest — goes first, and the structure is corrected in its branch if it bends |
| A ruling stalls the effort | Only what depends on it waits (invariant 3) |
| The onboarding screen is touched by several Work Items before the page is | Each touch is limited to what a capability's change forces; the page is restructured once, in Phase 4 |
| The rendered-story lane is outside CI, and story paths are what a move breaks | It is run and stated on every Work Item that could break one |
| No gate exercises the running application | Spot-checked when the page is restructured and at the cutover, and reported as a spot-check rather than a gate |
| A Work Item quietly becomes a decision while classed as a move | The evidence rule in §3: a move whose proof changed was not a move |
| Profile's home is temporary, because the Users capability is not decided | Bringing it to the structure first makes any later move a directory move |

---

## 9 · Out of scope

Named so no Work Item has to decide whether they belong:

- The outstanding lint errors and every other recorded defect — known, deliberately untouched.
- Any change a reader can observe, including correcting a wording known to be wrong.
- The Users capability, and where profile behaviour finally lives.
- A domain layer, a widget layer, and a translation layer.
- The platform mechanisms — the design system, the form engine, the error pipeline, the transport, the query cache — and the thin utilities, which keep their own documented structures.
- Any backend change, including an endpoint that would let the client read a verification's resend window.
- Generalising what repeats across capabilities — the position-reading hook journey and recovery each hold, the request-state flow four capabilities repeat — unless approved as its own Work Item.

---

## 10 · Reconciliation

*Added as the effort approaches `Historical`: where the durable knowledge landed, which Findings were recorded, and the forward links.*
