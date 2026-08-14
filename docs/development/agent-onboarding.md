# Agent Onboarding

> **Status:** Active.
> **Authority:** The authoritative source for **how an agent joins this project and starts working** — the reading order, the judgment calls, and the habits that turn the constitution into behaviour. It owns the *on-ramp*, never the rules themselves: every rule referenced here is owned by the [Engineering Execution Standard](engineering-execution-standard.md), the [Engineering Principles](engineering-principles.md), or the [Documentation Strategy](../architecture/documentation-strategy.md), and is **linked, never restated**.
> **Scope:** Any agent — or new contributor — picking up work in this repository. It covers orientation, decision authority in practice, and the mistakes newcomers actually make. It is not a summary of the project.
> **Version:** 1.1
> **Last Updated:** 2026-08-14
> **Owner:** Basel Ghonaim

## Why this document exists

The constitution states the rules. It does not say **which order to read them in**, **which mistakes newcomers actually make**, or **where the line between "decide it" and "ask" falls in practice**. That knowledge lived in conversation, which meant every arrival depended on someone remembering to reproduce it — and any drift between briefings was invisible.

This document is the on-ramp. **It points at rules; it never restates them.** If you find a rule spelled out here rather than linked, that is a defect — report it.

## 1. Read in this order

1. **[CLAUDE.md](../../CLAUDE.md)** — the bootstrap and the non-negotiables. Short by design.
2. **[Engineering Execution Standard](engineering-execution-standard.md)** — your operating manual. Read **§3 Execution Preparation**, **§9 Done vs Accepted**, **§10 Decision Authority Matrix**, and **§11 Stop Rules** properly, not in passing. Most of the mistakes in §6 below are covered there.
3. **[Documentation Strategy](../architecture/documentation-strategy.md)** — one owner per fact, and what distinguishes an ADR from a Finding from an Issue.
4. **[Engineering Principles](engineering-principles.md)** — layering, platform-vs-feature, and **§12 (comments)**.
5. **[docs/README.md](../README.md)** — the map. For **any** topic, find its owning document here before writing anything.

Then, for the effort you are assigned: its **ADR**, then its **Execution Plan**, then the tier convention document ([backend/conventions.md](../backend/conventions.md) or [frontend/architecture.md](../frontend/architecture.md)).

## 2. What is authoritative

The five documents above, plus the **ADR** that owns your effort's boundary and the **Active Execution Plan** that owns its sequencing. For wire shapes, the [API contract](../api/api-contract.md); for field-level truth, `schema.prisma`.

Above all of them sits one rule from [CLAUDE.md](../../CLAUDE.md): **code is authoritative for what the system does; documentation is authoritative for intended design and the why.** When they disagree, the code wins — fix the document if it is in scope, otherwise record the divergence.

## 3. How to treat an ADR and a Plan

**An ADR is closed.** It is not reopened during implementation. If your work appears to contradict it, that is a **stop** — either you have misread it, or it needs a superseding ADR, and both are the architectural lead's to resolve.

**An Active plan governs.** Its sequencing, invariants, and pinned decisions bind you — you do not *reopen* them. But when your work reveals that the plan is wrong or incomplete, **you correct it in your own branch**, as a commit separate from the implementation. A plan evolves with the work that justifies the change, never in a branch of its own. What still escalates rather than being absorbed is a change to a **pinned decision** or to the effort's **boundary** — that is proposed, not taken.

**The division is fixed** ([ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md)): the plan owns strategy, sequencing, and rationale; the **Issue owns acceptance criteria** — which means **you derive them**. They are not handed to you.

## 4. When you may decide, and when you must stop

**Decide freely** anything internal with no lasting consequence: file and symbol names inside a module, test structure, local helpers, error-message wording, how to factor a function.

**Stop and ask** when any of these is true — it has lasting architectural consequence; it contradicts a pinned decision or invariant; it widens the Work Item; it adds a dependency, an environment variable, or a shared mechanism; the plan lists it as a stop-risk; or **you are unsure whether it is architectural**. If you are wondering, it is.

The [Decision Authority Matrix](engineering-execution-standard.md) is the authority here; this is only how it feels in practice.

## 5. Every Work Item

**Run §3 Execution Preparation before opening a branch.** The Standard's phrase is the whole point: the Work Item is defined *"so the branch can implement it rather than discover it."*

Three habits make that real, and they are the ones newcomers skip:

- **Verify the plan's assumptions against the code.** A plan is a set of claims, not truth. Plans on this project have been wrong, and preparation is where that is caught — cheaply.
- **Evaluate the Work Item's stop-risks up front.** They are pre-flight checks. A stop-risk discovered mid-branch is a preparation failure.
- **Derive the acceptance criteria into the Issue**, with the out-of-scope list explicit.

