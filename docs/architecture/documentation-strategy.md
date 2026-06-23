# Documentation Strategy

> **Status:** Active standard.
> **Authority:** This document is the constitutional reference for all documentation work in this project. Every documentation file, contribution, and review — by humans or AI assistants — must comply with it. Where any other documentation practice conflicts with this document, this document prevails.
> **Scope:** Governs *what* documentation exists, *where* it lives, *who owns each fact*, and *when* it must change. It does not document the product itself.
> **Version:** 1.0
> **Last Updated:** 2026-06-23
> **Owner:** Basel Ghonaim


---

## 1. Documentation Philosophy

Documentation exists to capture what the source code cannot express on its own: **intent, rationale, contracts, and conventions**. The code is always the source of truth for *what the system does*; documentation explains *why it is built that way* and *how its parts are meant to be used together*.

From this, three commitments follow:

1. **Documentation is an asset only while it is trusted.** A document that has silently drifted from the code is worse than no document, because it actively misleads. Therefore the strategy optimizes for *staying correct over time*, not for breadth of coverage.
2. **Less, but authoritative.** We prefer a small set of documents that are each the single, dependable home for their subject over a large set that overlap and contradict.
3. **Documentation is AI-friendly by being unambiguous.** A reader — human or model — must be able to find exactly one authoritative answer to any question without reconciling competing copies.

---

## 2. Documentation Principles

These principles are binding. They mirror the project's engineering principles (single responsibility, source of truth, dependency on abstractions) applied to documentation.

1. **The source code is the single source of truth** for system behavior. Documentation never restates what the code already states authoritatively; it links to it.
2. **One owner per fact.** Every piece of information has exactly one authoritative document. Every other document that needs it **links**, and never copies.
3. **Single responsibility per document.** Each document has one clearly defined subject. If a document needs two unrelated subjects, it must be split.
4. **Describe intent and conventions, not inventory.** No document enumerates the file tree or narrates code that is self-evident in the repository. Documentation explains *patterns and reasons*, not *file listings*.
5. **Document only what exists.** A section is written only when the code it describes exists. Speculative or aspirational documentation is not permitted.
6. **Future work lives in the issue tracker**, not in documentation.
7. **Significant decisions are recorded as ADRs** (see §8) and are immutable once accepted.
8. **Documentation is versioned with the code that obligates it** (see §10), in the same change, under the same review.
9. **Documentation describes the *intended* architecture; the code is the source of truth for the *actual* state.** Where the two diverge, the deviation is recorded as an architecture finding (see §9) — it is never normalized into the design documentation as if it were intentional.

---

## 3. Documentation Ownership Model

To guarantee "one owner per fact," every document is one of two kinds, and the boundary between them is strict.

### Platform documents
Located in `architecture/`, `api/`, `backend/`, and `frontend/`. They own **shared mechanisms that no single feature owns** — the request lifecycle, the response/error model, authentication mechanisms, the schema-driven form engine, the design system, the data-model rationale. A platform document is the authoritative home for its mechanism.

### Feature documents
Located in `features/`. They own **one business capability** end to end. A feature document **composes** platform mechanisms by linking to them; it never re-describes them. It owns only what is specific to that capability: its purpose, its behavioral rules, and its feature-specific bindings.

### The ownership boundary
The dividing question is always: **"Is this a shared mechanism, or a feature-specific application of one?"**

- A shared mechanism (e.g., how the RTK Query base query works, how `AppError` normalization works, how JWTs are signed) is owned by a platform document.
- A feature-specific application (e.g., "the tweets feature uses cache tag X", "authentication stores the access token in Redux memory") is owned by that feature document, and links to the platform document for the mechanism's details.

This is a single-axis organization with a shared platform layer. There is no by-layer **and** by-feature duplication, because a fact is owned by its mechanism *or* by its feature — never both.

---

## 4. Documentation Directory Structure

There is **one** authoritative documentation root: `docs/` at the repository level. No documentation tree exists anywhere else.

