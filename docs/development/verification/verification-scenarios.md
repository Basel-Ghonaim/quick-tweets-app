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

## 8 · Username rename & locator stability (WI-F)

> Editable username via **History + Reservation + Redirect**. Renaming a handle
> updates the current username, **reserves** the former handle as an alias of the
> same account, and keeps every historical locator working. These scenarios prove
> the three WI-F guarantees against a real DB. The driver is Postman folder
> **09 · Username rename**; the DB proof is **Checkpoint H** (`username_aliases`).
>
> - **G1 — identity is the id, not the handle.** The access token minted *before* a
>   rename still authenticates *after* it and returns the new handle — no logout, no
>   refresh (USR-01/02).
> - **G2 — a former handle never 404s.** The shareable profile URL 301-redirects
>   (USR-03); non-profile locators resolve the alias transparently (USR-04).
> - **G3 — one validation rule.** The rename path enforces the *same* `usernameField`
>   as register — an invalid handle is a 422, never a 409/500 (USR-08).
>
> **Self-isolated.** Folder 09 mints its own two users (a renamer + a bystander) with
> per-run unique handles, so it never disturbs `verify_alice`/`verify_bob` and a
> former handle reserved by a prior run cannot collide. Run **09** top-to-bottom;
> the run's handles are `{{rnOldUsername}}` → `{{rnNewUsername}}`, bystander
> `{{rnBystander}}`.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| USR-01 | Renamer registered as `old` | `PATCH /users/me {username:new}` (Bearer renamer) | 200; `data.username = new`; `data.id` unchanged | `users`: username = `new`; **`username_aliases`: one row `old` → same `user_id`** (Checkpoint H) | via reset | |
| USR-02 | USR-01 | `GET /users/me` with the **same** Bearer minted before USR-01 | 200; `id` unchanged; `username = new` — the session never went stale (**G1**) | — | — | |
| USR-03 | USR-01 (redirect-follow **off**) | `GET /users/old` (former handle) | **301**; `Location` ends `/users/new` (**G2**, profile URL) | — | — | |
| USR-04 | USR-01; bystander logged in | Bystander `POST /follows/old` (former handle) | 200; `isFollowing:true` — the follow locator resolves the alias (**G2**, writes) | `follows` row (bystander → renamer) | via reset | |
| USR-05 | USR-01 | Bystander `PATCH /users/me {username:old}` | 409 `conflict` — a reserved former handle is cross-account | no change | — | |
| USR-06 | Bystander holds `bystander` | Renamer `PATCH /users/me {username:bystander}` | 409 `conflict` — a live handle is taken | no change | — | |
| USR-07 | USR-01 | `POST /auth/register {username:old,…}` (new account) | 409 `conflict` — no re-registration of a reserved handle | no new `users` row | — | |
| USR-08 | Renamer logged in | `PATCH /users/me {username:"AB"}` (too short + uppercase) | **422** `validation` — same rule as register (**G3**) | no change | — | |
| USR-09 | USR-01 | Renamer `PATCH /users/me {username:new}` (already current) | 200; `username` unchanged | `username_aliases`: **UNCHANGED** — no second alias (Checkpoint H) | — | |
| USR-10 | USR-01…09 | Renamer `PATCH /users/me {username:old}` (reclaim own former handle) | 200; `data.username = old` | `username_aliases`: the `old` row **gone**; `new` now reserved → same `user_id` (Checkpoint H) | via reset | |

> **USR-05 vs USR-07** are the two faces of one reservation: a reserved former handle
> is refused to a **rename** *and* to a **registration**. **USR-09** proves a no-op
> rename mints no alias; **USR-10** proves reclaiming your *own* former handle is a
> 200 (the self-alias is released), not a 409 against yourself.

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

---

## 10 · Channel verification (CHV)

Proof of control over the account's email. What this folder verifies, in one line
each:

