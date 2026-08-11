# Engineering Execution Standard

> **Status:** Active standard.
> **Authority:** The authoritative source for **how work is executed** in this repository — work items, the Git lifecycle, commits, scope control, review, and the authority to make decisions. Binding on all contributors, human and AI.
> **Scope:** Owns *process and execution*. It does **not** own *code design* ([Engineering Principles](engineering-principles.md)) or *documentation governance* ([Documentation Strategy](../architecture/documentation-strategy.md)).
> **Version:** 1.2
> **Last Updated:** 2026-08-11
> **Owner:** Basel Ghonaim

## How to read this document

- This standard governs *how* work is carried out — not *what good code looks like* (that is [Engineering Principles](engineering-principles.md)) and not *how documentation is structured* (that is the [Documentation Strategy](../architecture/documentation-strategy.md)). Where those overlap, this document references them and never restates them.
- It is written as checkable rules, so a reviewer — human or AI — can apply them directly.
- [CLAUDE.md](../../CLAUDE.md) summarizes the non-negotiables and points here; this document is the authoritative source for the detail.

## 1. Applicability — right-size the process

Not every task earns the full lifecycle. Match the process weight to the work; applying a heavyweight workflow to a trivial change is its own kind of waste.

Every task falls into a class, and each class has a default process weight:

| Task class | Examples | Default process weight |
|---|---|---|
| **Conversation** | answering a question, giving an opinion | None — no branch, no commit |
| **Analysis** | reviewing code, comparing options, an architectural critique | None — produced in-conversation; if it must persist, it becomes a finding or a planning artifact |
| **Planning** | analyzing options, designing an approach, a throwaway blueprint | Lightweight — the planning *activity* has no branch or PR; an authoritative plan that must persist (a strategy, a migration plan) is authored as **Documentation** |
| **Documentation** | authoring or correcting an authoritative document | Full lifecycle, scaled to size |
| **Implementation** | a feature, a fix, a new module | Full lifecycle |
| **Refactoring** | restructuring without behavior change | Full lifecycle |
| **Maintenance** | dependency upgrades, configuration, tooling, housekeeping | Classified as trivial or substantial by the criterion below |

The execution-bearing classes — **Documentation, Implementation, Refactoring, and Maintenance** — produce **Work Items** (§2). *Conversation, Analysis, and Planning do not*: they have no branch or PR. When planning must yield an authoritative document (a strategy, a migration plan), that document is authored as a **Documentation** Work Item (§12) — the planning activity precedes the Work Item; it is not one.

**Trivial vs substantial.** A Work Item is **trivial** when *all* of these hold: it involves no design decision, introduces no new behavior or contract, touches a small bounded surface, and is obviously correct at a glance (e.g., a `.gitignore` tweak, a typo, a broken link, a small cleanup, most dependency bumps). If any fails, it is **substantial**; when in doubt, treat it as substantial. This split sets the **depth** of Execution Preparation (§3) and whether the Work Item needs an Issue (§2). It governs **every** Work Item class — the weights in the table above are each class's typical default.

**When unsure, ask one question:** does this change the repository's tracked content? If no, it is conversation or analysis. If yes, it is a Work Item and follows the lifecycle — scaled, never skipped.

## 2. Work Item

**The execution model.** Work is executed under a *Work Item-centric* model, which depends on the abstraction (a defined unit of work), not on a GitHub artifact (Dependency Inversion):

- A **Work Item** is the unit of execution — one self-contained, independently reviewable change with a defined contract (scope + acceptance criteria). The invariant is **one Work Item → one branch → one PR → human review → merge**.
- **Representation scales with weight.** A **substantial** Work Item is represented by a **GitHub Issue** (the default — it carries the contract and gives traceability). A **trivial** Work Item is lightweight: **no Issue**; its contract lives in the PR. The PR is the constant; the Issue is conditional.
- **Tracking artifacts** — a **Parent Issue**, a **Phase**, and a **Feature** group Work Items. They are planning/tracking artifacts, not execution units, and they **never own branches or PRs**. Only leaf Work Items do.
- **Tooling independence.** The model depends on the Work Item abstraction, not on GitHub. GitHub CLI integration, when added, only automates the Issue representation for substantial work; the model is unchanged.