```
docs/
  README.md                      ← documentation map, navigation, ownership + update-trigger rules

  project/
    overview.md                  ← product scope and current implementation status
    glossary.md                  ← canonical project vocabulary

  architecture/
    documentation-strategy.md    ← this document (the documentation constitution)
    system-overview.md           ← topology and request lifecycle across frontend/backend/database
    data-model.md                ← schema rationale (relationships, cascade, indexing); refers to schema.prisma
    decisions/                   ← ADRs: one immutable file per architectural decision
    findings/                    ← architecture findings, tech debt, and design concerns (one file per finding)

  api/
    api-contract.md              ← the single source for endpoints, payloads, and error shapes

  backend/
    conventions.md               ← layering, response wrapper, error model, validation, pagination patterns
    security.md                  ← JWT, password hashing, cookies, rate limiting, helmet/CORS mechanisms

  frontend/
    architecture.md              ← feature-sliced layout, module pattern, platform index, thin utilities (storage, hooks, types)
    api-client.md                ← Axios clients, interceptors, retry, 401-refresh flow, base config
    state-and-data.md            ← Redux and RTK Query strategy
    error-handling.md            ← AppError normalization pipeline
    forms.md                     ← schema-driven form engine (validation, form state, field inference) + SchemaField seam
    design-system.md             ← presentation only: components, design tokens, theme, typography

  features/
    <feature>.md                 ← one document per implemented feature capability

  development/
    setup.md                     ← running the project locally (environment, scripts)
    workflow.md                  ← git, AI, and working-principle conventions
```

### Single-root rule and the code-adjacent exemption
`docs/` is the only authoritative documentation root. A `README.md` may remain beside a reusable code unit **only** when all of the following hold: it documents the usage of that single code unit, it contains no feature or contract material, and it is indexed from `docs/README.md`. Such a file is a usage pointer, never an authoritative source; the authoritative source remains the relevant document under `docs/`.

### Structure rules
- **No directory-tree document.** The repository is the source of truth for structure. Documents explain conventions, not file inventories.
- **Feature documents map to code modules.** A capability that is part of another module (for example, likes, which live in the tweets module) is documented inside that module's feature document, not as a separate one.
- **Sections appear only when the code exists.** A feature document includes a frontend section only once that feature has frontend code; otherwise that section is absent (not a placeholder).

---

## 5. Responsibility of Each Documentation Category

Each category has a single responsibility. Material outside that responsibility belongs elsewhere and must be linked, not duplicated.

| Category | Owns (single responsibility) | Must not contain |
|---|---|---|
| `project/` | Product scope, current implementation status, shared vocabulary | Implementation detail, future plans |
| `architecture/` | System topology, data-model rationale, governance, recorded decisions (ADRs), and architecture findings | Endpoint shapes, per-feature behavior |
| `api/` | The complete HTTP contract: endpoints, payloads, error shapes | Business rationale, frontend usage |
| `backend/` | Cross-cutting backend mechanisms (conventions, security) | Per-feature or per-module logic |
| `frontend/` | Cross-cutting frontend platform subsystems: API client, state/data, error normalization, the schema-driven form engine, and the design system (presentation only) | Per-feature flows |
| `features/` | One capability's intent, rules, and feature-specific bindings — composing platform docs by link | Restated endpoints, schema, or generic mechanisms |
| `development/` | How to run the project and how the team works | Architecture or feature content |

---

## 6. Single Source of Truth Rules

For every recurring class of fact, there is exactly one owner. All other documents reference that owner.