> - **G1 — the code is knowable only to whoever holds the mailbox.** Delivery
>   discards it and storage digests it, so the plaintext exists in process memory
>   for one request. The **capture backend** is the inbox that makes this
>   hand-verifiable at all (CHV-01/06).
> - **G2 — one failure shape.** Malformed, wrong, expired, superseded, replayed
>   and never-existed are reported **identically** — same status, same body
>   (CHV-04/05/08). A carve-out anywhere is a leak.
> - **G3 — the proof binds to the address, not the account.** Change the address
>   and the answer becomes `unproven` **with nothing written** (CHV-11).
> - **G4 — status is derived.** An expired challenge reads correctly with no
>   sweep having run (CHV-12).
>
> **Self-isolated.** Folder 10 mints its own account with a per-run unique handle,
> so it never disturbs `verify_alice`/`verify_bob`. The run's identity is
> `{{cvUsername}}`; its captured code is `{{cvCode}}`.
>
> **Setup precondition.** The server must run with `MAIL_MODE=capture`, which
> writes each message to `.mail-capture/`. Without it the code is unobtainable and
> CHV-06 onward cannot run.
>
> **And the migrations must be applied**, `mail_send_attempts` included. Every
> send passes through the mail mechanism's abuse controls, which **fail closed**
> when their state cannot be read: an unapplied migration turns CHV-01 into a
> `refused` produced by a correctly-behaving system. Read that answer as a missing
> migration, never as a defect in the capability.
>
> **Three ordering constraints, all consequences rather than preferences.**
> **CHV-13 must run last** — eleven confirmations exhaust the per-IP budget for
> fifteen minutes and would block everything after it. **CHV-12 needs a restart**
> with a short `CHANNEL_VERIFICATION_CHALLENGE_TTL_MS`, because the default
> fifteen minutes is not waitable by hand and shortening it for the whole folder
> would expire codes before they can be pasted. And **CHV-13 depends on that
> restart**: CHV-04, 05, 06, 08 and CHV-10's two spend six confirmations before it
> begins, so against a budget of ten the limiter would otherwise engage on its
> *fifth* attempt rather than its eleventh. The restart clears the in-memory
> counter — skipping CHV-12 breaks CHV-13's arithmetic.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CHV-01 | Setup registered; server in `MAIL_MODE=capture` | `POST /channel-verification/challenges` (Bearer) | **202**; `data.delivery = "accepted"` | one `channel_verifications` row; one open challenge, `secret_hash` a **64-hex digest** (Checkpoint I) | via reset | ✅ |
| CHV-02 | CHV-01 | `GET /users/me` | 200; `emailVerification = "pending"` | — | — | ✅ |
| CHV-03 | CHV-01, within 60s | `POST …/challenges` again | **429** `too_many_requests` — the per-address cooldown (**D2**) | no second open challenge | — | ✅ |
| CHV-04 | CHV-01 | `POST …/challenges/confirm {code:"ZZZZZZZZZZZZ"}` | **400** `bad_request`, *"That verification code is not valid."* | challenge **still open** — a wrong guess does not consume it | — | ✅ |
| CHV-05 | CHV-01 | confirm `{code:"!!"}` (malformed) | **byte-identical** to CHV-04 — not a `422`, no field errors (**G2**) | unchanged | — | ✅ |
| CHV-06 | CHV-01; code read from `.mail-capture/` | confirm with that code | **204**, empty body | challenge `closed_at` set, `closed_reason = 'verified'`; record `proven_at` set (Checkpoint I) | via reset | ✅ |
| CHV-07 | CHV-06 | `GET /users/me` | 200; `emailVerification = "proven"` | **no verification column on `users`** (Checkpoint I) | — | ✅ |
| CHV-08 | CHV-06 | confirm with the **same** code again | **byte-identical** to CHV-04 — a replay is indistinguishable from a wrong value (**G2**, **D5**) | unchanged | — | ✅ |
| CHV-09 | — | `POST …/challenges` with **no** Bearer | **401** `unauthorized` | none | — | ✅ |
| CHV-10 | CHV-06; wait out the 60s cooldown | issue again, then confirm with the **superseded** code, then the **current** one | superseded → **400**; current → **204** (**D2** rotation) | prior challenge `closed_reason = 'superseded'` | via reset | ✅ |
| CHV-11 | CHV-06 (`proven`) | move `users.email` (see the runbook — no endpoint exists), then `GET /users/me` | 200; `emailVerification = "unproven"` (**G3**) | capability rows **unchanged** — reading wrote nothing | restore address | ✅ |
| CHV-12 | Restart with a short TTL; a fresh unproven address | issue, wait past expiry, `GET /users/me` — **run no sweep** | `pending` → **`unproven`** (**G4**, **I8**) | the expired challenge row is **still present**, unswept — no writer was needed | via reset | ✅ |
| CHV-13 | **Run last**, and **after CHV-12's restart** — six confirmations are already spent | eleven confirmations in a row | attempts 1–10 → 400; **attempt 11 → 429** `rate_limit` (**D5**) | unchanged | wait 15 min or restart | ✅ |