**Architectural assumptions** (current-state, intentional, documented — not solved):

- **Trunk-based development on a single `main`, with no production/release process.** The model branches from and merges to `main` and has no hotfix, emergency, or release class; those are deferred until a release process exists.
- **Solo developer + AI.** The human gate ("the AI never merges its own work") assumes one human reviewer plus the AI; it generalizes to "author ≠ merger" if the project becomes a multi-contributor team.

A Work Item is sized so its result can be reviewed and merged on its own — for a document, usually one document (or a tightly-coupled pair); for code, one coherent change. A document may be built through several commits, but it remains **one** Work Item, and a constitutional document lands **complete** — never as a partially-merged half.

## 3. Execution Preparation

Execution Preparation turns an agreed task into a well-formed Work Item **before** any branch exists. The Work Item is the execution contract: it defines the work so the branch can *implement* it rather than *discover* it. The stage is **universal but right-sized** — its depth follows the task class (§1).

**Substantial work — full preparation:**

1. **Agree** the task.
2. **Analyze and design** the approach. (If this needs a standalone planning artifact — a strategy, migration plan, or blueprint — see §12, *Planning vs Execution*.)
3. **Decompose** the work into logical Work Items.
4. **Decide the structure** — a single Work Item, or a parent (tracking) Issue with child Work Items when the work is genuinely multi-unit.
5. **Write the contract** — scope and acceptance criteria in the **Issue** (see §8 for the format). The scope binds the branch (§7).

**Trivial work — minimal preparation:** confirm the task and that it is trivial (§1); no Issue, no decomposition; the contract is captured in the PR.

**The boundary with the Git lifecycle is the Work Item being *defined*.** Preparation ends the moment the Work Item's contract is known. Its *representation* is created at the weight-appropriate time — the **Issue during Preparation** (substantial), the **PR during the lifecycle** (trivial). From that point all work belongs to the Git lifecycle (§4); the branch exists only to implement an already-defined Work Item.

This stage owns *forming the work into Work Items*. It does **not** decide *whether* a task needs the lifecycle (that is §1) or *when* a standalone planning artifact is warranted (that is §12); it references both.

## 4. Git lifecycle

The Git lifecycle begins once the Work Item is defined (§3) and runs to merge; the branch implements that already-defined Work Item.

```text
Work Item
    │
    ▼
Branch
    │
    ▼
Implementation
    │
    ▼
Self Review
    │
    ▼
Push
    │
    ▼
Pull Request (PR)
    │
    ▼
Human Review
    │
    ▼
Merge
```

In detail:

1. **Branch** — cut from the latest `main`, named for the Work Item (see §5).
2. **Author / implement** — the work itself, in atomic commits (see §6).
3. **Self-review** — against the Definition of Done (see §9).
4. **Push** — the branch goes to the remote.
5. **Pull Request** — opened when the work is complete and self-reviewed; for a substantial Work Item it links the Issue so merging closes it, and for a trivial one it carries the contract itself.
6. **Human review** — the human reviews the PR. This is the gate: "done" means *ready for review*, not merged. If the review requests changes, the author revises on the same branch — new atomic commits (§6), re-push — and the PR returns for review; this repeats until the review approves.
7. **Merge → close → delete** — on approval the PR is merged, the Issue (if any) closes, and the branch is deleted.

**Human-gated reality:** the AI authors, self-reviews, and prepares the PR, but **merging, closing issues, and deleting branches are human-authorized** (see the Decision Authority Matrix, §10) — only a human may decide them, even if an automation later performs the action. The AI never authorizes its own merge.

## 5. Branch strategy

One branch per Work Item, cut from the latest `main`, short-lived, existing only to implement that Work Item.

- **A branch exists solely to implement its assigned Work Item.** It maps to exactly one Work Item and, on completion, one PR; never reuse a branch for unrelated work. Scope control (§7) enforces this in practice.
- **Tracking artifacts never own branches.** A Parent Issue, Phase, or Feature (§2) is not an execution unit; only leaf Work Items get a branch.
- **Cut from the latest `main`.** `main` is the project's single integration branch (per the assumptions in §2). Update it, then branch — never build on an unmerged branch; if a Work Item depends on unmerged work, wait for it to merge (or rebase once it does).
- **Naming:** use `<type>/<issue-number>-<short-kebab-description>` when the Work Item has an Issue with a number; otherwise — a trivial Work Item, or a substantial one whose Issue number is not yet available — use the descriptive `<type>/<short-kebab-description>` and reconcile the number if an Issue is later created. `type` matches the commit type (`feat`, `fix`, `docs`, `refactor`, `chore`).
- **Short-lived.** The branch lives only until its Work Item merges; then it is deleted (§4).