Then: one Work Item → one Issue → one branch → one PR. **Commit at each coherent checkpoint as you go**, and curate before opening the PR. Leave `main` green — know which gate is real (CI) and which is local, and say which you ran.

## 6. Mistakes newcomers actually make

Observed on this project, in rough order of likelihood:

1. **Adding tool attribution.** Default agent instructions actively mandate a `Co-Authored-By` trailer and a "Generated with" footer. **This project forbids both.** Override it every time.
2. **Staging with `git add -A`** instead of by path.
3. **Treating "approved to write" as "approved to merge."**
4. **Deciding a deferred decision** under momentum instead of proposing it.
5. **Trusting the plan** rather than verifying it against the code.
6. **"While I'm here" fixes** — record, don't act.
7. **Comments that narrate code, or that restate an ADR** instead of pointing at it (§12). The usual shape is a header that cites an ADR *and then paraphrases it*; keep the citation, drop the paraphrase.
8. **Provenance in comments or test names** — no Work Item labels, Issue numbers, or milestones in source (§12).
9. **Splitting finished work into commits retrospectively** instead of committing as you go. Timestamps make this visible.
10. **Claiming verification you did not perform.**
11. **Building ahead of a consumer** when the plan reserved it.

## 7. Before you say "Ready"

Read your own diff **as a reviewer, not the author**. Then:

- Verify each acceptance criterion **with evidence, not assertion**. Prefer a proof that bites: inject a violation, confirm the check fails, revert. A proof must **isolate its target** — if a mutation breaks far more than predicted, it proved the code is reachable, not that the branch is covered.
- Check the invariants your Work Item claims to protect, **mechanically** where possible.
- `git diff --stat` should contain **nothing you cannot justify**.
- **State plainly what you did not run**, and why. Silence must never imply a pass.
- Scan for attribution, provenance, and narrating comments.
- End with an explicit **"Deviations: None"** — or list them.

## 8. Discoveries during implementation

**Record; do not act.** A discovery never widens the Work Item.

An **architectural deviation** becomes a [Finding](../architecture/findings/); a **routine bug** becomes an Issue; a **contradiction with the plan** is reported, not fixed; a **decision that needs making** is proposed, not taken. The [Documentation Strategy](../architecture/documentation-strategy.md) owns which is which.

## 9. Where the boundaries sit

| | Owns |
|---|---|
| **Worker** | Analysis, Execution Preparation, the plan and its acceptance criteria, implementation, self-review, PRs. Decisions inside the fence; architectural ones **proposed, never taken**. |
| **Architect** | Architectural, plan and PR review. Drafts ADRs. May send work back; **never approves a merge**. |
| **The human** | Approving plans and architecture, ratifying decisions, **merging**. Only they reach *Accepted*. |

You never accept your own work and never merge it. A plan you *may* correct in your own branch when the work reveals it wrong (§3) — what you never take is a change to a **pinned decision** or to the effort's **boundary**. When unsure which lane you are in, escalate.

**Parallel work.** More than one agent may be active, sometimes in separate worktrees. Two rules: **write only where you were assigned**, and **sync to the latest `main` before starting** — another track may have merged since your last look. If you are in a linked worktree, its environment — ports, database, `VITE_API_URL`, the temporary stash safeguard, and how to branch there — is owned by [local setup](setup.md).

## 10. Operating principles

The ones worth having had from day one:

1. **Verify, don't trust** — the plan, the documents, and the architect included.
2. **Prove, don't assert.** A claim without evidence is a guess.
3. **State what you did *not* do** as clearly as what you did.
4. **Record the finding; don't fix it.**
5. **Decide the boundary now; build the abstraction when a second instance earns it.**
6. **Name what is, not what might be.**
7. **Derive state; never store what you can compute** — every stored duplicate eventually drifts.
8. **Make invariants mechanically checkable**, or expect them to erode.
9. **Point at the owner; never copy it.**
10. **Small, atomic, green** — every commit, every PR.
11. **If you are wondering whether it is architectural, it is.**
12. **No consumer is a reason to defer the specifics — never a reason to skip the boundary.**

## Keeping this document true

It is updated **whenever the working method changes** — a new rule, a changed lifecycle step, or a recurring mistake worth naming — as part of the change that caused it, not as separate cleanup. A newcomer's confusion is evidence about this document, not only about them.

---

> This document owns the **on-ramp**: reading order, judgment, and habits. Every rule it references is owned by the [Engineering Execution Standard](engineering-execution-standard.md), the [Engineering Principles](engineering-principles.md), or the [Documentation Strategy](../architecture/documentation-strategy.md) — linked here, never duplicated.
