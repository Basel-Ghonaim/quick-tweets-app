# Documentation

This is the **map** of the project's documentation — every document, what it owns, and where to find it. It is navigation, not content: each document is the single authoritative home for its subject, and everything else links rather than repeats it. The rules that govern this set are the [Documentation Strategy](architecture/documentation-strategy.md)'s.

**New here?** Start with the [project overview](project/overview.md) for what the product is, then [local setup](development/setup.md) to run it.

## The map

### `project/` — what the product is
- [overview.md](project/overview.md) — product scope and current implementation status.
- [glossary.md](project/glossary.md) — the canonical project vocabulary.

### `architecture/` — how the system fits together, and how the docs are governed
- [documentation-strategy.md](architecture/documentation-strategy.md) — the documentation constitution: ownership, structure, and the rules every document follows.
- [system-overview.md](architecture/system-overview.md) — topology and the end-to-end request lifecycle across frontend, backend, and database.
- [data-model.md](architecture/data-model.md) — schema rationale: entities, relationships, cascade, and indexing.
- [decisions/](architecture/decisions/) — Architectural Decision Records: [0001](architecture/decisions/0001-constitutional-architecture-reconciliation.md) (constitutional reconciliation), [0002](architecture/decisions/0002-refined-adr-threshold.md) (the refined ADR threshold), [0003](architecture/decisions/0003-cross-tier-shared-facts-leaf-packages.md) (cross-tier shared-fact leaf packages, *superseded by 0013*), [0004](architecture/decisions/0004-stable-core-platform-document-rule.md) (the Stable-Core platform-document rule), [0005](architecture/decisions/0005-media-file-upload-architecture.md) (media / file-upload architecture), [0006](architecture/decisions/0006-execution-plans-home-and-lifecycle.md) (execution-plans home and lifecycle), [0007](architecture/decisions/0007-pre-auth-ingest-upload-grant-model.md) (pre-auth ingest — the upload-grant model, *superseded by 0008*), [0008](architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) (auth-first onboarding, retiring the upload grant), [0009](architecture/decisions/0009-channel-verification-platform-capability.md) (channel verification — a platform capability owning proof of control over a communication channel), [0010](architecture/decisions/0010-design-system-platform-reestablishment.md) (design-system re-establishment — a platform owning the product's presentation language, *Decision 3 amended by 0011*), [0011](architecture/decisions/0011-intent-layer-earned-not-assumed.md) (the intent layer is earned, not assumed — tiering by role rather than by token type), [0012](architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) (a Foundation contract documented independently of consumer adoption), [0013](architecture/decisions/0013-applications-and-cross-tier-packages.md) (applications and a cross-tier packages layer in a single workspace, *supersedes 0003*).
- [findings/](architecture/findings/) — recorded deviations from the intended architecture: [0001](architecture/findings/0001-schema-form-design-system-cycle.md) (schema-form ↔ design-system cycle), [0002](architecture/findings/0002-modules-app-store-dependency.md) (modules → app-store dependency), [0003](architecture/findings/0003-feed-index-vs-id-ordering.md) (feed ordering vs the `createdAt` index), [0004](architecture/findings/0004-logout-error-state-unreachable.md) (logout error state unreachable), [0005](architecture/findings/0005-declared-unimplemented-field-types.md) (declared-but-unimplemented field types), [0006](architecture/findings/0006-refresh-logout-token-rotation-race.md) (logout vs refresh token-rotation race), [0007](architecture/findings/0007-grant-access-token-shared-secret.md) (upload-grant / access-token shared signing key), [0008](architecture/findings/0008-role-fill-hover-boundary-contrast-dark.md) (role fill hover boundary contrast in the dark theme), [0009](architecture/findings/0009-checker-blind-to-hardcoded-literals.md) (token-reference checker blind to hardcoded literals), [0010](architecture/findings/0010-avatar-placeholder-text-contrast.md) (avatar placeholder text below AA through a compounding opacity), [0011](architecture/findings/0011-breakpoint-tokens-unconsumable-mechanism.md) (breakpoint tokens unusable in a media query), [0012](architecture/findings/0012-no-shared-stacking-concept.md) (no shared stacking concept for a z-index scale to name).

### `api/` — the contract between frontend and backend
- [api-contract.md](api/api-contract.md) — the single source for endpoints, payloads, error shapes, and pagination.

### `backend/` — server platform mechanisms
- [conventions.md](backend/conventions.md) — module layering, the response envelope, the error model, validation, and pagination.
- [security.md](backend/security.md) — the token model, password hashing, the auth cookie, rate limiting, and HTTP hardening.
- [media.md](backend/media.md) — the Media subsystem: the storage-adapter port, the registry/reference model, ingest and content-authoritative validation, read/resolution, ownership/attach/reference coordination, and the reclamation lifecycle.

### `frontend/` — client platform subsystems
- [architecture.md](frontend/architecture.md) — the feature-sliced zones, the dependency rule, the composition root, and the thin utilities.
- [api-client.md](frontend/api-client.md) — the transport layer (Axios + RTK Query base), token attachment, and the refresh flow.
- [error-handling.md](frontend/error-handling.md) — the `AppError` normalization pipeline.
- [forms.md](frontend/forms.md) — the schema-driven form engine.
- [design-system/](frontend/design-system/README.md) — the Design System: its boundary and ownership model, the [Foundation contract](frontend/design-system/foundation.md), and the [component-authoring contract](frontend/design-system/components.md). Its code-adjacent map at `src/shared/design-system/README.md` is the designated index for documentation living beside the layer's code (Strategy §11.6).
- `state-and-data.md` — the RTK Query cache/data layer. **Deferred** until that layer is realized in code (its interim source is `src/docs/rtk-query-strategy.md`).

### `features/` — one document per capability
- [authentication.md](features/authentication.md) — the authentication feature: its flows and how it composes the platform.

### `development/` — how to run the project and how the team works
- [agent-onboarding.md](development/agent-onboarding.md) — the on-ramp for an agent or contributor joining the project: reading order, decision authority in practice, the mistakes newcomers make, and the self-review bar. Points at the rules; never restates them.
- [setup.md](development/setup.md) — running the project locally.
- [engineering-principles.md](development/engineering-principles.md) — code-design principles (SOLID, data/architectural patterns, naming).
- [engineering-execution-standard.md](development/engineering-execution-standard.md) — how work is executed: the Git lifecycle, scope control, review, and decision authority.
- [verification/](development/verification/) — the manual verification harness (Postman collection + pgAdmin checkpoints) for the Media subsystem and core flows; see its [README](development/verification/README.md).

### `plans/` — execution-oriented plans
- [plans/](plans/) — migration, execution, refactoring, and release plans: a lifecycle-governed artifact class (`Draft → Active → Historical`), separate from the permanent reference docs, each enumerated in the directory's Plan Index. Includes the historical [documentation-migration-plan.md](plans/documentation-migration-plan.md) that consolidated the earlier scattered docs into this set. See [ADR 0006](architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

## The constitution

A small set of documents governs everything else: [CLAUDE.md](../CLAUDE.md) (the AI bootstrap), the [Documentation Strategy](architecture/documentation-strategy.md), the [Engineering Principles](development/engineering-principles.md), and the [Engineering Execution Standard](development/engineering-execution-standard.md). A change to one of them is judged by the same ADR threshold as any other change; being constitutional raises the review, not the artifact ([Documentation Strategy §11.3](architecture/documentation-strategy.md)).

## How to read this set

- **One owner per fact.** If a topic seems missing from a document, it is owned elsewhere and linked — follow the link.
- **Code is the source of truth** for what the system actually does; the documents describe the *intended* architecture and the *why*. Current divergences are recorded in `findings/`.
