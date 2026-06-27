# Documentation Migration Plan

> **Status:** Active reference for all documentation migration phases.
> **Authority:** This document is the official, binding plan for consolidating all existing documentation into the single root defined by [`documentation-strategy.md`](./documentation-strategy.md). Every migration phase must follow the inventory, decisions, ownership assignments, order, and risk controls recorded here.
> **Scope:** Analysis and planning only. This document moves, merges, or deletes nothing. It records *what* will happen, *where* each fact will live, and *in what order* — so that execution phases are mechanical and reversible.
> **Governing standard:** [`documentation-strategy.md`](./documentation-strategy.md). This plan is synchronized with the finalized strategy, including the dedicated owners `frontend/forms.md` and `frontend/api-client.md`, the narrowed `frontend/design-system.md`, and the `architecture/findings/` register.

---

## 1. Documentation Inventory

Every Markdown file currently present in the repository, regardless of location. **19 files reviewed.**

| # | Current path | Subject |
|---|---|---|
| 1 | `README.md` | Vite/React starter boilerplate; repository landing page |
| 2 | `docs/api/api-contract.md` | HTTP API contract — endpoints, payloads, error shapes |
| 3 | `docs/architecture/documentation-strategy.md` | Documentation constitution (governing standard) |
| 4 | `server/docs/setup-log.md` | Chronological backend build log + design-decision tables |
| 5 | `server/docs/issues.md` | Snapshot/mirror of backend GitHub issues |
| 6 | `server/docs/Gaps-and-shortcomings-map.md` | Project-review gaps backlog (already removed in the working tree) |
| 7 | `src/docs/Principles/GitHub.md` | Git, issue, branch, commit, and PR conventions |
| 8 | `src/docs/Principles/Ai_ImplementationWorkflow.md` | AI implementation workflow steps |
| 9 | `src/docs/Principles/MyWorkingPrinciples.md` | SOLID, data/architectural patterns, naming and coding standards |
| 10 | `src/docs/auth_context.md` | Frontend auth system context — flow, state, token model, file map |
| 11 | `src/docs/rtk-query-strategy.md` | RTK Query incremental-adoption strategy |
| 12 | `src/docs/shared-api-errors.md` | Shared API (Axios) layer + error normalization layer |
| 13 | `src/modules/auth/hooks/README.md` | Auth hooks public-interface usage guide |
| 14 | `src/modules/auth/components/RightPanel/changelog.md` | UI integration step-by-step changelog |
| 15 | `src/shared/design-system/components/FileInput/FileInput.md` | FileInput usage/props reference + build log |
| 16 | `src/shared/design-system/docs/FileInputIssues.md` | FileInput GitHub-issues backlog |
| 17 | `src/shared/design-system/docs/IconLibraryIssues.md` | Icon-library GitHub-issues backlog |
| 18 | `src/shared/design-system/docs/Suggestions.md` | Design-system feature ideas/suggestions |
| 19 | `src/shared/schema-form/readme.md` | Schema-form engine reference + decision log + roadmap |

> This plan itself (`docs/architecture/documentation-migration-plan.md`) is the deliverable of Phase 0 and is therefore not an item to be migrated.

---

## 2. Migration Map & Destination Mapping

Each file has **exactly one** decision (`Keep` / `Move` / `Merge` / `Delete`). For `Move` and `Merge`, the destination names the document that becomes the **single authoritative owner** of the content. Per-file handling notes record how durable content is preserved (so no `Delete` loses information). Destinations follow the finalized strategy's owners.

