# Login & Registration Refinements — Execution Plan

> **Status:** Historical
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-31
> **Parent Issue:** [#384](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/384)
> **Supersedes:** —
> **Archived (completed, 2026-08-31):** all six Work Items merged. The durable facts now live with their owners — endpoints and error shapes in the [API contract](../api/api-contract.md), the alias and uniqueness model in the [data model](../architecture/data-model.md) and `schema.prisma`, and the session and identity rules in [Authentication](../features/authentication/authentication.md) (§8).

This plan sequences the settled **Login & Registration refinements** into six independently reviewable Work Items. The product and architecture decisions behind them are **closed** (recorded through prior analysis passes); this plan owns their **execution order, boundaries, and invariants**, and never reopens them.

It is a **strategy document**: it owns each Work Item's strategic definition (goal, scope, non-goals, dependencies, invariants, verification strategy, Definition-of-Done summary, and stop-risks). Each Work Item's **granular acceptance criteria, live status, and progress belong to its Issue** (created when that Work Item begins), which this plan links and never mirrors — per [Documentation Strategy §5](../architecture/documentation-strategy.md) and [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

## 1. Purpose & goals

- Make registration **transactionally correct** — never persist an account without its required initial refresh session; a concurrent duplicate resolves to one account + `409`, never `500`.
- Establish a **lowercase-only username** invariant (backend + frontend validation), reconciling disposable dev/test data.
- Let login accept a **neutral `identifier`** (username **or** email) while preserving the generic `401`.
- Consolidate the current-user surface: **retire `/auth/me`**, make **`/users/me` the canonical current-user resource**, and make Auth responses **Profile-free** (`{ id, username }` + token).
- Remove **`name`** from Register and make it **truthful optional profile data** (absent = `NULL`; `username` is a read-side fallback only).
- Let a user **change their own `username`** (self-service handle change) with immediate authenticated-identity consistency, stable historical URLs (alias + reservation + redirect), and a single shared validation rule.

## 2. Boundary declaration

**Covers:** the six Work Items below — backend logic plus the affected frontend logic, validation, state, mappers, DTOs, tests, and API/contract documentation.

**Does not cover (out of scope; unchanged):** Account/User deletion (and its `uploader_id` `Restrict` interaction); `profileImage` cleanup (its own existing concern); date-of-birth; Terms/Privacy persistence; password reset; the authenticated-application / onboarding **UI and screens**; and any unrelated deferred Issue.

## 3. Pinned constraints (binding on every Work Item)

1. **Sequential execution.** Each Work Item is reviewed and **merged into a stable `main` before the next begins.** No parallel branches, even where technically parallelizable (D and B).
2. **Co-versioning.** Any Work Item that changes an API/contract co-versions **all** affected backend + frontend logic, validation, state, mappers, DTOs, tests, and contract docs **within that same Work Item.** What remains deferred is onboarding/app **UI/screens** — not the frontend **logic** these changes touch.
3. **B — disposable data.** Existing uppercase usernames are **disposable dev/test verification data**: reset/reseed them. **No** production-compatibility machinery, grandfathering, or complex migration to preserve them. The resulting invariant is lowercase-only stored usernames, enforced by backend + frontend validation; uppercase input is **rejected, never silently normalized.**
4. **A — truthful absence.** `name` has **no default** and is **never populated or derived from `username`.** Absent is represented truthfully as `NULL`. `username` is the **presentation (read-side) fallback only** when `name === null`; it must not mutate or persist `name`.
5. **Separateness.** The six Work Items stay separate unless formal-planning evidence proves a boundary cannot be preserved safely. **C and A are not combined for convenience.**
6. **F — architectural guarantees (binding).** Editable username must hold three guarantees: (1) **immediate authenticated-identity consistency** — no stale session, logout, or refresh; (2) **stable username locators** — no historical URL 404s, via the approved alias/reservation/redirect architecture; (3) **single source of truth** — the username validation rule and the handle resolver are each defined once and reused. Changing this architecture or expanding scope requires stopping to discuss.

## 4. Strategy & sequencing

**Order:** **D → B → E → C → A → F** (sequential; merge-to-stable-`main` between each).

**Dependency graph:**

```
D  (register correctness, foundation)
      └─▶ C (register/auth response contract)  ──▶ A (register field + name nullable)
B  (username lowercase + data)  ──▶ E (login identifier)
{B, D, C, A}  ──▶ F (editable username)

Serialization edges (shared files — not new dependencies):
  E ⋯ C   both edit auth.controller / the login handler → must not run concurrently
  B ⋯ A   both edit registerSchema → satisfied by B landing before A
  A ⋯ F   both edit updateMeSchema / registerSchema → satisfied by A landing before F
```

- **D → C, D → A** *(hard):* register must be transactionally correct before its request/response contract is reshaped.
- **B → E** *(hard):* the lowercasing resolver would strand existing uppercase accounts unless stored usernames are already lowercase.
- **C → A** *(efficiency):* C minimizes the Auth response first, so A never re-touches it (no DTO rework).
- **{B, D, C, A} → F** *(hard):* editable username reuses B's lowercase validation, D's `P2002` pattern, C's `{ id, username }` identity, and A's `PATCH /users/me` optional-field path; it is the plan's final item.

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

### WI-E — Login by neutral identifier — [#391](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/391)
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

### WI-C — Retire `/auth/me`, canonicalize `/users/me`, minimize Auth responses — [#394](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/394)
- **Goal & rationale:** one canonical current-user resource (`/users/me`); Auth returns only the session + minimal identity `{ id, username }`; `/auth/me` is retired (it returns only User-owned state and weakens the Profile-free Auth boundary — we would not introduce it today); `email` is added to the `/users/me` self-view.
- **Scope (contract-only):** backend — retire `GET /auth/me` (route, controller handler, service method, its result type, its test); minimize the register/login/refresh response to `{ id, username }`; add `email` to the `/users/me` **self** view (the public profile view still excludes it). Frontend — co-version the existing auth contract to `{ id, username }` (the `AuthUser` type, the `UserDto`, the `AuthResponse` entity, the mapper, the slice state/payloads, and the affected tests). Docs — the API contract and the authentication feature document. **No frontend `/users/me` consumer, profile store, hook, or hydration is built:** the project has no authenticated app/profile UI yet, so that is the correct *complete* scope now; the first real profile consumer will drive the User/Profile frontend capability.
- **Non-goals:** no frontend `/users/me` consumer / profile store / hydration / UI; no register-field change (that is WI-A); no public-profile email exposure; no login-request change (that is WI-E).
- **Dependencies:** **D** (the register response is part of the register contract); serialize **after E** (shared login handler).
- **Impact:** backend (auth controller, routes, service, types; user service + repository + DTO) + frontend (auth `AuthUser` type, DTO, entity, mapper, slice state/payloads, tests) + the API contract + the authentication feature document. No schema change.
- **Invariants:** exactly one current-user endpoint (`/users/me`); Auth responses carry only `{ token, { id, username } }` (no name/bio/profileImage/email); the `/users/me` self-view includes `email`, the public view excludes it; `GET /auth/me` is gone.
- **Migration/data:** none.
- **Verification strategy:** backend — auth responses are `{ id, username }`; `/users/me` self has `email`, public does not; the `/auth/me` route is removed. Frontend — the auth slice/DTO/entity/mapper carry `{ id, username }`; typecheck + the co-versioned tests green.
- **Definition of Done (summary):** `/auth/me` retired; auth responses minimized; `/users/me` canonical + self `email`; the frontend auth contract co-versioned to `{ id, username }`; tests green; the API contract + authentication document co-versioned.
- **Commit/PR boundary:** one PR; commits ≈ backend (retire + minimize + self-email), frontend (auth contract + tests), docs.
- **Stop-risks:** if any consumer depended on `/auth/me` or on profile fields in the auth response → co-version or **stop**. (Analysis found zero frontend profile consumers — which is why contract-only is the correct complete scope, and a `/users/me` consumer is future work.)

### WI-A — Remove `name` from Register; `name` as truthful optional profile data — [#396](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/396)
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

### WI-F — Editable Username (self-service handle change) — [#399](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/399)
- **Goal & rationale:** a user changes their own `username` via `PATCH /users/me` under the lowercase-only invariant, with the session, historical URLs, and validation all staying coherent. The closing item of the identity work.
- **Approved architecture — History + Reservation + Redirect:** a rename records the old handle in a `username_aliases` table (**reserved indefinitely**) and sets the new one current; a single `resolveUserByHandle` (current → else alias) backs every username locator; a former handle **301-redirects** (reads) or **resolves** (writes) to the canonical handle; uniqueness spans current usernames **and** reserved aliases.
- **Scope:** extract the username rule into a shared `usernameField` consumed by register + edit; add the `UsernameAlias` model + additive migration; add `resolveUserByHandle` + read-locator wiring (`/users/:username`, `/tweets?author=`, `/follows/:username/(followers|following)`) with 301-to-canonical; add `username` to `updateMeSchema` + `UpdateMeInput` + `updateMe` (transactional uniqueness across users + alias, `UPDATE` + alias insert, `P2002 → 409`); reserve aliases in registration's uniqueness. **No frontend rename flow is built:** G1 is a *backend* guarantee — the session key is the immutable `id` (the JWT carries only `userId`), so a rename never invalidates the token and every response (the rename's own, and `GET /users/me`) is the authoritative new identity; a frontend merely reads that response. As with WI-C's `/users/me` consumer, the project has no authenticated settings/profile UI yet, so the correct complete scope now is the backend guarantee plus its verification; the rename UI is future work, driven by the first profile/settings consumer. Docs — API contract, data-model, authentication document; and the manual **verification harness** (Postman folder 09 + Checkpoint H).
- **Non-goals (scope fence):** no rename cooldown / rate-limit / churn throttle; no alias expiry or release; no id-based canonical URLs; no case-insensitivity beyond lowercase-only; no cross-device push sync; no account-deletion reconciliation (dormant).
- **Dependencies:** **B** (validation), **D** (`P2002`), **C** (auth identity), **A** (`PATCH /users/me` optional-field path) — all merged; sequenced **last**.
- **Impact:** backend (user validator + types + service + repository; auth validator — shared-rule extraction; tweets/follows read locators + the shared resolver; **schema + migration**) + the API contract + the data-model + the authentication document + the manual **verification harness** (scenarios, runbook, Postman collection, environment). **No frontend change** — the rename UI is deferred (see Scope).
- **Invariants:** `id` is the stable session identity; `username` is a mutable, unique, reserved-on-release handle; a handle is taken iff it is a current username **or** a reserved alias; former handles never `404`; one validation rule, one resolver.
- **Migration/data:** one **additive** migration — `CREATE TABLE username_aliases` (+ FK + index); no change to `users.username`, no backfill.
- **Verification strategy:** backend — rename updates + reserves the old handle; `P2002 → 409`; register rejects reserved aliases; `/users/:old` → `301` canonical; the **same** access token still authorizes after a rename (id-based session); author embeds reflect the new handle (join). Real-Postgres integration for rename, reservation, resolver/redirect, and session-continuity. **Manual harness** — Postman folder 09 (USR-01…USR-10) + Checkpoint H drive the same guarantees against a running system: a token minted *before* a rename still authorizes *after* it and returns the new handle (G1), a former handle 301-redirects and resolves on non-profile locators (G2), and a reserved handle is refused to both rename and registration.
- **Definition of Done (summary):** editable `username` live via `PATCH /users/me`; history + reservation + redirect enforced by the shared resolver; the shared `usernameField` is the single validation source; all three guarantees held; tests green; the API contract + data-model + authentication document co-versioned.
- **Commit/PR boundary:** one PR; commits ≈ plan update, shared `usernameField`, `UsernameAlias` model + migration, resolver + read redirects, transactional rename, registration reservation, verification-harness amendment, docs.
- **Stop-risks:** if any implementation detail would require changing the agreed architecture (history / reservation / redirect) or expanding scope (policies, id-URLs) → **stop and discuss** before proceeding.

## 6. Risks & mitigations (effort-wide)

- **Serialize E and C** — both edit the login handler; running them concurrently risks a broken login path. Mitigation: the sequential order (E before C).
- **B before E is load-bearing** — reconcile the disposable uppercase data in B; otherwise E's lowercasing resolver strands those accounts.
- **C's frontend hydration** is the single riskiest logic change; it must be complete and tested within C, so no half-migrated session state reaches `main`.
- **A's silent-strip hazard** — the request validator drops unknown keys, so a stale register form would silently discard `name`; the register-form change must land in A.
- **Contract-doc drift** — every Work Item touching a contract updates the API contract (and the data-model / authentication documents where owned) in the same PR (co-versioning).
- **No out-of-scope creep** — account deletion, `profileImage`, DOB, Terms/Privacy, password reset, and app UI stay out; discoveries are surfaced, not absorbed.

## 7. Completion criteria (whole effort)

- All six Work Items merged to `main`, each green (typecheck + unit + integration), each leaving a consistent backend/frontend/contract state.
- Register is transactional (no orphan; race → `409`); usernames are lowercase-only (backend + frontend, data reconciled); login accepts `{ identifier }` with a generic `401`; `/auth/me` is retired and `/users/me` is canonical (self `email`) with Auth responses minimized and the frontend auth contract co-versioned to `{ id, username }` (a `/users/me` consumer is future work); `name` is removed from register and truthfully optional (nullable, never derived, clearable, read-side fallback).
- Editable username is live via `PATCH /users/me` with **immediate identity consistency** (id-based session — no logout/refresh), **stable historical URLs** (alias + reservation + `301` redirect), and a **single shared validation rule + resolver** — the three guarantees held.
- All API/contract changes are co-versioned across backend, frontend logic, and docs; the API contract, data-model, and authentication documents are consistent.
- The frontend **UI/screens remain deferred** — only logic, validation, state, mappers, and tests changed.
- No out-of-scope item was pulled in.

## 8. Reconciliation

The effort is **complete**, and archived for the reason ADR 0006 asks be recorded here: **completion**, not supersession or abandonment. All six Work Items are merged and their Issues closed — #385, #388, #391, #394, #396, #399.

This plan is now read-only provenance: how the effort was reasoned about and sequenced, never what the system currently guarantees.

### Where the durable facts landed

Little moved at this transition, and that is the point of pinned constraint 2. Co-versioning required each Work Item to carry its contract documentation inside the same Work Item, so the durable facts left this plan as the effort ran rather than in one migration at the end.

| What | Now owned by |
|---|---|
| Endpoint shapes, request and response bodies, error codes, and the retirement of `GET /auth/me` | [API contract](../api/api-contract.md) |
| The alias and reservation model, username uniqueness across two tables, the deletion footprint | [Data model](../architecture/data-model.md), and `schema.prisma` for field-level truth |
| The session's minimal identity, id-based restore, and `name` as a read-side fallback | [Authentication](../features/authentication/authentication.md) |
| Why authenticated-only media replaced the pre-auth register-with-avatar path | [ADR 0008](../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md) |

### The completion criteria, each with what proves it

| § 7 criterion | Proof |
|---|---|
| Six Work Items merged, each green | #385, #388, #391, #394, #396, #399 — all closed by merge |
| Register is transactional | `auth.repository.ts` composes the account and its refresh session in one `db.$transaction([...])`; the service takes the runner as a parameter |
| Usernames are lowercase-only, rejected not normalized | `shared/validation/username.ts` — `^[a-z0-9_]+$`, 4–20, `.trim()`, composed by both registration and the rename |
| Login accepts a neutral identifier | `auth.validator.ts` — `identifier`, presence-only, never format-validated on the login path |
| `/auth/me` retired, `/users/me` canonical | the string appears in the tree exactly once, in the API contract, describing its retirement |
| `name` truthfully optional, never derived | `schema.prisma` — `name String?`, with the read-side-fallback rule stated at the field |
| Editable username, three guarantees | id-based session identity (Authentication §restore); `UsernameAlias` plus a `301` from a released handle in `user.controller.ts`; one resolver in `user.repository.ts` |
| Contract, data-model and authentication documents consistent | each verified against the code above rather than against each other |
| UI and screens still deferred | the auth module still renders its bootstrap design, and `_design/` is still mounted — its removal is [#546](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/546) |
| No out-of-scope item pulled in | password reset, account deletion, `profileImage` cleanup, date-of-birth and Terms/Privacy persistence are all still absent |

### What the pinned constraints become

**Outlived the effort** — constraint 3's lowercase-only invariant and constraint 4's truthful absence are now product rules, stated by the data model and the API contract and enforced in code. They no longer depend on this plan.

**Expired with it** — constraints 1, 2 and 5 were sequencing and scope discipline: one Work Item at a time, co-version inside the Work Item, keep C and A apart. They governed how this effort ran and bind nothing after it.

**Held, with a limit worth stating** — constraint 6's third guarantee asked that the username rule and the handle resolver each be defined once. Both hold **within** a tier: the backend field is composed by registration and by the rename, and the resolver exists once. Across tiers the rule is stated twice, in `shared/validation/username.ts` and `modules/auth/config/authValidationRules.ts`, because there is nowhere yet to put a single definition — [ADR 0013](../architecture/decisions/0013-applications-and-cross-tier-packages.md)'s `packages/` layer is decided but unbuilt. Both ends say so at the code; neither pretends otherwise.

### What this effort deliberately left

**Password reset** was out of scope here and is not orphaned: it arrives through the channel-verification capability, which takes email as its first consumer. **The UI and screens** were deferred by design — this effort changed logic, validation, state, mappers and tests, and no screen.

### Findings

None were recorded against this effort.