## 6. Commit strategy

A commit is the smallest reviewable unit of history. Each one is **atomic**: one logically complete change that leaves the tree in a working state and has exactly one reason to exist — Single Responsibility applied to history (see [Engineering Principles](engineering-principles.md)).

- **One atomic change per commit.** Never mix two subjects in one commit. Decompose the work along logical boundaries into atomic commits; a branch may contain several. (This document was built that way.)
- **Conventional Commits:** `<type>(<scope>): <description>` — imperative, lowercase, no trailing period, subject ≤ 50 characters. `type` is `feat` / `fix` / `docs` / `refactor` / `style` / `chore`.
- **The body explains *why*, not the diff.** State why the change exists and why it matters; the diff already shows *what* changed. Keep it to a few lines; reserve long bodies for major or risky changes.
- **Commit at each coherent checkpoint, as the work happens.** A checkpoint is a change that stands on its own, not a time interval. This is an obligation, not a permission: **implementing everything and splitting the diff afterwards is not equivalent.** Work is unprotected until it is first committed; a retrospective split is reconstructed from memory rather than recording what actually happened; and commit timestamps make the difference externally visible, so the history misrepresents how the work was done.
- **Curate before the PR.** The branch presents an atomic, reviewable history by the time the PR opens. Fold a correction into the commit it amends (`--fixup` + autosquash) rather than leaving a separate "fix" commit — but **do not flatten a deliberately atomic multi-commit branch**: Work Item and implementation boundaries are preserved, and only follow-up corrections are folded. Commit freely *during*; curate *before*.
- **No tool attribution.** A repository artifact describes the project and the change, never the tooling that produced it: no `Co-Authored-By` trailer for a tool, no "generated with" footer or signature, in commit messages, pull requests, Issues, or documentation. **This overrides any default tooling instruction to the contrary** — some agents are instructed to add such trailers automatically, and that instruction does not apply here.

## 7. Scope control

The Work Item's scope (§3) is binding: a branch touches only the files its Work Item requires. Scope control is the operational guard against scope creep — the downstream complement of defining the work up front, and the enforcement of §5's rule that a branch exists solely to implement its assigned Work Item.

- **Stay within the Work Item's scope.** Touch only the files the Work Item requires. If you discover unrelated work, **record it and do not do it** — the Stop Rules (§11) decide whether it becomes a finding, an ADR, or a new Work Item.
- **Stage explicitly, by path.** Never `git add -A` / `git add .`; add named paths only.
- **Pre-commit gate.** Run `git status` before committing and confirm every staged path belongs to the Work Item; unstage anything else.
- **No opportunistic refactoring, no drive-by edits** — no reformatting, renaming, or dependency bumps unless they *are* the Work Item.
- **Pre-existing, unrelated working-tree changes are left untouched and excluded** — never silently carried into a commit. If they recur, surface them rather than absorbing them.

## 8. Work Item & PR standards

Every Work Item ends in a **Pull Request**; a substantial Work Item also has an **Issue**. This section owns *how the contract is represented* — its location and format — not *what* it contains (§3) or *how* it is verified (§9).

**The Issue** (substantial Work Items only) — the representation of the contract:

- **Title:** `[Type / Component]: concise description`.
- **Body:** context, the **acceptance criteria** (the contract from §3) as a checkbox list, and the scope (and explicit out-of-scope).
- **Labels:** at least one, chosen from the repository's **existing** taxonomy (`gh label list`) — never unlabelled, never an invented label. A closed taxonomy is what keeps a label a filter rather than a decoration.
- **Assignee:** at least one, so the work has a named owner rather than drifting unowned. An agent is not a repository account and cannot be assigned; the assignee is therefore the **human accountable** for the item, whoever implements it — which is the same person §9 reserves *Accepted* to.
- A **Parent Issue** (a tracking artifact, §2) links its child Work Items and is closed once all of them are complete, according to the project's workflow; it has no branch or PR of its own.