| # | Current path | Decision | Destination / authoritative owner | Handling |
|---|---|---|---|---|
| 1 | `README.md` | **Keep** | `README.md` (root) | Stays as the repo landing page; later editorially trimmed to a short project intro that links to `docs/`. Not relocated. |
| 2 | `docs/api/api-contract.md` | **Keep** | `docs/api/api-contract.md` | Already authoritative and correctly located. |
| 3 | `docs/architecture/documentation-strategy.md` | **Keep** | `docs/architecture/documentation-strategy.md` | The governing standard; correctly located. |
| 4 | `server/docs/setup-log.md` | **Delete** | — | Extract durable architectural decisions into ADRs under `docs/architecture/decisions/`; record any unresolved architectural concern as a finding under `docs/architecture/findings/`; chronological narrative is preserved by Git history. Delete only after extraction. |
| 5 | `server/docs/issues.md` | **Delete** | — | Issue tracking is owned by GitHub Issues (authoritative). No durable documentation value; remove after confirming issues exist in the tracker. |
| 6 | `server/docs/Gaps-and-shortcomings-map.md` | **Delete** | — | Architectural rationale → ADRs; any still-open architectural concern → `architecture/findings/`; the remaining superseded backlog → issue tracker. Already removed in the working tree; this formalizes it. |
| 7 | `src/docs/Principles/GitHub.md` | **Merge** | `docs/development/engineering-execution-standard.md` | Git/branch/commit/PR/issue conventions — consolidated into the execution standard (authored and merged). |
| 8 | `src/docs/Principles/Ai_ImplementationWorkflow.md` | **Merge** | `docs/development/engineering-execution-standard.md` | AI workflow steps — consolidated into the execution standard (authored and merged). |
| 9 | `src/docs/Principles/MyWorkingPrinciples.md` | **Merge** | `docs/development/engineering-principles.md` | SOLID, naming, and coding standards become the engineering principles (authored and merged). Mechanism-specific subsections (JWT, RTK Query, schema-form, API client, etc.) are **owned by platform docs** and are linked, not copied. |
| 10 | `src/docs/auth_context.md` | **Merge** | `docs/features/authentication.md` | Auth flow, token model, and feature-specific bindings move to the feature doc. Shared mechanisms are owned by `frontend/*` platform docs — Redux/RTK by `state-and-data.md`, the Axios client by `api-client.md`, error normalization by `error-handling.md` — and linked. |
| 11 | `src/docs/rtk-query-strategy.md` | **Merge** | `docs/frontend/state-and-data.md` | RTK Query adoption strategy consolidated into the state/data platform doc. |
| 12 | `src/docs/shared-api-errors.md` | **Merge** | `docs/frontend/error-handling.md` (primary) + `docs/frontend/api-client.md` | Two-owner file: the error-normalization pipeline → `error-handling.md`; the Axios client / interceptor / retry / 401-refresh / config layer → `api-client.md`. Content is split between the two owners during the merge. |
| 13 | `src/modules/auth/hooks/README.md` | **Merge** | `docs/features/authentication.md` | Hooks usage/flow folds into the authentication feature doc. The "Future Roadmap" section → issue tracker (not carried into authoritative docs). |
| 14 | `src/modules/auth/components/RightPanel/changelog.md` | **Delete** | — | Step-by-step edit history is preserved by Git history. No durable documentation value. |
| 15 | `src/shared/design-system/components/FileInput/FileInput.md` | **Merge** | `docs/frontend/design-system.md` | Usage/props/component reference (Part 1) folds into the presentation-only design-system doc. The "How We Built It" build log (Part 2) → Git history. |
| 16 | `src/shared/design-system/docs/FileInputIssues.md` | **Delete** | — | Backlog mirror; owned by GitHub Issues. |
| 17 | `src/shared/design-system/docs/IconLibraryIssues.md` | **Delete** | — | Backlog mirror; owned by GitHub Issues. |
| 18 | `src/shared/design-system/docs/Suggestions.md` | **Delete** | — | Speculative feature ideas; owned by GitHub Issues (no speculative documentation per strategy). |
| 19 | `src/shared/schema-form/readme.md` | **Merge** | `docs/frontend/forms.md` | Engine reference (philosophy, structure, API, the `SchemaField` seam) folds into the dedicated forms doc — **not** the design system, which the form engine consumes. "Decision Log" → an ADR if it meets the architectural bar; "Future Roadmap" → issue tracker. |

---

## 3. Ownership Validation

Verification that, after migration, **every fact has one and only one owner** as required by the strategy. The existing documentation contains substantial duplication and several drifted copies; these are the conflicts the migration must resolve.

### 3.1 Single-owner assignment for shared facts

