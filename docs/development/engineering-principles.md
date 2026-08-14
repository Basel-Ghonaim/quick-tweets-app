# Engineering Principles

> **Status:** Active standard.
> **Authority:** The authoritative source for the project's **code-design principles** — the patterns and rules that define what good code looks like here. Binding on all contributors, human and AI.
> **Scope:** Owns *principles* (the timeless "why" and "what good looks like"). It does **not** own *mechanisms* (the current "how"), which live in the relevant platform, security, and contract documents, nor *process* (Git, commits, reviews), which lives in the Engineering Execution Standard.
> **Version:** 1.2
> **Last Updated:** 2026-08-14
> **Owner:** Basel Ghonaim

## How to read this document

- A **principle** states intent and changes rarely. A **mechanism** is the current implementation of a principle; mechanisms are owned by their platform, security, or contract documents and are referenced here, never restated.
- **Code is the source of truth** for actual behavior. These principles describe the *intended* design. Where the code diverges, the deviation is recorded as an architecture finding — not silently written into this document as if it were intentional.
- Principles are phrased as checkable rules, so a reviewer can apply them.
- **These principles are defaults, not laws.** Engineering is the art of trade-offs: follow the default direction unless the benefits of deviating clearly outweigh the costs — and then deviate *intentionally* and justified, recorded as a finding or decision when the deviation is architectural. A deviation is never silent.

## 1. Engineering Mindset

The philosophy the specific principles below serve. When a rule is unclear or in tension, these are the tie-breakers.

- **Prefer simplicity over cleverness.** The simplest design that fully solves the problem wins; clever code that is hard to read is a liability, not an achievement.
- **Optimize for maintainability.** Code is read far more often than it is written — optimize for the next person (or AI) who has to change it, not for keystrokes today.
- **Favor explicitness over magic.** Prefer obvious code over implicit behavior; if a reader has to guess how something works, make it visible.
- **Design for change, not just today's implementation.** Put seams where requirements are likely to move; do not hard-code assumptions you already expect to break.

## 2. SOLID

The five SOLID principles are the foundation of every design decision, frontend and backend alike.

- **Single Responsibility** — every file, function, and module has one reason to change. If a unit does two things, split it.
- **Open/Closed** — prefer extending behavior by adding new units over editing existing ones. Adding `else if` branches to a stable function is the smell; reach for a map, a strategy, or a new file.
- **Liskov Substitution** — any implementation of an interface is swappable for another without the consumer knowing. Code that depends on an interface must work with any conforming implementation (e.g., swapping one `Repository` implementation for another behind the same interface).
- **Interface Segregation** — expose only what a consumer needs. A unit must not depend on props, methods, or fields it does not use.
- **Dependency Inversion** — high-level logic depends on abstractions, not concretions. Business logic never imports infrastructure (HTTP clients, ORM, storage) directly; it depends on an interface that infrastructure fulfills.

## 3. Architecture & Dependencies

- **Layered modules, dependencies inward.** Each feature module is internally layered, and a layer talks only to the layer beneath it. A component never imports a repository; a controller never imports the database client.
- **Acyclic dependencies.** Dependencies point one way: a consumer depends on its dependency, never the reverse, and never in a cycle. If two units import each other, a responsibility is misplaced — extract the shared piece or invert the dependency. Cycles are recorded as architecture findings, not tolerated silently.
- **Platform vs. feature.** Shared, domain-agnostic mechanisms are *platform*; a feature *composes* platform mechanisms rather than reimplementing or absorbing them. A feature depends on the platform; the platform never depends on a feature. This is the code-architecture counterpart of the Documentation Strategy's platform-vs-feature ownership model.

## 4. Data & Error Handling

- **DTO / Entity / Mapper.** A **DTO** is the exact shape on the wire; an **Entity** is the domain model used inside the app; a **Mapper** is a pure function that converts between them. Domain logic depends on the Entity, never the wire shape — so a contract change touches only the Mapper.
- **Repository.** Data access sits behind an interface; concrete implementations (Prisma, Axios, …) fulfill it, and business logic depends on the interface.
- **One typed error shape.** Every error, from any source, is normalized to a single typed shape before it reaches business logic or the UI. The principle lives here; the error taxonomy and the normalization pipeline are owned by the [API contract](../api/api-contract.md) and the [frontend error handling](../frontend/error-handling.md) document.

## 5. Cross-cutting Patterns

- **Factory functions for construction.** Instances are created by factory functions with injectable dependencies (default parameters), not by `new` on classes — enabling dependency injection and test doubles.
- **Cross-cutting concerns in one place.** Authentication, logging, and error handling are handled once at the boundary (frontend interceptors / backend middleware), not repeated per call. The specific interceptors and middleware are owned by their platform documents.
- **Model request state as a finite state, not scattered booleans.** Server-request status is `idle → loading → success | error`. The shared implementation is owned by the frontend state-and-data document.
- **Encapsulate the public surface with barrels.** Each directory exposes its public API through an `index.ts`; consumers import from the barrel, never from internal paths.

## 6. TypeScript Conventions

- **Infer, don't restate.** Use generics and conditional types to derive runtime types from configuration rather than maintaining parallel declarations.
- **`satisfies` over annotation** when you need to validate a shape without widening it.
- **Discriminated payloads.** Result and error types are narrowed by a discriminant, so consumers receive exact shapes rather than loose ones.

