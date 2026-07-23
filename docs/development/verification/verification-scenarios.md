# Verification Scenarios — Permanent Catalogue

> The authoritative, comprehensive list of manual verification scenarios for the
> system. Each row is one scenario with a stable **ID**, its preconditions, the
> action, the expected **API** result, the expected **DB** state, cleanup, and a
> Result/Notes column to fill in during a run.
>
> This is the source of truth for *what* is verified. The
> [runbook](verification-runbook.md) is *how* (setup, SQL, order); the Postman
> collection is the *driver*. When a scenario changes, update it here first.

## How to use this document

- IDs are stable (`AUTH-01`, `MED-03`, …) so runs, notes, and any future
  regressions can reference them.
- **Expected DB State** names the tables/rows to confirm in pgAdmin. "—" means the
  scenario is fully API-observable and needs no DB check.
- Fill **Result / Notes** per run (✅ / ❌ + observation). Keep prior runs by
  copying the table into a dated section if you want history, or clear it for a
  fresh pass — this file is permanent, individual run records are not.

## Legend

- **Ledger** = `media_references` table (referrer + media_id).
- **Referrer tags**: `tweet:{tweetId}`, `user-avatar:{userId}`.
- **Abandoned** = grant-provenance, never adopted (`uploader_id IS NULL`,
  `grant_id` set). **Unreferenced** = owned (`uploader_id` set) with no ledger
  row. These are distinct M11 targets — see the runbook's terminology section.

---

## 1 · Authentication

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| AUTH-01 | Clean DB | Register User A | 201; `{user, accessToken}`; `user.avatar = null`; refresh + `qt_session` cookies set | `users` row for A; a `refresh_tokens` row | — | |
| AUTH-02 | AUTH-01 | Register User B | 201; distinct user | second `users` row | — | |
| AUTH-03 | AUTH-01 | Login A (correct) | 200; new `accessToken`; refresh cookie rotated | new `refresh_tokens` row | — | |
| AUTH-04 | AUTH-03 | GET /me with Bearer A | 200; identity matches A | — | — | |
| AUTH-05 | AUTH-03 | POST /refresh (cookie) | 200; new `accessToken`; cookie rotated | old refresh token replaced by new | — | |
| AUTH-06 | AUTH-03 | Logout | 204; cookies cleared | A's current `refresh_tokens` row removed | — | |
| AUTH-07 | AUTH-03 (multi-session) | Logout-all | 204 | **all** A's `refresh_tokens` rows removed | — | |
| AUTH-08 | AUTH-01 | Register duplicate username | 409 `conflict` | no new row | — | |
| AUTH-09 | AUTH-01 | Login wrong password | 401 `unauthorized` | no new refresh token | — | |
| AUTH-10 | Logged out | Refresh with no cookie | 401 | — | — | |
| AUTH-11 | — | GET /me with no token | 401 `unauthorized` | — | — | |
| AUTH-12 | — | Register with short password | 422 `validation` | no new row | — | |