| Fact | Single owner after migration | Currently duplicated across |
|---|---|---|
| HTTP endpoints, payloads, error shapes | `docs/api/api-contract.md` | api-contract.md, auth_context.md, issues.md, setup-log.md |
| Frontend error taxonomy / `AppError` normalization | `docs/frontend/error-handling.md` | shared-api-errors.md, auth_context.md, MyWorkingPrinciples.md |
| Axios API client (clients, interceptors, retry, 401-refresh, config) | `docs/frontend/api-client.md` | shared-api-errors.md, auth_context.md |
| Redux + RTK Query mechanics | `docs/frontend/state-and-data.md` | rtk-query-strategy.md, auth_context.md, MyWorkingPrinciples.md |
| Schema-driven form engine (validation, state, inference, `SchemaField` seam) | `docs/frontend/forms.md` | schema-form/readme.md, MyWorkingPrinciples.md (form parts) |
| Design system (components, tokens, theme, typography) | `docs/frontend/design-system.md` | FileInput.md, MyWorkingPrinciples.md (DS parts), Suggestions.md (→ issues) |
| Auth flow, token model, bootstrap | `docs/features/authentication.md` | auth_context.md, hooks/README.md, issues.md, setup-log.md |
| Auth mechanisms (JWT, bcrypt, cookies, rate limit) | `docs/backend/security.md` | setup-log.md, issues.md |
| Git / AI process conventions | `docs/development/engineering-execution-standard.md` | GitHub.md, Ai_ImplementationWorkflow.md |
| Code-design principles (SOLID, naming) | `docs/development/engineering-principles.md` | MyWorkingPrinciples.md |
| Architectural decision rationale | `docs/architecture/decisions/` (ADRs) | setup-log.md, Gaps-and-shortcomings-map.md, schema-form/readme.md (decision log) |
| Known architectural deviations / technical debt | `docs/architecture/findings/` | new register (see §7) |
| Issues / planned work | GitHub Issues (tracker) | issues.md, FileInputIssues.md, IconLibraryIssues.md, Suggestions.md, all "Future Roadmap" sections |

### 3.2 Identified conflicts and how the migration resolves them

1. **Duplicated error taxonomy with drift.** The frontend `ErrorType` set is described three times with *different* contents (`shared-api-errors.md` lists 16 types; `auth_context.md` lists 17; `MyWorkingPrinciples.md` lists a subset). **Resolution:** a single owner (`frontend/error-handling.md`), reconciled against the code, which is the source of truth. The other copies are removed or linked.
2. **Two-owner source file.** `shared-api-errors.md` legitimately covers two distinct subjects (error layer + API layer). **Resolution:** split between `frontend/error-handling.md` and `frontend/api-client.md` during the merge — neither owner restates the other.
3. **Form engine filed under the design system.** `schema-form/readme.md` (and the form parts of `MyWorkingPrinciples.md`) describe a behavior subsystem that *consumes* the design system. **Resolution:** owned by `frontend/forms.md`; `design-system.md` is narrowed to presentation only. The `SchemaField` seam is owned by `forms.md`, which links to the DS controls.
4. **Feature doc vs. platform mechanisms.** `auth_context.md` and `hooks/README.md` mix auth-feature flow with shared mechanisms. **Resolution:** feature-specific content → `features/authentication.md`; mechanisms → the relevant `frontend/*` platform doc (`api-client.md`, `state-and-data.md`, `error-handling.md`), linked from the feature doc.
5. **Principles vs. mechanisms.** `MyWorkingPrinciples.md` mixes cross-cutting standards (SOLID, naming) with mechanism descriptions. **Resolution:** standards → `development/engineering-principles.md`; mechanisms are owned by platform docs and linked.
6. **Stale facts (code drift).** Several sources contradict the current code: `auth_context.md` states React 18 / react-router v6 (code is React 19 / v7); `MyWorkingPrinciples.md` references Multer (removed) and `password max(16)` (now 72) and the retired tarmeez API. **Resolution:** content is reconciled against the code before it becomes authoritative — drifted facts are corrected, never copied forward.
7. **Build logs and roadmaps inside reference docs.** `FileInput.md`, `schema-form/readme.md`, and `hooks/README.md` embed step-by-step build history and speculative roadmaps. **Resolution:** build history → Git; roadmaps → issue tracker; only durable reference content is merged.
8. **Architectural smell surfaced during planning.** Splitting the form engine from the design system exposed a **circular dependency** (`schema-form → design-system` at runtime; `design-system → schema-form` for types) and a **duplicated `SchemaField`**. **Resolution:** this is recorded as an architecture finding (see §7), **not** documented as design — `forms.md` and `design-system.md` describe the intended one-directional relationship and link to the finding.