| Fact | Single owner | Referenced (link only) by |
|---|---|---|
| Endpoints, request/response, error shapes | `api/api-contract.md` | every feature document, `backend/conventions.md` |
| Database field-level truth | `prisma/schema.prisma` (code) | `architecture/data-model.md`, feature documents |
| Relationship, cascade, and indexing rationale | `architecture/data-model.md` | feature documents |
| Why an architectural decision was made | `architecture/decisions/` (ADRs) | architecture, backend, frontend, feature documents |
| Known architectural deviations / technical debt | `architecture/findings/` | the affected platform/feature documents (which link to the finding) |
| Authentication mechanisms (JWT, hashing, cookies, rate limiting) | `backend/security.md` | `features/authentication.md` |
| Redux / RTK Query mechanics | `frontend/state-and-data.md` | feature documents |
| Error normalization pipeline | `frontend/error-handling.md` | feature documents, `frontend/api-client.md` |
| Axios API client (clients, interceptors, retry, 401-refresh) | `frontend/api-client.md` | feature documents |
| Schema-driven form engine (validation, state, inference, SchemaField seam) | `frontend/forms.md` | feature documents |
| Design system (components, tokens, theme, typography) | `frontend/design-system.md` | feature documents, `frontend/forms.md` |
| Project history | Git history | `project/overview.md` (status only) |
| Planned/future work | Issue tracker (issues, milestones) | `project/overview.md` (link only) |

**Enforcement rule:** if writing a document requires copying more than a sentence from another document, stop and link instead. Copying authoritative content is a defect, not a convenience.

---

## 7. Documentation Migration Strategy

Existing documentation is consolidated into the single root under `docs/` through a phased, reviewed migration. The migration is governed by the following rules.

1. **Inventory before authoring.** No document in the target structure is finalized until every pre-existing document has an assigned fate.
2. **Every existing document receives exactly one fate:**
   - **Keep** — already authoritative and correctly located.
   - **Move** — authoritative content relocated, unchanged in substance, to its category under `docs/`.
   - **Merge** — content folded into the single owning document for its subject.
   - **Delete** — transient or superseded content removed, with its durable value preserved elsewhere (decisions → ADRs, history → Git, backlog/ideas → issue tracker).
3. **No information is lost on deletion.** A document may only be deleted after its durable content has an assigned home.
4. **Migration is phased and isolated.** Each migration step is performed on its own `docs/` branch, reviewed, and merged independently, consistent with the project's small-PR and single-logical-unit standards.
5. **One destination per subject.** Migration never produces two homes for the same fact; if two sources describe one subject, they are merged into the single owner.
6. **Order of migration** proceeds from lowest-risk to highest-risk: development and project documents first, then architecture and ADRs, then backend and frontend platform documents, then feature documents, ending with a verification pass for broken links and residual duplication.

The execution of individual moves, merges, and deletions occurs in subsequent documentation phases. This strategy defines the rules those phases follow; it does not itself move, merge, or delete any file.

---

## 8. ADR Policy

An **Architectural Decision Record (ADR)** captures *why* an architecture-level decision was made. ADRs are deliberately few.

### When to create an ADR
Create an ADR only when the decision meets the architectural bar — it has long-term architectural impact, is difficult or expensive to reverse, affects multiple parts of the system, and explains a choice rather than an implementation detail.

> The guiding test: **if, one year from now, someone is likely to ask "Why did we choose this approach?", the decision deserves an ADR.**

### When not to create an ADR
Do not create ADRs for routine implementation work, small refactors, naming changes, minor improvements, or temporary implementation details. These leave their trace in the code and Git history, not in an ADR.

### ADR rules
- **Location:** `architecture/decisions/`.
- **One decision per file.** Each ADR records a single decision.
- **Immutability:** an accepted ADR is never edited to change its decision. If a decision changes, a **new** ADR is written that supersedes the old one, and the old one is marked superseded with a link forward. The historical record is preserved.
- **Content:** the context that forced the decision, the decision itself, the alternatives considered, and the consequences (trade-offs accepted). ADRs explain *why*, not *how*.
- **Status:** each ADR carries a status of `Proposed`, `Accepted`, or `Superseded`.
- **Authority:** ADRs are the single owner of architectural rationale. Other documents link to ADRs rather than re-explaining a decision.

---

## 9. Architecture Findings Policy