> **Two different `429`s, deliberately.** CHV-03 is the capability's own
> per-address cooldown (`type: "too_many_requests"`) — the durable control. CHV-13
> is the per-IP limiter in front of the route (`type: "rate_limit"`) — the cheap
> outer layer, which cannot stop one address being targeted from many IPs. Reading
> them as the same thing would misattribute which control is doing the work.

## 11 · Password reset (PWR)

Recovery for an account whose password its owner no longer has. What this folder
verifies, in one line each:

> - **G1 — one answer, whatever happened.** An address no account has, a real
>   address, and a real address inside its cooldown produce a **byte-identical**
>   response (PWR-01/02/03). This is the guarantee the whole capability is shaped
>   around, and it is the one Channel Verification deliberately does *not* make:
>   that surface is authenticated, so it can afford to report a cooldown.
> - **G2 — one failure shape.** Wrong, malformed, spent and never-issued are
>   reported identically (PWR-04/05/13). The single carve-out is an **absent**
>   value, which is a malformed request rather than an answer about a code
>   (PWR-06) — and it discloses nothing, since the caller knows they sent nothing.
> - **G3 — confirm checks, apply consumes.** The same code confirms twice
>   (PWR-07/08) and is spent exactly once (PWR-10/13).
> - **G4 — a reset ends every session.** Two sessions exist before it and none
>   after (PWR-10, Checkpoint J), and the flow returns to Login rather than
>   signing anyone in.
> - **G5 — spent/expired is derived.** An expired credential is refused with no
>   sweep having run, and its row is still there (PWR-14, **I8**).
>
> **Self-isolated.** The folder mints its own account with a per-run unique handle,
> so it never disturbs `verify_alice`/`verify_bob`. The run's identity is
> `{{pwrUsername}}`; its captured code is `{{pwrCode}}`.
>
> **Setup precondition.** The server must run with `MAIL_MODE=capture`, which
> writes each message to `.mail-capture/` relative to the API process's working
> directory. Without it the code is unobtainable and PWR-07 onward cannot run.
>
> **And the migrations must be applied**, `password_reset_challenges` and
> `mail_send_attempts` both. Every send passes through the mail mechanism's abuse
> controls, which **fail closed** when their state cannot be read: an unapplied
> migration turns PWR-02 into a silent no-send produced by a correctly-behaving
> system. Read that as a missing migration, never as a defect.
>
> **Two ordering constraints, both consequences rather than preferences.**
> **PWR-14 needs a restart** with a short `RESET_CODE_TTL_MS`, because the default
> ten minutes is not waitable by hand and shortening it for the whole folder would
> expire codes before they can be pasted. **PWR-15 must run last, and after its
> own restart** — it exhausts the per-IP request budget for fifteen minutes and
> would block everything after it. It starts from a cleared counter deliberately,
> rather than from an exact count of every request above it: folder 10's CHV-13
> documents that arithmetic and a runner has to get it right, and this avoids
> needing to.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| PWR-01 | Setup registered; server in `MAIL_MODE=capture` | `POST /auth/password-reset` for an address **no account has** | **202**; body `{"success":true,"data":null}`; **no `Retry-After`** | no `password_reset_challenges` row (Checkpoint J) | — | ☐ |
| PWR-02 | PWR-01 | same request for the **real** address | **202**, **byte-identical** to PWR-01 (**G1**) | one row, `code_hash` a **64-hex digest**, `used_at` null (Checkpoint J) | via reset | ☐ |
| PWR-03 | PWR-02, within 60s | same request again | **202**, **byte-identical** again — the cooldown is silent (**G1**) | **still one row** — no second credential minted | — | ☐ |
| PWR-04 | PWR-02 | `POST …/confirm {code:"ZZZZZZZZZZZZ"}` | **400** `bad_request`, *"That reset code is not valid."*, **no field errors** | row unchanged | — | ☐ |
| PWR-05 | PWR-02 | confirm `{code:"!!"}` (malformed) | **byte-identical** to PWR-04 — **not** a `422` (**G2**) | unchanged | — | ☐ |
| PWR-06 | — | confirm `{code:""}` | **422** `validation` with a `code` field error — a malformed *request* (**G2**) | unchanged | — | ☐ |
| PWR-07 | PWR-02; code read from `.mail-capture/` into `{{pwrCode}}` | confirm with that code | **204**, empty body | row **unchanged** — `used_at` still null (**G3**) | — | ☐ |
| PWR-08 | PWR-07 | confirm with the **same** code again | **204** again — confirm consumed nothing (**G3**) | unchanged | — | ☐ |
| PWR-09 | PWR-07 | `POST …/apply` with `{newPassword:"weak"}` — **the code is not the caller's to send** | **422** `validation`, field error on `newPassword` | **row still unspent** — a weak password never costs the code | — | ☐ |
| PWR-10 | PWR-09 | apply with a **compliant** password | **204**, empty body, **no tokens** (**D2**); `Set-Cookie` **clears** the position key with the attributes it was set with | `used_at` set; **`refresh_tokens` for this account empty** (**G4**, Checkpoint J) | via reset | ☐ |
| PWR-11 | PWR-10 | `POST /auth/login` with the **new** password | **200** | a single new session row | — | ☐ |
| PWR-12 | PWR-10 | login with the **old** password | **401** `unauthorized`, the generic credential error | unchanged | — | ☐ |
| PWR-13 | PWR-10 | apply again, the position now cleared | **byte-identical** to PWR-04 — a replay is indistinguishable from a value that never existed (**G2**) | unchanged | — | ☐ |
| PWR-14 | Restart with a short `RESET_CODE_TTL_MS`; request a fresh code | wait past expiry, then confirm — **run no sweep** | **400**, identical to PWR-04 (**G5**, **I8**) | the expired row is **still present**, unswept — no writer was needed | via reset | ☐ |
| PWR-15 | **Run last**, after a restart clearing the in-memory counter | six requests in a row | attempts 1–5 → **202**; **attempt 6 → 429** `rate_limit` | unchanged | wait 15 min or restart | ☐ |

> **Why there is no `429` here that the capability itself produced.** Folder 10 has
> two different `429`s — a per-address cooldown and a per-IP limiter — and reading
> them as the same thing would misattribute which control is doing the work. This
> folder has only the second. The cooldown is real and durable, but it is
> **silent** (PWR-03): reporting it would disclose that the address belongs to an
> account, which is precisely what **G1** forbids.

> **What this folder does not cover, and why.** The **reserved recovery floor** —
> that a burst of verification traffic cannot exhaust the per-recipient budget
> recovery needs — is not hand-drivable. Reaching the general limit takes 15 sends
> to one address, and the only consumer that produces them is Channel
> Verification's issue endpoint, whose per-IP limiter is 10 per 15 minutes and is a
> **code literal, not configuration**. Seeding `mail_send_attempts` directly would
> be exactly the precondition the plan forbids. The property is proven where it
> can be: `recipientCapReserve.integration.test.ts`, two tests against real
> Postgres.