## 2 · Media primitives

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| MED-01 | — | Mint grant | 201; `{grant, expiresAt}` | — (grant is a token, not a row) | — | |
| MED-02 | MED-01 | Upload `sample.png` under grant | 201; `{token, contentType:image/png, size}` | `media_objects`: `status=ready`, `uploader_id NULL`, `grant_id` set | ← abandoned until adopted | |
| MED-03 | Login A | Upload `sample.png` under Bearer A | 201; `{token,…}` | `media_objects`: `uploader_id = A`, `grant_id NULL` | ← unreferenced until attached | |
| MED-04 | MED-02 | Read `GET /media/:token` | 200; body is the bytes; `Content-Type: image/*`; `X-Content-Type-Options: nosniff` | — | — | |
| MED-05 | — | Upload with no auth and no grant | 401 `unauthorized` | no row | — | |
| MED-06 | — | Upload with invalid grant | 401 | no row | — | |
| MED-07 | Login A | Upload `not-an-image.png` (text) | 415 `unsupported_media_type` (rejected by **content signature**, not extension) | no row | — | ✅ **415, server healthy** (2026-07-23, after #344 fix — previously crashed the process) |
| MED-08 | — | Read unknown token | 404 / 410 (not served) | — | — | |
| MED-09 | MED-02 (grant spent) | Re-upload under the **same** grant | 401 / 403 (grant is single-use, `GRANT_MAX_OBJECTS=1`) | no second row for that grant | — | |
| MED-10 | Local oversize fixture — **valid signature** + >5 MiB (see README) | Upload a >5 MiB file | 413 `payload_too_large` | no row | — | ✅ **413, server healthy** (2026-07-23). Note: a *random/zero* oversize file returns 415 (signature checked before size) — the fixture must carry a real image signature. |

> **Checkpoint A** (runbook) confirms MED-02/03 provenance.

## 3 · Avatar (pre-auth adoption)

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| AVA-01 | — | Mint grant → upload avatar → register with `{avatar:{token,grant}}` | 201; `user.avatar.token` present | `users.avatar_media_id` set; object `uploader_id = new user`, `grant_id` retained; **ledger row `user-avatar:{id}`** | Reset | |
| AVA-02 | AVA-01 | Read the avatar token via `/media/:token` | 200; image bytes | — | — | |
| AVA-03 | AVA-01 (grant + token spent) | Register again with the **same** token+grant | 409/422 (replay refused — grant spent at adoption) | no second user; no change to the object | — | |
| AVA-04 | An unadopted object exists | Register presenting the token **without** the grant | 4xx (adoption re-requires the grant; a leaked token alone is not adoptable) | no adoption | — | |
| AVA-05 | Object already adopted by A | Attempt to adopt the same object for another user | 409 `already_adopted` (opaque) | unchanged | — | |

> **Checkpoint B** confirms AVA-01's ledger row. AVA-04/05 may need a fresh
> grant+upload to set up; see the runbook.

## 4 · Tweets + media — Attach, Coordination, Transactions (M7–M9)

> The core of the phase. Every mutating row here has a DB checkpoint, because the
> **ledger deltas** are the actual thing under test.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| TWT-01 | Login A; A owns media A1, A2 | Create tweet with `media:[A1, A2]` | 201; `media` has 2 tokens, in order | `tweet_media`: 2 rows, positions 0,1; **ledger: 2 rows** `tweet:{id}` (Checkpoint C) | via TWT-08 | |
| TWT-02 | TWT-01 | Read tweet by id | 200; `media` = 2 servable tokens, in order | — | — | |
| TWT-03 | TWT-01 | PATCH `media:[A2, A1]` — **reorder** (2 items, swapped) | 200; still 2, order swapped | ledger: **UNCHANGED** — no begin, no end (Checkpoint D) | — | |
| TWT-04 | TWT-03 | PATCH `media:[A2]` (drop A1) | 200; `media` = 1 | ledger: **A1 ended, A2 remains** (Checkpoint D) | — | |
| TWT-05 | TWT-04 | PATCH `media:[]` | 200; `media` = 0 | ledger: **0 rows** for the tweet | — | |
| TWT-06 | TWT-01 (2 media) | PATCH `body` only, **omit** `media` | 200; `media` unchanged | `tweet_media` and ledger **untouched** | — | |
| TWT-07 | A owns media A1 | Create tweet, but include a token that fails attach | 422; whole request fails | **rollback**: no tweet, no `tweet_media`, no ledger row (Checkpoint G) | — | |
| TWT-08 | TWT-01 | Delete the tweet | 204 | tweet + `tweet_media` gone; **ledger rows gone**; objects survive `status=ready`, `uploader_id` set → **unreferenced** (Checkpoint E) | — | |
| TWT-09 | A owns A1; B owns B1 | A creates tweet with `media:[B1]` (cross-principal) | 422; error **does not name** the token | rollback — nothing persisted | — | |
| TWT-10 | Login A | Create tweet with the **same** token twice | 422 `validation` | no tweet | — | |
| TWT-11 | Login A | Create tweet with 5 tokens (> MAX) | 422 `validation` | no tweet | — | |
| TWT-12 | A owns tweet T; login B | B deletes A's tweet | 403 / 404 | A's tweet untouched | — | |
| TWT-13 | After TWT-08 | Run the **global invariant** (Checkpoint F) | — | all three counts = 0 | — | |

## 5 · Comments

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CMT-01 | Live tweet T; login A | Create comment on T | 201; comment body | `comments` row (author A, tweet T) | via CMT-04 | |
| CMT-02 | CMT-01 | List comments (offset) `?tweetId=T` | 200; includes the comment; offset meta | — | — | |
| CMT-03 | CMT-01 | Update own comment | 200; edited body | row updated | — | |
| CMT-04 | CMT-01 | Delete own comment | 204 | `comments` row removed | — | |
| CMT-05 | Comment by A; login B | B updates A's comment | 403 | unchanged | — | |
| CMT-06 | Tweet T deleted | List comments for T | comments cascade-removed with the tweet | no `comments` rows for T | — | |

## 6 · Likes

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| LIK-01 | Live tweet T; login B | Like T (toggle on) | 200; `liked:true`, `likesCount` +1 | `likes` row (B,T) | via LIK-02 | |
| LIK-02 | LIK-01 | Like T again (toggle off) | 200; `liked:false`, `likesCount` −1 | `likes` row removed | — | |
| LIK-03 | — | Like a non-existent tweet | 404 | no row | — | |

## 7 · Follows

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| FOL-01 | A, B exist; login B | B follows A | 200; `isFollowing:true`, `followersCount` | `follows` row (B→A) | via FOL-05 | |
| FOL-02 | FOL-01 | List A's followers | 200; B present; cursor meta | — | — | |
| FOL-03 | FOL-01 | List B's following | 200; A present | — | — | |
| FOL-04 | FOL-01 | GET /users/A (as B) | 200; `isFollowing:true`, counts present | — | — | |
| FOL-05 | FOL-01 | B unfollows A | 200; `isFollowing:false` | `follows` row removed | — | |
| FOL-06 | login B | B follows A **twice** | idempotent / no duplicate | single `follows` row (unique pair) | — | |

---

## Cross-cutting concerns (called out explicitly)

### Transactions / Rollback
Scenarios **TWT-07** and **TWT-09** are the transaction proofs: a failure mid-attach
must leave **no** tweet, **no** `tweet_media`, and **no** ledger row. **AVA-03**
proves adoption's atomicity (a spent grant leaves the object untouched). Confirm
each with the DB checkpoint, not just the HTTP status — a 422 with a half-written
row would be the exact bug this phase exists to catch.

### Reference Coordination
The heart of the phase, spread across **AVA-01** (begin, avatar), **TWT-01**
(begin, tweet), **TWT-03/04/05** (the set-difference: end, no-op, remove-all),
**TWT-08** (delete ends all), and **TWT-13** (the global invariant). If every one
of these matches its ledger checkpoint, the M11 precondition — *every
reference-creating consumer participates, and Media's state is consistent* — is
verified by hand.

### Terminology check (do not conflate)
After **TWT-08**, the ex-media are **unreferenced** (owned, no ledger row). After a
grant upload that is never adopted (**MED-02** left as-is), the object is
**abandoned** (never owned). Both are M11 targets; they are reached by different
paths and must be labelled distinctly in any notes.

---

## Verification run — observations & resolutions (2026-07-23)

The first full manual pass (Media, Avatar, Tweets, Reference Coordination,
rollback, ledger) passed **except** for four observations. Their dispositions:

| # | Observation | Class | Resolution |
|---|---|---|---|
| 1 | logout / logout-all "succeed while logged out" | **Expected** | Contract-correct: `logout` is `Auth: None` (idempotent, cookie-based); `logout-all` is `Auth: Required` — it passed only because the 15-min access JWT was still valid. No change. |
| 2 | failed-login `refreshToken` cookie in the browser | **Expected** | A failed login never sets the cookie (server sets it only on success); the cookie is residue from a prior successful auth or a background session-restore refresh. The #332 "no refresh on failed login" fix is intact. No change. |
| 3 | invalid upload **crashes the server** | **Bug (DoS)** — fixed | An unhandled stream error in an async gap during ingest ([#344](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/344)). Fixed; **MED-07 re-verified 415 with the server healthy**, plus a regression test. |
| 4 | >5 MiB upload not sent by Postman | **Tooling → now verified** | Exercised against the backend with a valid-signature 6 MiB file: **413, server healthy** (MED-10). Fixture guidance corrected in the README. |

Observations 1 and 2 need no code change. 3 and 4 were the two gates on closing
this phase; both now pass. With M1–M9 verified and these resolved, Verification
is **complete** — M10/M11 may unfreeze.