An **architecture finding** records a discovered deviation from the intended architecture — technical debt, an architectural smell, or a design concern — so the knowledge is preserved without normalizing the problem into the design documentation. Findings describe *what is wrong and why*; they do not schedule the fix.

### When to create a finding
Create a finding when a review surfaces an architectural problem that deserves discussion before implementation, such as:

- a circular dependency or a layering violation,
- a single-responsibility or ownership-boundary violation,
- excessive coupling, or a duplicated / contradictory implementation,
- an inconsistency between the intended design and the actual code.

### When not to create a finding
- A **decision has been made** → that is an **ADR** (§8), not a finding.
- An **actionable task with no architectural dimension** (a routine bug or a feature request) → that is an **issue** in the tracker.
- A finding **never schedules work** and **never edits the intended-architecture documents**; instead, the affected document **links** to the finding so readers see the known deviation.

### Finding rules
- **Location:** `architecture/findings/`, a sibling of `architecture/decisions/`.
- **One finding per file.** Each records a single architectural concern.
- **Content:** the observation, concrete evidence (code references), the principle or boundary it violates, the affected areas, a status, and links to any motivating discussion and to the resolving ADR / issue / PR.
- **Status:** one of `Open`, `Acknowledged`, `Resolved`, or `Accepted` (consciously tolerated, with rationale).
- **Append-only.** A resolved finding is marked `Resolved` with a link to the ADR, PR, or commit that fixed it — it is not deleted. The register is the project's durable memory of architectural debt.

### Relationship to ADRs and issues
A finding is the *problem observed*; an ADR is the *decision made*; an issue is the *task to do it*. One finding may motivate an ADR and spawn one or more issues, and it links to both. This keeps intended-architecture documents clean: they describe the target design and point to findings for any current divergence.

---

## 10. Documentation Update Trigger Policy

Because most documents are thin and link-based, **most code changes require no documentation change.** Only the following triggers are mandatory. They are part of the pull-request checklist, and a pull request that meets a trigger without the corresponding documentation update is incomplete.

| Code change | Required documentation update |
|---|---|
| Add, change, or remove an endpoint, payload, or error shape | `api/api-contract.md` |
| Change a model's relationships, cascade behavior, or indexing | `architecture/data-model.md` |
| Make or reverse a significant architectural decision | new or superseding ADR in `architecture/decisions/` |
| Implement a feature's frontend (or backend) for the first time | add the corresponding section to that feature document |
| Change a shared mechanism (auth, errors, state/data layer, rate limiting, conventions) | the owning platform document |
| Pure refactor with no change to behavior, contract, or intent | none |

**Co-versioning rule:** a triggered documentation update is made in the **same pull request** as the code change that triggered it, so that documentation and code are reviewed and merged together.

---

## 11. Documentation Governance

1. **Compliance is mandatory.** All documentation contributions — by humans or AI assistants — must conform to this strategy. Reviewers reject documentation that violates it.
2. **The pull-request checklist enforces this strategy.** Before merge, a documentation change must confirm: it has a single authoritative home, it duplicates no other document, it links rather than copies, it documents only existing code, any triggered updates from §10 are included, and any current deviation from the intended architecture is recorded as a finding (§9) rather than written into the design documentation.
3. **Changing this strategy.** This document is itself governed: a material change to the documentation strategy is an architectural decision and requires an ADR plus the normal review and merge process. Routine clarifications follow the standard documentation pull-request flow.
4. **Language and form.** Documentation is written in English, in clear and concise prose, as durable reference material — not as meeting notes, proposals, or revision logs.
5. **Link integrity.** Cross-document links are part of the contract. A change that moves or renames a document must update the documents that link to it, and a verification pass confirms no broken links remain.
6. **Single entry point.** `docs/README.md` is the canonical map of the documentation set. Every document is reachable and classified from it, including any permitted code-adjacent usage README.
7. **Alignment with engineering principles.** This strategy applies the project's core engineering principles — single responsibility, one source of truth, and dependence on stable references over copies — to documentation. Documentation practice and engineering practice are held to the same standard.
