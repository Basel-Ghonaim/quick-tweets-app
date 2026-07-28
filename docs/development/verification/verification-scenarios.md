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
- **Unreferenced** = an owned object (`uploader_id` set) with no ledger row — the
  single M11 reclamation target. (The pre-auth grant "abandoned" class was retired
  with the upload grant, ADR 0008.) See the runbook's terminology section.

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
| MED-03 | Login A | Upload `sample.png` under Bearer A | 201; `{token,…}` | `media_objects`: `uploader_id = A` | ← unreferenced until attached | |
| MED-04 | MED-03 | Read `GET /media/:token` | 200; body is the bytes; `Content-Type: image/*`; `X-Content-Type-Options: nosniff` | — | — | |
| MED-05 | — | Upload with no auth (no Bearer) | 401 `unauthorized` | no row | — | |
| MED-07 | Login A | Upload `not-an-image.png` (text) | 415 `unsupported_media_type` (rejected by **content signature**, not extension) | no row | — | ✅ **415, server healthy** (2026-07-23, after #344 fix — previously crashed the process) |
| MED-08 | — | Read unknown token | 404 / 410 (not served) | — | — | |
| MED-10 | Local oversize fixture — **valid signature** + >5 MiB (see README) | Upload a >5 MiB file | 413 `payload_too_large` | no row | — | ✅ **413, server healthy** (2026-07-23). Note: a *random/zero* oversize file returns 415 (signature checked before size) — the fixture must carry a real image signature. |

> Media upload is authenticated-only (the pre-auth grant scenarios MED-01/02/06/09
> were retired with the upload grant, ADR 0008). **Checkpoint A** (runbook) confirms
> MED-03 provenance.

## 3 · Avatar — retired (pre-auth adoption removed)

The pre-auth **register-with-avatar / upload-grant adoption** flow (formerly
AVA-01…05) was retired with the upload grant (ADR 0008): registration is account
creation only, and the avatar is now an ordinary authenticated **User/Profile**
producer — upload under `POST /media` (Bearer), then `PATCH /users/me`. The
authenticated avatar lifecycle is exercised by the User-domain backend tests; the
user-facing avatar/profile surface is tracked separately ([#362]). These scenarios
no longer describe executable behavior and are retired rather than rewritten here.

[#362]: https://github.com/Basel-Ghonaim/quick-tweets-app/issues/362

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

## 5b · Comment media — Attach, Coordination, Cascade (Comment Media)

> The third media producer: **one** file per comment, full-replacement semantics
> (`omit` = unchanged, `{token}` = set/replace, `null` = remove) — the same
> contract tweets use, single-valued. Its unique surface is the **transitive
> cascade**: deleting a tweet ends its comments' `comment:{id}` references too.
>
> Referrer tag: `comment:{commentId}`. Media column: `comments.media_id`.
> Each row maps to one isolated scenario in Postman folder **08 · Comment Media**
> (the letter/step in parentheses); each scenario mints its **own** media and its
> **own** comment, so no row's state can carry into the next. Run **08 · 0 · Setup**
> once first (creates `{{cmTweetId}}`, uploads `{{cmMediaB}}`).

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CMT-M01 | Setup; A owns fresh media (A1) | Create comment WITH media on the host tweet (A2) | 201; `media.token` present | `comments` row with `media_id`; **ledger: one `comment:{id}` row** (CM-1) | reset | |
| CMT-M02 | CMT-M01 | List comments `?tweetId` (A3) | 200; the comment's `media` is a servable token | — | — | |
| CMT-M03 | Setup; comment created **without** media (B1); A owns "set" object (B2) | PATCH **set** (none → set) (B4) | 200; `media.token` present | ledger: begin — **one** `comment:{id}` row (CM-2) | — | |
| CMT-M04 | CMT-M03; A owns "replace" object (B3) | PATCH **replace** (set → replace) (B5) | 200; new token | ledger: end set + begin replace — **still one** row; the set object is now **unreferenced** (CM-2) | — | |
| CMT-M05 | CMT-M04 | PATCH **resubmit the same** object (B6) | 200; media unchanged | ledger: **UNCHANGED** — no end, no begin (CM-2) | — | |
| CMT-M06 | CMT-M04/05 | PATCH **remove** `null` (B7) | 200; `media:null` | ledger: end — **zero** `comment:{id}` rows; the replace object is now **unreferenced** (CM-2) | — | |
| CMT-M07 | CMT-M06 | PATCH `body` only, **omit** `media` (B8) | 200; `media` stays `null` | ledger **untouched** (still zero) — proves `omit ≠ null` | — | |
| CMT-M08 | Setup; A owns fresh media (C1); a comment holds it (C2) | Delete the comment (C3) | 204 | `comment:{id}` ledger gone; the object survives `status=ready`, `uploader_id` set → **unreferenced** (CM-3) | — | |
| CMT-M09 | Setup; B owns object `{{cmMediaB}}` (S2) | A creates a comment attaching **B's** object (D1) | 422; error **does not name** the token | **rollback**: no comment, no `comment:{id}` ledger row for B's object (CM-4) | — | |
| CMT-M10 | Cascade tweet carries tweet-media (E2) **and** a comment on it carries comment-media (E4) | Delete the **tweet** (E5) | 204 | comment + tweet gone; **both** `comment:{id}` **and** `tweet:{id}` ended in one tx; both objects survive **unreferenced** (CM-5) | — | |
| CMT-M11 | A tweet with a comment on it (F1/F2) | **In pgAdmin**, raw `DELETE FROM tweets WHERE id = …` | DB **refuses**: FK violation on `comments_tweet_id_fkey` (`ON DELETE RESTRICT`) | tweet + comment untouched (wrap in `BEGIN … ROLLBACK`) (CM-6) | ROLLBACK | |
| CMT-M12 | After every comment scenario | Run the **global invariant** (Checkpoint F, extended for comments) | — | all four counts = 0 | — | |

> **Checkpoints CM-1 … CM-6** and the extended Checkpoint F are defined in the
> [runbook](verification-runbook.md#comment-media-checkpoints-cm-1--cm-6). **CMT-M11**
> is DB-only: the API delete path (`deleteTweet`) removes comments *first*, so the
> `Restrict` FK never fires there — the raw `DELETE` proves the backstop is real.

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
must leave **no** tweet, **no** `tweet_media`, and **no** ledger row. **CMT-M09** is
the comment equivalent (a cross-principal attach must persist no comment and no
`comment:{id}` row). Confirm each with the DB checkpoint, not just the HTTP
status — a 422 with a half-written row would be the exact bug this phase exists to
catch.

### Reference Coordination
The heart of the phase, spread across **TWT-01**
(begin, tweet), **TWT-03/04/05** (the set-difference: end, no-op, remove-all),
**TWT-08** (delete ends all), and **TWT-13** (the global invariant). Comment media
adds the same shape single-valued — **CMT-M01** (begin), **CMT-M03→M06** (set /
replace / resubmit-no-op / remove), **CMT-M08** (delete ends) — plus the surface
tweets do not have: **CMT-M10**, where deleting a **tweet** ends its comments'
`comment:{id}` references *and* its own `tweet:{id}` references in one transaction.
**CMT-M12** re-runs the global invariant with comments included. If every one of
these matches its ledger checkpoint, the M11 precondition — *every
reference-creating consumer participates, and Media's state is consistent* — is
verified by hand.

### Terminology check
After **TWT-08**, **CMT-M08**, and **CMT-M10**, the ex-media are **unreferenced**
(owned, no ledger row) — the single M11 reclamation target. (The pre-auth grant
"abandoned" class was retired with the upload grant, ADR 0008.)

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

## Verification run — Comment Media (2026-07-26)

Folder **08 · Comment Media** was executed top-to-bottom against the running
system, every API assertion and DB checkpoint confirmed in pgAdmin. **All of
CMT-M01 … CMT-M12 passed; all of CM-1 … CM-6 matched.** No divergence between the
implementation and this catalogue.

| Scenario | Result |
|---|---|
| CMT-M01/M02 — create with media, read surfaces token | ✅ CM-1: one `comment:{id}` row, object ready/owned |
| CMT-M03→M07 — PATCH set / replace / resubmit-no-op / remove / omit≠null | ✅ CM-2 after each: set-difference exact; resubmit a true no-op; omit untouched |
| CMT-M08 — delete with media | ✅ CM-3: reference ended; object survives ready, owned, **unreferenced** |
| CMT-M09 — cross-principal attach | ✅ 422 opaque, full rollback; CM-4: no comment, no ledger residue |
| CMT-M10 — transitive cascade (delete tweet) | ✅ CM-5: `comment:{id}` **and** `tweet:{id}` ended in one tx; both objects unreferenced |
| CMT-M11 — Restrict backstop | ✅ CM-6: raw `DELETE` refused by `comments_tweet_id_fkey`; rolled back |
| CMT-M12 — global invariant | ✅ Checkpoint F (extended): all four counts = 0 |

Comment Media is verified by hand. The remaining Media milestone, **M11
(reclamation)**, may proceed when scheduled.