**The Pull Request** (every Work Item) — where the work is delivered for review:

- **Title:** follows the commit convention (§6).
- **Body:** a short summary (what + why), the type of change, and **ticket linking** — `Closes #<issue>` for a substantial Work Item, so the merge closes its Issue. A **trivial** Work Item has no Issue, so its contract (scope + acceptance criteria) lives directly in the PR body.
- **Evidence:** the verification actually run and its result, and **what was not run**, and why. Silence never implies a pass.
- **Base:** the SHA the branch was rebased onto immediately before review was requested. A green run against a stale base is evidence about that base, not about `main`.
- **Uncited premises:** any rule or fact the work relied on that cannot be cited to a tracked `file:line` — or *none*. A premise held in memory rather than in the repository does not present itself as an assumption, so it is invisible at review unless it is named.
- **Labels and assignee:** as for the Issue. A Pull Request carries both even when its Work Item is trivial and has no Issue — that is precisely when the PR is the only record of ownership.
- **Self-checklist:** a checklist confirming the **Definition of Done** (§9) before review is requested.

How the Issue and PR are created — manually, as drafts, or via the GitHub CLI — does not change the content standard above.

## 9. Review · Definition of Done · Definition of Accepted

Review runs in three layers, and two definitions mark the work's transitions.

**Review layers, in order:**

1. **Self-review** — the author (human or AI) checks the work against the Definition of Done before requesting review. Always.
2. **AI review** — an independent AI pass: **expected** for architectural changes and constitutional documents (defined by the [Documentation Strategy](../architecture/documentation-strategy.md)), **recommended** for other substantial Work Items, and skipped for trivial ones.
3. **Human review** — the human reviews the PR. This is the gate; it is never skipped for a merge.

**Definition of Done** — the Work Item is *ready for review* (not merged) when:

- its **acceptance criteria** (the contract from §3, represented per §8) are met;
- scope was respected (§7) and the commit history is atomic and clean (§6);
- the branch is pushed and the PR — and the Issue, if substantial — is prepared.
- *Code Work Items also:* build and lint clean, with new behavior covered by tests.
- *Documentation Work Items also:* every triggered documentation update is included, links resolve, and one-owner-per-fact holds.