No fact is left with two owners after the plan is executed.

---

## 4. Migration Order

The order is lowest-risk first, and **create-before-delete**: a source is removed only after its durable content has an owner and all inbound links are repointed. Each step is a separate branch → review → merge unit, consistent with the project's small-PR workflow.

1. **Development & project docs (lowest risk, self-contained).**
   Build the `development/` standards — `GitHub.md` + `Ai_ImplementationWorkflow.md` → `engineering-execution-standard.md` (process) and `MyWorkingPrinciples.md` (standards only) → `engineering-principles.md` (code design); **both authored and merged.** Create `docs/project/overview.md` and `docs/project/glossary.md`.
2. **Architecture, ADRs, and findings.**
   Create `docs/architecture/system-overview.md` and `docs/architecture/data-model.md`. Initialize `docs/architecture/decisions/` and `docs/architecture/findings/`. Extract durable decisions from `setup-log.md`, `Gaps-and-shortcomings-map.md`, and the `schema-form` decision log into ADRs; record discovered architectural smells (starting with the schema-form ↔ design-system circular dependency, §7) as findings. *(Extraction must complete before the corresponding deletions in step 6.)*
3. **Backend platform docs.**
   Create `docs/backend/conventions.md` and `docs/backend/security.md`, sourcing mechanism rationale from `setup-log.md`/`issues.md` and linking the contract in `api-contract.md`.
4. **Frontend platform docs.**
   Create `docs/frontend/api-client.md` (← `shared-api-errors.md`, API/Axios half), `docs/frontend/state-and-data.md` (← `rtk-query-strategy.md`), `docs/frontend/error-handling.md` (← `shared-api-errors.md`, error half), `docs/frontend/forms.md` (← `schema-form/readme.md`; links to the circular-dependency finding), `docs/frontend/design-system.md` (← `FileInput.md`, presentation only), and `docs/frontend/architecture.md` (feature-sliced layout, module pattern, platform index, and the thin utilities — storage, hooks, types).
5. **Feature docs (depend on platform docs existing, so they can link).**
   Create `docs/features/authentication.md` (← `auth_context.md` + `hooks/README.md`), reconciled against the code and linking the platform docs from steps 3–4.
6. **Deletions (only after their content has a home and links are repointed).**
   Remove `setup-log.md`, `issues.md`, `Gaps-and-shortcomings-map.md`, `RightPanel/changelog.md`, `FileInputIssues.md`, `IconLibraryIssues.md`, `Suggestions.md`.
7. **Index, pointers, and verification (last).**
   Author `docs/README.md` (the documentation map), trim the root `README.md` to point into `docs/`, repoint any remaining cross-links, then run a link-integrity and duplication audit to confirm one-owner-per-fact.

**Ordering invariants:** ADR/finding extraction precedes `setup-log`/`Gaps` deletion; platform docs precede feature docs; all deletions precede the final verification; nothing is deleted while a live link still targets it.

---

## 5. Risk Assessment

