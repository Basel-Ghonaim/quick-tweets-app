# CLAUDE.md — AI Session Bootstrap

> The minimum every AI assistant must know before working in this repository, and where to find the authoritative detail.
> This file is a **pointer, not a source of truth.** It summarizes and links; it never duplicates the authoritative documents. Keep it short.

## Project mission

**quick-tweets** is a Twitter/X-style social app built as a monorepo: a React 19 + Redux Toolkit frontend (`apps/web/`) and an Express 5 + Prisma + PostgreSQL backend (`apps/api/`). It is a clean-architecture reference project — SOLID, strict typing, single-responsibility modules — where engineering quality is considered a first-class deliverable alongside product functionality.

## AI mission

Your primary responsibility is to protect the integrity of this project — its architecture, its documentation quality, and its engineering standards — while delivering the work you are asked to do. Leave the project at least as consistent as you found it.

- Uphold the established patterns and ownership boundaries; do not erode them for convenience.
- Keep documentation trustworthy: one owner per fact, summarize-and-link, never duplicate.
- When an implementation would conflict with these standards, **escalate rather than silently deviate.**

## Code is the source of truth

Documentation captures the **intended** architecture and the **why**; the **code** is authoritative for **what the system actually does**. When code and documentation disagree, the code wins — fix the document (if it is in scope) or record the divergence as a finding. Never change code to match a document without an approved decision.

## Non-negotiable rules (every task)

- **Stay in scope.** Touch only the files the task requires. Stage explicitly by path; never `git add -A` / `git add .`. No opportunistic refactoring, no drive-by edits. If you discover unrelated work, **record it — do not do it.**
- **One owner per fact.** In documentation, summarize-and-link; never duplicate authoritative content.
- **Atomic commits.** Each commit is one logically complete change, in Conventional Commits format.
- **Decisions are gated.** Architectural decisions and scope changes require human approval — *propose, don't decide.* Recording a **finding** is always allowed. Merging, closing issues, and deleting branches are **human-authorized**; the AI may *draft* changes to authoritative documents, but a change becomes canonical only on a human-authorized merge.
- **Claim only what is true.** Never present something as existing when it does not. What a document *may* say beyond that is set by its **class**, which the [Documentation Strategy](docs/architecture/documentation-strategy.md) owns. Committed product scope has a home; inventing implementation does not.
- **Right-size the process.** Match the process weight to the task: lightweight work (conversation, analysis, planning) skips the full lifecycle; substantial implementation and refactoring follow the Engineering Execution Standard, which defines the task classes and their rules.
- **When unsure whether something is architectural, escalate.**

## Session bootstrap checklist

1. Read this file. **If this is your first session on the project, read the Agent Onboarding guide next** — it is the on-ramp: reading order, decision authority in practice, and the mistakes newcomers make.
2. Identify the task's scope and the **single** authoritative document for the area (see Authoritative Documents).
3. For substantial implementation, consult the **Engineering Execution Standard** before starting.
4. Work on a branch cut from the latest `main`, following the project's Git conventions.
5. Before finishing: verify scope, self-review, make atomic commits, push, prepare Issue/PR content. **"Done" means ready for review — not merged.**

## Documentation architecture

This project has a **constitutional documentation architecture**: a small set of governing documents (the *constitution*) defines how documentation, engineering, and execution work, and all authoritative documentation lives under a single root — `docs/` — organized by responsibility (`project/`, `architecture/` including ADRs in `decisions/` and `findings/`, `api/`, `backend/`, `frontend/`, `features/`, `development/`, `plans/`).

**Always consult the authoritative document for a topic; never infer intended behavior from repository structure or from a non-authoritative document.** The **Documentation Strategy** is the constitution for documentation — the authority on structure, ownership, and how documentation changes.

## Decision precedence

1. The user's explicit instruction in the current task —
2. the authoritative documents (below) —
3. project conventions and sensible defaults.

Higher overrides lower. **Between two authoritative documents that both apply, the more specific one governs its own domain** — a platform contract over a general operating principle, and the principle where no contract speaks. A general rule does not become a domain rule by being read first. Two things override that: the Documentation Strategy prevails on any question of documentation governance, and this list settles the order above it. If following one document would contradict another, that is a mis-scoped rule or a real conflict — record it; never pick a side silently. Any override must be **stated, never silent.** Silent drift from the standards is not allowed.

## Authoritative Documents

Consult the relevant one before deep work; do not duplicate it here.

- **Documentation map** (every document, classified, with its owner — the navigation entry point) → `docs/README.md`
- **Documentation governance** → `docs/architecture/documentation-strategy.md`
- **API contract** (single source for endpoints, payloads, error shapes) → `docs/api/api-contract.md`
- **Agent onboarding** (the on-ramp for a new agent or contributor — reading order, decision authority in practice, common mistakes, the self-review bar) → `docs/development/agent-onboarding.md`
- **Engineering Execution Standard** (work units, Git lifecycle, branch/commit strategy, scope control, review, Definition of Done & Accepted, Decision Authority Matrix, stop rules) → `docs/development/engineering-execution-standard.md`
- **Code design principles** (SOLID, data/architectural patterns, naming) → `docs/development/engineering-principles.md`
- **Testing topology** (where a behaviour is proven — the lanes, what each owns and is forbidden, and the rule that assigns one) → `docs/development/testing-topology.md`

---

> **This is a bootstrap document, not a knowledge base.** Keep it intentionally small and stable: update it only when a stable, project-wide fact changes — never to add knowledge that belongs in an authoritative document.