## 7. Security Principles

Principles only — concrete mechanisms (token model, password hashing, rate limiting, security headers) are owned by the backend security document.

- **Validate at the boundary.** Untrusted input is validated and typed before it reaches business logic.
- **Never trust the client.** The server re-checks everything the client asserts — authorization, ownership, limits. Client-side checks are UX, not security.
- **Defense in depth.** Independent layers (validation, guards, database constraints) each enforce safety, so a single gap is not fatal.
- **Least privilege.** Code and tokens receive the narrowest access that works.
- **No secrets on the client.** Secrets and long-lived credentials never live in client-readable storage or response bodies.

## 8. Testing Principles

- **Test behavior, not implementation.** Assert observable outcomes, so refactors do not break tests.
- **Design for testability.** Pure functions and dependency injection make logic testable without infrastructure. A unit that is hard to test usually has a design problem.

## 9. Performance Principles

Principles only — query and pagination mechanics are owned by the backend conventions and data-model documents.

- **Bounded queries.** Paginate unbounded lists; never load an entire growing table.
- **Avoid N+1.** Fetch related data in one query (joins / includes), not in a loop.
- **Parallelize independent work; serialize only true dependencies.**

## 10. Accessibility Principles

Principle only — component-level details are owned by the [component-authoring contract](../frontend/design-system/components.md).

- **Accessible by default.** Use semantic HTML, label every control, expose state through ARIA, and ensure full keyboard operability. Accessibility is a requirement, not an enhancement.

## 11. Naming Conventions (code)

| Item | Convention | Example |
|---|---|---|
| Files | camelCase | `authMapper.ts` |
| Components | PascalCase | `LoginForm.tsx` |
| CSS modules | `ComponentName.module.css` | `FileInput.module.css` |
| Interfaces | PascalCase (`I`-prefix for backend repositories) | `AuthRepository`, `IUserRepository` |
| Types | PascalCase | `LoginCredentials` |
| Constants | UPPER_SNAKE_CASE | `VALIDATION_MESSAGES` |
| Backend routes | kebab-case | `/auth/login` |
| DB tables / columns | snake_case (mapped by the ORM) | `users`, `profile_image` |

Branch and commit naming are *process* conventions, owned by the Engineering Execution Standard — not this document.

## 12. Comments

> **Source comments are for durable reasoning, not code narration or development history.**

Comments preserve knowledge the code itself cannot express. Prefer clear naming, expressive types, and good responsibility boundaries over comments that explain the code; before adding one, ask whether a safe local naming or structure change would remove the need for it — without expanding the current task's scope.

- **Explain *why*, not *what*.** Do not restate a line, type, interface, or function that already reads clearly; a well-named declaration needs no paragraph re-describing what TypeScript already says.
- **As long as its reason, and no longer.** A block that recounts a decision, its history, and the alternatives weighed has moved documentation into the source, where it will drift and where no one owns it. Give the reason in a sentence or two and point to the owner for the rest.
- **A comment earns its place** when it preserves reasoning the code cannot show: an architectural rationale, an invariant, a security/safety or concurrency constraint, a non-obvious ordering, a real workaround and why it exists, an external constraint, or intentional behavior that would otherwise look wrong.
- **No development provenance.** Source comments — **and test descriptions/docstrings** — must not record where a change came from: no Issue/PR numbers, branch names, work-item labels (`WI-C`), development milestones (`M9`), or execution-plan steps. That history belongs in Git commits, PRs, Issues, and Execution Plans, which are its **correct home** — a commit message *should* cite the work item that a source comment must not.
- **Durable pointers are permitted — and differ from provenance.** A comment may point to where a lasting constraint or decision lives: an ADR, a recorded architecture **Finding**, or the owning document (`see ADR 0005`, `Finding 0002`). The test is *purpose*: a stable pointer to a durable artifact is fine; "this came from WI-C / PR #392" is not. Prefer pointing to durable documentation over copying it into the source.
- **Domain identifiers are not milestones.** A label that is part of the model's own vocabulary — e.g. a reclamation oracle's fixtures `O1`, `M1`, `M3` — is legitimate; the prohibition is on *development-milestone* references, not on identifiers that merely resemble one.
- **No speculation or roadmaps.** Do not narrate planned or future work in source comments (`Future expansion:`, "later we will…", "TODO when M9 lands"). Document only what exists; planned work belongs in the issue tracker.
- **File headers are optional and short.** One or two lines when a file's responsibility or boundary is not obvious from its name and structure — never a header that merely restates the filename.
- **The time test.** If a developer two years from now, with no knowledge of the task that produced it, would not find the comment useful and correct, it does not belong in the source.

The goal is signal-to-noise, not a minimum count: keep every comment a reader genuinely needs for correctness or safety, and drop every comment that only narrates.

**Apply this incrementally (Boy Scout), never as a campaign.** When a task legitimately touches a file, it may leave that area slightly cleaner — removing or shortening a redundant or stale comment only when doing so is obvious and safe, changes no behavior/contract/architecture, and does not expand the task's scope. A comment whose historical significance is unclear is recorded for review, not deleted by guessing; a broader comment-quality problem is recorded as a finding, not pursued in-task.

---

> These principles describe the project's intended design. Mechanisms (the current "how") and process (Git, reviews) live in their own authoritative documents and are referenced here, never duplicated.
