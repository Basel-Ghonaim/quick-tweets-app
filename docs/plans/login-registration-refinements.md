# Login & Registration Refinements — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-07-29
> **Parent Issue:** [#384](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/384)
> **Supersedes:** —

This plan sequences the settled **Login & Registration refinements** into five independently reviewable Work Items. The product and architecture decisions behind them are **closed** (recorded through prior analysis passes); this plan owns their **execution order, boundaries, and invariants**, and never reopens them.

It is a **strategy document**: it owns each Work Item's strategic definition (goal, scope, non-goals, dependencies, invariants, verification strategy, Definition-of-Done summary, and stop-risks). Each Work Item's **granular acceptance criteria, live status, and progress belong to its Issue** (created when that Work Item begins), which this plan links and never mirrors — per [Documentation Strategy §5](../architecture/documentation-strategy.md) and [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

## 1. Purpose & goals

- Make registration **transactionally correct** — never persist an account without its required initial refresh session; a concurrent duplicate resolves to one account + `409`, never `500`.
- Establish a **lowercase-only username** invariant (backend + frontend validation), reconciling disposable dev/test data.
- Let login accept a **neutral `identifier`** (username **or** email) while preserving the generic `401`.
- Consolidate the current-user surface: **retire `/auth/me`**, make **`/users/me` the canonical current-user resource**, and make Auth responses **Profile-free** (`{ id, username }` + token).
- Remove **`name`** from Register and make it **truthful optional profile data** (absent = `NULL`; `username` is a read-side fallback only).

## 2. Boundary declaration

**Covers:** the five Work Items below — backend logic plus the affected frontend logic, validation, state, mappers, DTOs, tests, and API/contract documentation.

**Does not cover (out of scope; unchanged):** Account/User deletion (and its `uploader_id` `Restrict` interaction); `profileImage` cleanup (its own existing concern); date-of-birth; Terms/Privacy persistence; password reset; the authenticated-application / onboarding **UI and screens**; and any unrelated deferred Issue.

## 3. Pinned constraints (binding on every Work Item)

1. **Sequential execution.** Each Work Item is reviewed and **merged into a stable `main` before the next begins.** No parallel branches, even where technically parallelizable (D and B).
2. **Co-versioning.** Any Work Item that changes an API/contract co-versions **all** affected backend + frontend logic, validation, state, mappers, DTOs, tests, and contract docs **within that same Work Item.** What remains deferred is onboarding/app **UI/screens** — not the frontend **logic** these changes touch.
3. **B — disposable data.** Existing uppercase usernames are **disposable dev/test verification data**: reset/reseed them. **No** production-compatibility machinery, grandfathering, or complex migration to preserve them. The resulting invariant is lowercase-only stored usernames, enforced by backend + frontend validation; uppercase input is **rejected, never silently normalized.**
4. **A — truthful absence.** `name` has **no default** and is **never populated or derived from `username`.** Absent is represented truthfully as `NULL`. `username` is the **presentation (read-side) fallback only** when `name === null`; it must not mutate or persist `name`.
5. **Separateness.** The five Work Items stay separate unless formal-planning evidence proves a boundary cannot be preserved safely. **C and A are not combined for convenience.**

## 4. Strategy & sequencing

**Order:** **D → B → E → C → A** (sequential; merge-to-stable-`main` between each).

**Dependency graph:**

```
D  (register correctness, foundation)
      └─▶ C (register/auth response contract)  ──▶ A (register field + name nullable)
B  (username lowercase + data)  ──▶ E (login identifier)

Serialization edges (shared files — not new dependencies):
  E ⋯ C   both edit auth.controller / the login handler → must not run concurrently
  B ⋯ A   both edit registerSchema → satisfied by B landing before A
```

- **D → C, D → A** *(hard):* register must be transactionally correct before its request/response contract is reshaped.
- **B → E** *(hard):* the lowercasing resolver would strand existing uppercase accounts unless stored usernames are already lowercase.
- **C → A** *(efficiency):* C minimizes the Auth response first, so A never re-touches it (no DTO rework).

## 5. Execution structure

Each Work Item is a separate, atomic unit with its own Issue and PR. The sections below define each one strategically; the granular acceptance criteria and status live in the Issue.

### WI-D — Register Transaction Correctness — [#385](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/385)
- **Goal & rationale:** registration must never persist an account without its required initial refresh session, and a concurrent duplicate must yield one account + `409`, never `500`. This is the correctness foundation that must precede any reshaping of the register contract.
- **Scope:** wrap `{ User INSERT + refresh-session INSERT }` in the existing `runInTransaction`; add an optional transaction-`client` parameter to `createRefreshToken` (mirroring the auth repository's `create`); catch `P2002` via the existing `isPrismaError` (code-only) and **attribute the field by re-querying** username/email → the specific `409` (fallback: a combined conflict message). `bcrypt` hashing and refresh-value generation run **before** the transaction; access-token signing and response construction run **after** commit.
- **Non-goals:** no API-contract change (request/response unchanged); no `error.meta.target` parsing; no refresh-token-at-rest hashing; no login/refresh changes (already atomic).
- **Dependencies:** none (first).
- **Impact:** backend only (auth service, auth repository, auth types). No frontend, schema, API-contract, or docs change — behaviour-preserving; the race's `500 → 409` is a bugfix within the existing contract.
- **Invariants:** (1) no committed account without its refresh session; (2) the two writes are one atomic unit; (3) concurrent duplicate → one `201` + one `409`, never `500`; (4) DB unique constraints authoritative, pre-checks advisory; (5) `bcrypt` before the transaction; (6) access-token signing after commit is non-failing under validated startup config (the signing secret is validated at boot), and a post-commit signing failure leaves a valid, usable account.
- **Migration/data:** none.
- **Verification strategy:** unit — happy path unchanged; injected refresh-insert failure → no account persisted; `P2002` on create → attributed `409`. Integration (real Postgres) — two parallel same-identity registrations → exactly one `201` + one `409`.
- **Definition of Done (summary):** the two writes are atomic via `runInTransaction`; `createRefreshToken` accepts a client; `P2002 → 409` via re-query attribution; hashing before / signing after; the tests above green; zero contract/frontend/schema/doc change.
- **Commit/PR boundary:** one PR; commits ≈ (1) `createRefreshToken` client parameter, (2) transactional register + `P2002` handling, (3) tests.
- **Stop-risks:** if `P2002` is not reliably raised/observable for the account's unique constraints under the configured Prisma adapter → **stop** and reconsider the race contract. If `runInTransaction` cannot span both repository calls with the passed client → **stop**.

### WI-B — Lowercase-only Username Invariant + dev/test-data reconciliation — [#388](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/388)
- **Goal & rationale:** stored usernames are lowercase-only, enforced by backend + frontend validation; disposable uppercase dev/test rows are reconciled. Establishes the invariant WI-E's resolver relies on (uppercase usernames exist in dev data).
- **Scope:** backend register username pattern `^[a-zA-Z0-9_]+$` → `^[a-z0-9_]+$` (reject uppercase; **never** lowercase silently); the corresponding frontend username validation rule + message; **reset/reseed** the disposable uppercase dev/test rows (and any seed script) to lowercase.
- **Non-goals:** no production-compatibility/grandfathering/complex migration; no silent normalization of uppercase input; no DB schema/constraint change; no login change.
- **Dependencies:** none code-wise; sequenced after D. **Blocks E.**
- **Impact:** backend (auth validator) + frontend (username rule + message) co-versioned; disposable dev/test data reset; the API contract's username-constraint note (and any doc that states the charset). No schema change — the DB unique remains case-sensitive, and since all inputs are now lowercase no case-variant duplicates can arise.
- **Invariants:** stored usernames match `^[a-z0-9_]{4,20}$`; uppercase input → `400`, never normalized; no uppercase usernames remain in dev/test data.
- **Migration/data:** dev/test-data reconciliation only (reset/reseed) — explicitly **disposable**, not a production migration; no collision handling needed.
- **Verification strategy:** backend + frontend validator tests (uppercase rejected, lowercase accepted); a check that no fixture/seed uses uppercase; integration register-with-uppercase → `400`.
- **Definition of Done (summary):** both sides enforce `^[a-z0-9_]+$`; uppercase rejected not normalized; dev/test data lowercase-only; contract note updated; tests green.
- **Commit/PR boundary:** one PR (backend pattern + frontend rule + data reset + contract note).
- **Stop-risks:** if any **non-disposable** consumer depends on an uppercase username (none found in analysis) → **stop**. Confirm disposability before reset (pinned as disposable).

### WI-E — Login by neutral identifier
- **Goal & rationale:** login accepts `{ identifier, password }` where identifier is username **or** email; the generic `401` is preserved. Single-input UX; safe only on WI-B's lowercase usernames.
- **Scope:** backend login schema `{ username }` → `{ identifier }` (presence-only); the login input type; the login resolver — trim + lowercase the identifier, branch on `@` (→ email lookup / username lookup), generic `401` on no-match or bad password; the login controller. Frontend — the login field `username` → `identifier` (label "Username or email"), the login mapper, the login DTO, the login form schema (presence-only), and tests. The API contract's login request.
- **Non-goals:** no register / `/me` / response-shape changes; no account-creation validation applied at login (stays forgiving/presence-only); no new repository method (reuse the existing username/email lookups); no change to the enumeration/`401` behaviour.
- **Dependencies:** **B** (lowercase data + username contract).
- **Impact:** backend (auth validator, auth types, auth service, auth controller) + frontend (login form, mapper, DTO, form schema, tests) co-versioned + the API contract's login section. No schema change.
- **Invariants:** an identifier containing `@` → email lookup (lowercased); otherwise username lookup (lowercased); an unmatched identifier or wrong password → generic `401` (no username/email disclosure); presence-only validation at login.
- **Migration/data:** none.
- **Verification strategy:** unit — resolver branches (username / email / unknown / wrong-password / mixed-case email); the frontend submits `{ identifier }`. Integration — login by username **and** by email both succeed for a seeded user; generic `401` on bad credentials.
- **Definition of Done (summary):** the `{ identifier }` contract is live backend + frontend; the resolver is correct; the generic `401` is preserved; tests green; the contract is updated.
- **Commit/PR boundary:** one PR (backend resolver + frontend login + contract).
- **Stop-risks:** if any frontend consumer of the login `username` field exists beyond the form/mapper (analysis found none) → co-version or **stop**.

### WI-C — Retire `/auth/me`, canonicalize `/users/me`, minimize Auth responses
- **Goal & rationale:** one canonical current-user resource (`/users/me`); Auth returns only the session + minimal identity `{ id, username }`; `/auth/me` is retired (it returns only User-owned state and weakens the Profile-free Auth boundary — we would not introduce it today); `email` is added to the `/users/me` self-view.
- **Scope:** backend — retire `GET /auth/me` (route, controller handler, service method, its result type, its test); minimize the register/login/refresh response to `{ id, username }`; add `email` to the `/users/me` **self** view (the public profile view still excludes it); update the auth result types. Frontend — the auth slice/state holds `{ id, username }`, and the login/register/restore flow **fetches `/users/me`** to hydrate the profile; update the auth-response DTO, mapper, session-restore logic, and tests. Docs — the API contract (retire `/auth/me`; the new auth-response shape; the `/users/me` self `email`) and the authentication feature document.
- **Non-goals:** no onboarding/profile UI (fetch **logic** only); no register-field change (that is WI-A); no public-profile email exposure; no login-request change (that is WI-E).
- **Dependencies:** **D** (the register response is part of the register contract); serialize **after E** (shared login handler).
- **Impact:** backend (auth controller, routes, service, types; user service + DTO) + frontend (auth slice, DTO, mapper, session restore, login/register flow, tests) + the API contract + the authentication feature document. No schema change.
- **Invariants:** exactly one current-user endpoint (`/users/me`); Auth responses carry only `{ token, { id, username } }` (no name/bio/profileImage/email); the `/users/me` self-view includes `email`, the public view excludes it; session restore = refresh (token) + `/users/me` (profile).
- **Migration/data:** none.
- **Verification strategy:** backend — auth responses are `{ id, username }`; `/users/me` self has `email`, public does not; `/auth/me` → `404`. Frontend — after login/restore the slice holds `{ id, username }` and hydrates from `/users/me`; DTO/mapper/restore tests.
- **Definition of Done (summary):** `/auth/me` retired; auth responses minimized; `/users/me` canonical + self `email`; the frontend hydrates via `/users/me`; tests green; the API contract + authentication document co-versioned.
- **Commit/PR boundary:** one PR; commits ≈ backend (retire + minimize + self-email), frontend (slice + `/users/me` fetch + DTO/mapper), docs.
- **Stop-risks:** if any consumer beyond the analysis depends on `/auth/me` or on profile fields in the auth response → co-version or **stop**. The frontend hydration is the riskiest logic change and must be fully co-versioned + tested within this Work Item.

### WI-A — Remove `name` from Register; `name` as truthful optional profile data
- **Goal & rationale:** Register is `{ username, email, password }`; `name` is optional profile data, absent = `NULL`, never defaulted or derived from `username`; the `username` fallback is read-side only.
- **Scope:** backend — drop `name` from the register schema, register input, and create-user data, and from the register service + repository create; make the schema's `User.name` **nullable** (a `DROP NOT NULL` migration); make `name` `string | null` in the user-profile response and in the tweet/comment **author projections** + their DTOs; allow the profile-update schema to accept `name: null` to **clear** it. Frontend — the register form drops the `name` field; author/display types make `name` nullable with the **username read-side fallback**; DTOs/mapper/tests. Docs — the API contract (register drops `name`; author embeds + user response `name` nullable; profile-update `name: null`), the data-model document (`User.name` nullable), and the authentication document.
- **Non-goals:** no name default or derivation from `username`; no persisted fallback; no re-coupling of profile to register; the presentation fallback is read-side only (no UI built).
- **Dependencies:** **D** (correctness before the register-contract change), **C** (Auth response already minimized — no response rework; shared profile builder), B/E settled (register schema).
- **Impact:** backend (auth validator, auth types, auth service, auth repository, **schema + migration**, user service + DTO, tweet/comment projections + DTOs, user validator) + frontend (register form, DTO/types, mapper, tests) + the API contract + the data-model document + the authentication document.
- **Invariants:** `User.name` is nullable; register never sets `name`; `name` is never defaulted or derived from `username`; absent = `NULL`; `username` is a read-side fallback only (never mutates/persists `name`); the profile-update endpoint can set/update/**clear (`null`)** `name`.
- **Migration/data:** `ALTER COLUMN name DROP NOT NULL` — a **safe widening** on the populated DB (existing values preserved, no backfill; new registers insert `NULL`). Use the project's established migration approach (a hand-authored `migration.sql` if `migrate dev` is interactive, as prior Work Items did).
- **Verification strategy:** backend — register without `name` → `name = NULL`; a sent `name` is not persisted; the user response + author embed return `name: null`; the profile-update sets/updates/clears `name`. Frontend — the register form has no `name`; display falls back to `username` when `name === null` (logic/type test). Integration — register (no name) → `name IS NULL`; the migration on the populated DB preserves existing names.
- **Definition of Done (summary):** `name` removed from register (backend + frontend); `User.name` nullable (migration applied); never defaulted/derived; nullable across the user response + author embeds + DTOs; profile-update `name: null` clears it; the read-side fallback documented; tests green; the API contract + data-model + authentication document co-versioned.
- **Commit/PR boundary:** one PR; commits ≈ schema + migration, backend (drop name + nullable DTOs/projections + profile-update `name: null`), frontend (register form + types), docs.
- **Stop-risks:** if any backend path assumes `name` non-null in a way that would fault on `null` → find and handle before shipping. If the `name`-nullable migration is not a clean widening on the actual DB → **stop**. If the frontend still sends `name` (a silent strip → silent data loss) → prevented by co-versioning the register form within this Work Item.

## 6. Risks & mitigations (effort-wide)

- **Serialize E and C** — both edit the login handler; running them concurrently risks a broken login path. Mitigation: the sequential order (E before C).
- **B before E is load-bearing** — reconcile the disposable uppercase data in B; otherwise E's lowercasing resolver strands those accounts.
- **C's frontend hydration** is the single riskiest logic change; it must be complete and tested within C, so no half-migrated session state reaches `main`.
- **A's silent-strip hazard** — the request validator drops unknown keys, so a stale register form would silently discard `name`; the register-form change must land in A.
- **Contract-doc drift** — every Work Item touching a contract updates the API contract (and the data-model / authentication documents where owned) in the same PR (co-versioning).
- **No out-of-scope creep** — account deletion, `profileImage`, DOB, Terms/Privacy, password reset, and app UI stay out; discoveries are surfaced, not absorbed.

## 7. Completion criteria (whole effort)

- All five Work Items merged to `main`, each green (typecheck + unit + integration), each leaving a consistent backend/frontend/contract state.
- Register is transactional (no orphan; race → `409`); usernames are lowercase-only (backend + frontend, data reconciled); login accepts `{ identifier }` with a generic `401`; `/auth/me` is retired and `/users/me` is canonical (self `email`) with Auth responses minimized and the frontend hydrating via `/users/me`; `name` is removed from register and truthfully optional (nullable, never derived, clearable, read-side fallback).
- All API/contract changes are co-versioned across backend, frontend logic, and docs; the API contract, data-model, and authentication documents are consistent.
- The frontend **UI/screens remain deferred** — only logic, validation, state, mappers, and tests changed.
- No out-of-scope item was pulled in.

## 8. Reconciliation

*Added as this plan approaches `Historical`: where each Work Item's durable facts landed in the permanent documents, which findings were recorded, and the forward links.*