| Risk | Where it arises | Mitigation |
|---|---|---|
| **Information loss** | Deleting `setup-log.md`, `Gaps-and-shortcomings-map.md`, the schema-form decision log | Extract durable decisions into ADRs (and open architectural concerns into findings) and reconcile mechanism rationale into platform docs **before** deletion; per strategy, a file is deleted only after its durable content has an assigned home. Git history preserves chronological narrative. |
| **Content duplication** | Error taxonomy, auth flow, conventions, and endpoints each appear in multiple sources | Enforce the single-owner table (§3.1): write each fact into its owner once; all other documents link. A duplication audit runs in step 7 before the migration is declared complete. |
| **Broken internal links** | Cross-references between docs and to soon-deleted files; external links to `src/docs/*` paths | Before moving/deleting, search for inbound references and repoint them to the new owner; perform deletions only after repointing; run a final link-integrity pass; record old→new locations in `docs/README.md` during the transition. |
| **Responsibility conflicts** | Two-owner files: `shared-api-errors.md` (error → `error-handling.md` + API → `api-client.md`), `MyWorkingPrinciples.md` (principles + mechanisms), `auth_context.md` (feature + platform), `FileInput.md` / `schema-form/readme.md` (reference + build log + roadmap) | Split each file along the strategy's ownership boundary (mechanism → platform, feature-specific → feature, standards → workflow); drop build history (→ Git) and roadmaps (→ issues). Destinations are pre-assigned in §2 so no execution-time ambiguity remains. |
| **Normalizing a smell as design** | The schema-form ↔ design-system circular dependency surfaced while assigning owners | Record it as an architecture finding (§7) per the strategy; `forms.md`/`design-system.md` describe the *intended* relationship and link to the finding. Architectural smells found during migration are routed to `findings/`, never written into the intended-architecture docs. |
| **Stale / incorrect content propagated as authoritative** | `auth_context.md` (React 18 / router v6), `MyWorkingPrinciples.md` (Multer, password max 16, tarmeez API), differing `ErrorType` counts | Reconcile every merged fact against the code (the single source of truth) before it becomes authoritative; correct drifted facts during the merge — never copy them forward. |
| **Speculative documentation re-entering the set** | "Future Roadmap"/"Suggestions" sections in `schema-form/readme.md`, `hooks/README.md`, `Suggestions.md` | Route all forward-looking items to the issue tracker; authoritative docs document only what exists (strategy principles 5–6). |
| **Two documentation roots during transition** | Files temporarily exist in both `src/docs`/`server/docs` and `docs/` | Migrate one category at a time and complete its create→repoint→delete cycle before starting the next, minimizing the window; `docs/README.md` records the canonical location throughout. |

---

## 6. Summary

| Decision | Count | Files |
|---|---|---|
| **Keep** | 3 | `README.md`, `docs/api/api-contract.md`, `docs/architecture/documentation-strategy.md` |
| **Move** | 0 | — |
| **Merge** | 9 | `GitHub.md` → `development/engineering-execution-standard.md`; `Ai_ImplementationWorkflow.md` → `development/engineering-execution-standard.md`; `MyWorkingPrinciples.md` → `development/engineering-principles.md`; `auth_context.md` → `features/authentication.md`; `rtk-query-strategy.md` → `frontend/state-and-data.md`; `shared-api-errors.md` → `frontend/error-handling.md` + `frontend/api-client.md`; `hooks/README.md` → `features/authentication.md`; `FileInput.md` → `frontend/design-system.md`; `schema-form/readme.md` → `frontend/forms.md` |
| **Delete** | 7 | `setup-log.md`, `issues.md`, `Gaps-and-shortcomings-map.md`, `RightPanel/changelog.md`, `FileInputIssues.md`, `IconLibraryIssues.md`, `Suggestions.md` |
| **Total reviewed** | **19** | every Markdown file in the repository |

Every existing documentation file has exactly one assigned fate. No file is left undecided. The plan is consistent with [`documentation-strategy.md`](./documentation-strategy.md): a single documentation root, one owner per fact, dedicated owners for the form engine (`frontend/forms.md`) and the API client (`frontend/api-client.md`), a presentation-only design system, no speculative documentation, decisions captured as ADRs, deviations captured as findings, and durable content preserved before any deletion.

---

## 7. Architecture Findings to Record

The planning work itself surfaced an architectural deviation. Per the strategy (Principle 9 and the Architecture Findings Policy), it is recorded in `docs/architecture/findings/` rather than normalized into the design documentation. This is created when the affected frontend docs are authored (migration step 2/4).

| Finding | Evidence | Why it is a finding, not design |
|---|---|---|
| **Circular dependency between the schema-form engine and the design system** | `src/shared/schema-form/components/SchemaField.tsx` imports `{ Input, Checkbox }` from `@shared/design-system` (runtime); `src/shared/design-system/components/SchemaField/SchemaField.types.ts` imports `FieldType` / `FormChangeHandler` / `FieldSpan` from `@shared/schema-form` (type). Two diverging `SchemaField` implementations exist. | The intended relationship is one-directional: `forms → design-system`. The reverse (presentation depending on form-engine types) and the duplicated bridge are deficiencies, not design. `frontend/forms.md` and `frontend/design-system.md` describe the intended direction and **link** to this finding; the fix (e.g., relocating the shared form types or removing the DS-side `SchemaField`) is planned later in a dedicated refactoring branch, not scheduled here. |

This is the only finding identified during planning. Additional findings are added to the register as later phases surface them.