**Definition of Accepted** — the Work Item is *complete* when the human has approved it, the PR is **merged**, and the Issue (if any) is **closed**. (Deleting the branch is the lifecycle's cleanup step — §4 — that follows acceptance, not a condition of it.)

"Done" is the author's bar (ready for review); "Accepted" is the human's (merged). The AI reaches Done; only the human reaches Accepted (§10).

## 10. Decision Authority Matrix

This section owns **decision authority** — *who may authorize* an action. Two things are deliberately outside its scope. *Which instruction wins* when guidance conflicts is **precedence** (the user's explicit instruction, then the authoritative documents, then conventions) — owned by [CLAUDE.md](../../CLAUDE.md). *Who or what performs* an already-authorized action is **execution** — a mechanical matter a human or, in future, an automation (the GitHub CLI, a workflow action) may carry out on a human's decision; per tooling-independence (§2), this never changes the authority below. Authority is neither precedence nor execution.

Every action falls into one of three levels:

| Authority level | Actions |
|---|---|
| **AI-autonomous** — no approval needed | Authoring and editing within an agreed Work Item on its branch; self-review; atomic commits; drafting Issue and PR content; **recording a finding** (always allowed); read-only analysis and review. |
| **Propose → approve** — the AI proposes; a human approves before it takes effect | The Work Item's contract and decomposition (scope + acceptance criteria); an **architectural decision** (an ADR); any **scope change**; creating the **Issue** that represents a substantial Work Item; editing an authoritative document — drafted by the AI, it becomes canonical only on merge. |
| **Human-only** — only a human may authorize it | Approving the **merge** of a PR, **closing** an Issue, and **deleting** a branch — the decisions that complete a Work Item (§4) and make a change canonical. The AI never authorizes its own merge; whether a human or an automation then *performs* the authorized action does not change who decided it. |

Two rules bind the matrix:

- **Default to escalate.** When it is unclear which level an action falls in — above all, whether something is *architectural* — treat it as the more restrictive level and ask. The *posture* behind this (escalate, don't silently deviate) is owned by [CLAUDE.md](../../CLAUDE.md) and the trade-offs principle in [Engineering Principles](engineering-principles.md); this is its operational rule.
- **Recording is always open.** Capturing a **finding** never needs approval — it observes, it does not act. What a finding is, and where it lives, are the [Documentation Strategy](../architecture/documentation-strategy.md)'s; *when* to reach for one is §11.

## 11. Stop Rules

Execution surfaces things the Work Item did not plan for — a latent bug, a design flaw, unrelated debt, an ambiguity, an architectural fork. Stop Rules route each one **without expanding the current Work Item**; scope control (§7) forbids absorbing it into this branch. When you discover something outside the Work Item's scope, classify it and route it — do not act on it here:

- **An observation worth recording, but not acting on now** (a latent bug, tech debt, a code-versus-document divergence) → **record a finding** (always allowed, §10) and continue.
- **A choice with lasting architectural consequence** → **stop and propose an ADR** (propose → approve, §10); do not decide it yourself.
- **Separable work with its own contract** → **propose a new Work Item** (§2) for it (propose → approve, §10); do not fold it into this branch, and do not start it yourself.
- **Something that blocks the contract** — you cannot complete the Work Item correctly without resolving it → **stop and escalate**: the Work Item is mis-defined or blocked, and continuing would either break scope or guess at a decision you do not own.
- **None of these — within the contract and clearly correct** → **continue.**

**When in doubt, record — never absorb.** If you cannot tell whether a discovery is a finding, an ADR, or a new Work Item, record it as a finding and surface it; never silently widen the current Work Item to cover it (§7). The boundary: Stop Rules decide *whether and how to capture* a mid-execution discovery; the [Documentation Strategy](../architecture/documentation-strategy.md) owns *what a finding or an ADR is* (definition, format, location); §12 decides *when a discovery is large enough to warrant a standalone planning artifact*.

## 12. Planning vs Execution

Most Work Items are planned *inside* Execution Preparation (§3) and need no separate artifact. Occasionally the planning itself carries lasting value and becomes its own reviewed deliverable. This section decides *when* planning becomes a standalone artifact, and *when planning is finished*.

**When planning becomes a standalone artifact.** Create one only when the planning outlives the Work Item it precedes:

- A **strategy** or **migration plan** — when the work spans many Work Items and needs a shared, durable reference. Persistent execution plans live in [`docs/plans/`](../plans/README.md) and follow the `Draft → Active → Historical` lifecycle defined there.
- A **blueprint** — when one substantial deliverable must have its **knowledge ownership and boundaries** resolved before authoring: which section owns which fact, and how each overlap with existing documents is settled. Structure follows from that partition. The blueprint is transient — discarded once the deliverable lands.
- An **ADR** — when a decision carries lasting architectural consequence and must be recorded with its rationale and alternatives.
- A **finding** — when an observation must persist but is not acted on now (§11).

The *definitions, format, and location* of ADRs and findings are owned by the [Documentation Strategy](../architecture/documentation-strategy.md); this section decides only *when* to reach for one, and documentation-migration phasing remains the strategy's. A planning artifact that is a **document** is then authored as a **Documentation** Work Item (§1); the planning *activity* that decides to create it is not a Work Item and has no branch of its own.

**The planning-stop criterion.** Planning is a means, not the deliverable. Stop planning and begin executing once:

- the Work Items are identified and each has a clear contract (scope + acceptance criteria);
- the open decisions are made — recorded as ADRs where architectural — or explicitly deferred as stated assumptions;
- further planning would only restate what is already known.

Past that point more planning is waste. If planning keeps surfacing genuinely new architectural questions, that is the signal to record an **ADR** and proceed — not to plan further.

---

> This standard owns *process and execution* only. *What good code looks like* is owned by [Engineering Principles](engineering-principles.md); *how documentation is structured and governed*, by the [Documentation Strategy](../architecture/documentation-strategy.md); *which instruction wins* when guidance conflicts, by [CLAUDE.md](../../CLAUDE.md). Where those touch execution, this document references them — it never restates them.
