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
- **Referrer tags**: `tweet:{tweetId}`, `user-avatar:{userId}`, `comment:{commentId}`.
- **Unreferenced** = an owned object (`uploader_id` set) with no ledger row — the
  single M11 reclamation target. (The pre-auth grant "abandoned" class was retired
  with the upload grant, ADR 0008.) See the runbook's terminology section.

---

## 1 · Authentication

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| AUTH-01 | Clean DB | Register User A | 201; `{user, accessToken}`; `user` carries no profile fields; refresh + `qt_session` cookies set | `users` row for A; a `refresh_tokens` row | — | |
| AUTH-02 | AUTH-01 | Register User B | 201; distinct user | second `users` row | — | |
| AUTH-03 | AUTH-01 | Login A (correct) | 200; new `accessToken`; refresh cookie rotated | new `refresh_tokens` row | — | |
| AUTH-04 | AUTH-03 | `GET /users/me` with Bearer A | 200; identity matches A | — | — | |
| AUTH-05 | AUTH-03 | POST /refresh (cookie) | 200; new `accessToken`; cookie rotated | old refresh token replaced by new | — | |
| AUTH-06 | AUTH-03 | Logout | 204; cookies cleared | A's current `refresh_tokens` row removed | — | |
| AUTH-07 | AUTH-03 (multi-session) | Logout-all | 204 | **all** A's `refresh_tokens` rows removed | — | |
| AUTH-08 | AUTH-01 | Register duplicate username | 409 `conflict` | no new row | — | |
| AUTH-09 | AUTH-01 | Login wrong password | 401 `unauthorized` | no new refresh token | — | |
| AUTH-10 | Logged out | Refresh with no cookie | 401 | — | — | |
| AUTH-11 | — | `GET /users/me` with no token | 401 `unauthorized` | — | — | |
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
| TWT-07 | TWT-08 (A1 owned by A, now unreferenced) | Create tweet with `media:[A1, <a token that fails attach>]` | 422; whole request fails | **rollback**: no tweet, no `tweet_media`, no ledger row for A1 (Checkpoint G) | — | |
| TWT-08 | TWT-01 | Delete the tweet | 204 | tweet + `tweet_media` gone; **ledger rows gone**; objects survive `status=ready`, `uploader_id` set → **unreferenced** (Checkpoint E) | — | |
| TWT-09 | A owns A1; B owns B1 | A creates tweet with `media:[B1]` (cross-principal) | 422; error **does not name** the token | rollback — nothing persisted | — | |
| TWT-10 | Login A | Create tweet with the **same** token twice | 422 `validation` | no tweet | — | |
| TWT-11 | Login A | Create tweet with 5 tokens (> MAX) | 422 `validation` | no tweet | — | |
| TWT-12 | A owns tweet T; login B | B deletes A's tweet | 403 / 404 | A's tweet untouched | — | |
| TWT-13 | After TWT-08 | Run the **global invariant** (Checkpoint F) | — | all four counts = 0 | — | |

## 5 · Comments

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CMT-01 | Live tweet T; login A | Create comment on T | 201; comment body | `comments` row (author A, tweet T) | via CMT-04 | |
| CMT-02 | CMT-01 | List comments `?tweetId=T` | 200; includes the comment; **cursor meta** (`nextCursor` / `hasMore`, no `currentPage`); the comment carries `parentId: null` and a `repliesCount` | — | — | |
| CMT-03 | CMT-01 | Update own comment | 200; edited body | row updated | — | |
| CMT-04 | CMT-01 | Delete own comment | 204 | `comments` row removed | — | |
| CMT-05 | Comment by A; login B | B updates A's comment | 403 | unchanged | — | |
| CMT-06 | Folder 08's cascade tweet, deleted with its comment (E5) | List comments for that tweet (E6) | **404** `not_found` — the tweet is gone | no `comments` rows for it (CM-5) | — | |

## 5c · The comment thread — two levels, pages and cascade ([#799](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/799))

> **Self-isolated and non-destructive.** Folder 12 mints its own account with a
> per-run handle and its own two posts, so it collides with no other folder and
> needs no reset. **12.1 runs from the command line** (`npm run verify:thread`)
> because every guarantee in it is visible in a response body. **12.2's ledger
> half cannot**: whether a removed reply's media reference ended is invisible to
> every endpoint by design, so that half is **Checkpoint K** in pgAdmin.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CMT-T01 | Folder 12.1 setup (own account, two posts) | Create a top-level comment | 201; `parentId: null`, `repliesCount: 0` | `comments` row, `parent_id` NULL | via CMT-T14 | |
| CMT-T02 | CMT-T01 | Create a reply naming that comment | 201; `parentId` = the parent; **no** `repliesCount` | `comments` row, `parent_id` set, **same `tweet_id`** | via CMT-T14 | |
| CMT-T03 | CMT-T02 | Reply to the **reply** | **422**; the error names `parentId` | nothing written | — | The thread is two levels. Refused, never re-pointed at the comment above. |
| CMT-T04 | Folder 12.1 setup | Create a reply naming a parent that does not exist | **404** | nothing written | — | The answer a missing tweet already gets. |
| CMT-T05 | CMT-T01 | Create a reply on post B naming a parent on post A | **422**; the error names `parentId` | nothing written | — | |
| CMT-T06 | CMT-T01, CMT-T02 | List `?tweetId=` | 200; **the reply is absent**; the parent reports `repliesCount: 1`; `hasMore false`, `nextCursor null` | — | — | |
| CMT-T07 | CMT-T02 | List `?parentId=` | 200; the reply, and it alone; no `repliesCount` on it | — | — | |
| CMT-T08 | — | List with neither `tweetId` nor `parentId` | **422** | — | — | |
| CMT-T09 | — | List with **both** | **422** | — | — | `parentId` already determines the tweet; refused rather than arbitrated. |
| CMT-T10 | — | List `?parentId=` for a comment that does not exist | **404** | — | — | |
| CMT-T11 | CMT-T01, CMT-T02 | Read the post | 200; `commentsCount` = **2** | — | — | One comment and one reply. The count covers both levels. |
| CMT-T12 | Folder 12.1 done | Upload an object (Bearer, this run's account) | 201; token | `media_objects` row, `status=ready` | — | Checkpoint K needs a reference to watch. |
| CMT-T13 | CMT-T12 | Create a **second reply carrying that image** | 201 | `comments` row with `media_id`; **ledger: one `comment:{id}` row** | via CMT-T14 | **Record Checkpoint K "before" here.** |
| CMT-T14 | CMT-T13 | **Delete the top-level comment** | 204 | **both replies and the parent gone**; every `comment:{id}` ledger row for them **ended**; the object survives `ready` + owned → **unreferenced** (Checkpoint K) | — | One transaction. |
| CMT-T15 | CMT-T14 | List `?tweetId=` | 200; **empty** | no `comments` rows for the post | — | |
| CMT-T16 | CMT-T14 | List `?parentId=` for the deleted parent | **404** | — | — | The list goes with its parent. |
| CMT-T17 | CMT-T14 | Read the post | 200; `commentsCount` = **0** | — | — | Both levels left the count. |
| CMT-T18 | A comment with a reply under it | **In pgAdmin**, raw `DELETE FROM comments WHERE id = <parent>` | DB **refuses**: FK violation on `comments_parent_id_fkey` (`ON DELETE RESTRICT`) | parent + reply untouched (wrap in `BEGIN … ROLLBACK`) | ROLLBACK | The backstop. A bypass fails loudly instead of leaking. |

> **CMT-T14's DB column is Checkpoint K**, in the
> [runbook](verification-runbook.md#checkpoint-k--the-reply-cascade-folder-12). **CMT-T18**
> is pgAdmin-only, exactly as CMT-M11 is: no endpoint can ask the database to
> bypass the application.

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
| LIK-01 | Live tweet T; login B | **`PUT`** T's like | 200; `liked:true`, with a `likesCount` | `likes` row (B,T) | via LIK-03 | |
| LIK-02 | LIK-01 | `PUT` it **again** | 200 — **never `409`**; still `liked:true`, and the count **has not moved** | still exactly one row | — | The failure the toggle had: a second press must not undo the first |
| LIK-03 | LIK-01 | **`DELETE`** T's like | 200; `liked:false` | row removed | — | |
| LIK-04 | LIK-03 | `DELETE` it **again** | 200 — **never `404`** for being redundant; still `liked:false` | still no row | — | |
| LIK-05 | — | **`POST`** T's like — the retired toggle | **404** — the verb is no longer routed | unchanged | — | |
| LIK-06 | — | `PUT` a non-existent tweet's like | 404 | no row | — | |
| LIK-07 | — | `DELETE` a non-existent tweet's like | 404 | no row | — | |
| LIK-08 | — | `PUT` with **no** Authorization header | 401 | no row | — | The request sets `noauth`: the collection carries a bearer at its root, so a request that merely omits one still inherits it |

## 6b · Comment likes ([#805](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/805))

> **Self-isolated and non-destructive**, like folders 10–12: its own account with
> a per-run handle, its own post and comments. **It runs whole from the command
> line** (`npm run verify:likes`) and needs **no pgAdmin** — which is the
> difference from folder 12. A like holds no media reference, so nothing about it
> is invisible to the API: the body carries the count and the state alike.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CML-01 | Folder 13 setup (own account, post, comment, reply) | `PUT` the comment's like | 200; `liked:true`, `likesCount` 1 | one `comment_likes` row | via CML-11 | A fresh comment is asserted to start at 0 / false in setup |
| CML-02 | CML-01 | `PUT` it again | 200; still `liked:true`, **still count 1** | still one row | — | Idempotent — the unique pair, not a check |
| CML-03 | Setup | `PUT` the **reply's** like | 200; `liked:true` | one row | via CML-11 | A reply is a comment; one relation covers both levels |
| CML-04 | CML-01 | Read the thread **as the reader** | 200; `likesCount` 1, `isLiked` **true** | — | — | |
| CML-05 | CML-01 | Read the thread **as a guest** | 200; `likesCount` 1, `isLiked` **false** | — | — | The count is public; only the state is personal. `noauth` — see LIK-08 |
| CML-06 | CML-03 | Read the replies list | 200; the reply reports its like and state | — | — | |
| CML-07 | CML-01 | `DELETE` the comment's like | 200; `liked:false`, count 0 | row removed | — | |
| CML-08 | CML-07 | `DELETE` it again | 200 — not a `404`; still `liked:false` | still no row | — | |
| CML-09 | — | `PUT` a non-existent comment's like | 404 | no row | — | |
| CML-10 | — | `PUT` with no Authorization header | 401 | no row | — | `noauth` |
| CML-11 | CML-03 | **Delete the comment** | 204 | the comment, its reply, **and both likes** gone — by cascade, with nothing in the application ending them | — | |
| CML-12 | CML-11 | Read the replies list of the deleted parent | 404 | — | — | |

## 7 · Follows

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| FOL-01 | A, B exist; login B | B follows A | 200; `isFollowing:true`, `followersCount` | `follows` row (B→A) | via FOL-05 | |
| FOL-02 | FOL-01 | List A's followers | 200; B present; cursor meta | — | — | |
| FOL-03 | FOL-01 | List B's following | 200; A present | — | — | |
| FOL-04 | FOL-01 | GET /users/A (as B) | 200; `isFollowing:true`, counts present | — | — | |
| FOL-05 | FOL-01 | B unfollows A | 200; `isFollowing:false` | `follows` row removed | — | |
| FOL-06 | login B | B follows A **twice** | **409** `conflict` — already following; no duplicate | single `follows` row (unique pair) | — | |

## 7b · Follow state — what every Follow button reads ([#810](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/810))

> **The graph is asymmetric on purpose.** B follows A and A does not follow back,
> so the two directions can be told apart — a mutual pair would pass whichever way
> the fields were wired. Folder 07 is **not** self-isolated: it needs folder 01's
> tokens and handles, so seed them if folder 09 has already run (see the runbook).

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| FOL-01 | B follows A | Read **A's profile as B** | 200; `isFollowing: true`, `followsYou: false` | — | — | B follows A; A does not follow back |
| FOL-02 | FOL-01 | Read **B's profile as A** | 200; `isFollowing: false`, `followsYou: true` | — | — | The mirror image — this is what *Follow back* is drawn from |
| FOL-03 | FOL-01 | Read A's profile **as a guest** | 200; both `false` | — | — | `noauth` — see the runbook's note on inherited bearers |
| FOL-04 | — | Read **your own** profile | 200; both `false` | — | — | Self-follow is refused, so the pair cannot say otherwise |
| FOL-05 | FOL-01 | Read **A's followers as A** | 200; the row reads `isFollowing: false`, `followsYou: true` | — | — | The row is B, who follows A and is not followed back |
| FOL-06 | FOL-01 | Read **B's following as B** | 200; the row reads `isFollowing: true`, `followsYou: false` | — | — | |
| FOL-07 | FOL-01 | Read A's followers **as a guest** | 200; both `false`, **and the list still reads** | — | — | `noauth`. Optional auth widens what is answered, never who may ask |
| FOL-08 | A post by A | Read **A's timeline as B** | 200; `author.isFollowing: true`, `author.followsYou: false` | — | — | The ⋯ menu draws its button from this, with no second request |
| FOL-09 | A comment on that post | Read **its comments as B** | 200; the comment's author has **neither** field | — | — | The boundary: `AuthorEmbed` is shared, and only a post's author was widened |

## 7c · The edited marker — and mostly, what is not an edit ([#813](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/813))

> **The rule is narrow on purpose.** An edit is a change to the **text**. An image
> added, replaced, removed or reordered is **not**, and neither is re-saving the
> same words — which still moves `updatedAt`, and is exactly why the marker is a
> column of its own. Folder 14 is **self-isolated** and runs whole from the
> command line; **EDT-05 lives in folder 04**, where the media-only PATCH already
> is, and folder 04 needs `--working-dir`.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| EDT-01 | Folder 14 setup | Create a post | 201; `editedAt: null` | `edited_at` NULL | — | Nothing is born edited |
| EDT-02 | EDT-01 | Create a comment on it | 201; `editedAt: null` | NULL | — | |
| EDT-03 | EDT-01 | PATCH the post's **text** | 200; `editedAt` **set** | `edited_at` set | — | |
| EDT-04 | EDT-03 | PATCH the **same words again** | 200; `editedAt` **unchanged** | unchanged | — | `updatedAt` moves here; the marker does not |
| **EDT-05** | Folder 04: a text edit, then a **media-only** reorder | PATCH media only | 200; `editedAt` **neither set nor refreshed** | unchanged | — | **In folder 04.** Its `EDT-05a` asserts the preceding text edit did mark it, so this is a real before/after |
| EDT-06 | EDT-03 | PATCH the post's media only | 200; `editedAt` unchanged | unchanged | — | The marker is never taken back |
| EDT-07 | EDT-02 | PATCH the comment's **text** | 200; `editedAt` set | set | — | |
| EDT-08 | EDT-07 | PATCH the comment's image away | 200; `editedAt` unchanged | unchanged | — | |
| EDT-09 | EDT-03 | Read the post **as a guest** | 200; `editedAt` as set | — | — | The marker is public |
| EDT-10 | EDT-02 | Read the thread | 200; the row has `editedAt` and **no `updatedAt`** | — | — | Deliberate — comments never had one and this did not add one |

## 7d · The character rule — a code point, counted after trimming ([#818](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/818))

> **What the folder proves.** A body is trimmed, then measured in **code
> points**, the unit the design's counter counts: an emoji counts once, not as
> its two UTF-16 units. A body of white space alone is refused rather than
> stored empty. Folder 15 is **self-isolated** and runs whole from the command
> line.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| CHR-01 | Folder 15 setup | Create a post of **280 emoji** | 201; the body returned whole, 280 code points | stored whole | — | Refused before #802: it is 560 UTF-16 units |
| CHR-02 | Setup | Create a post of **281 emoji** | 422; `body`: "Tweet body must be at most 280 characters" | — | — | |
| CHR-03 | Setup | Create a post of spaces, a tab and a line end | 422; `body`: "Tweet body cannot be empty" | — | — | Stored as `""` before #801 |
| CHR-04 | Setup | Create a post of `"   hello   "` | 201; body `"hello"` | stored trimmed | — | Padding is neither stored nor counted |
| CHR-05 | CHR-01 | PATCH the post to spaces | 422; "Tweet body cannot be empty" | unchanged | — | The rule binds edits too |
| CHR-06 | CHR-01 | Comment **280 emoji** on it | 201; body returned whole | stored whole | — | |
| CHR-07 | CHR-01 | Comment two **no-break spaces** | 422; "Comment body cannot be empty" | — | — | Trimming removes Unicode white space, not only ASCII |
| CHR-08 | CHR-06 | PATCH the comment to **281 emoji** | 422; "Comment body must be at most 280 characters" | unchanged | — | |
| CHR-09 | CHR-01 | Read the post **as a guest** | 200; the 280 emoji intact | — | — | `noauth`, so the root bearer does not make it a signed-in read |

## 7e · Text safety — what other readers are shown ([#822](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/822))

> **What the folder proves:**
> - Text other readers see is **stored in NFC**.
> - It **refuses a direction control** without repeating it.
> - Text made only of **invisible characters counts as empty**, which means
>   refused for a body and a name and cleared for a bio.
> - **A name of spaces is refused** (#819).
>
> Folder 16 is **self-isolated** and runs whole from the command line.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| TXT-01 | Folder 16 setup | Post `Cafe` + U+0301 (decomposed) | 201; body `Café` composed | stored in NFC | — | |
| TXT-02 | Setup | Post containing **U+202E** | 422; "Tweet body cannot contain text-direction control characters" | — | — | The response text is checked for the character |
| TXT-03 | Setup | Post Arabic ending in **U+200F** (a mark) | 201; the mark kept | stored | — | Marks are not controls |
| TXT-04 | Setup | Post of **zero-width spaces** alone | 422; "Tweet body cannot be empty" | — | — | Invisible is empty |
| TXT-05 | TXT-01 | Comment containing **U+2066** | 422; "Comment body cannot contain …" | — | — | Not echoed |
| TXT-06 | Setup | PATCH `name: "   "` | 422; "Name is required" | unchanged | — | **#819**: stored `""` before |
| TXT-07 | Setup | PATCH `name` = U+200B | 422; "Name is required" | unchanged | — | |
| TXT-08 | Setup | PATCH `name` containing **U+202E** | 422; "Name cannot contain …" | unchanged | — | Not echoed |
| TXT-09 | Setup | PATCH `name: "Rene"` + U+0301 | 200; `René` composed | stored in NFC | — | |
| TXT-10 | TXT-09 | PATCH `bio` = U+200B U+200D | 200; `bio: ""` | cleared | — | A bio is cleared, not refused |
| TXT-11 | TXT-10 | PATCH `bio` containing **U+2067** | 422; "Bio cannot contain …" | unchanged | — | Not echoed |
| TXT-12 | TXT-10 | Read the profile **as a guest** | 200; `René`, `bio: ""` | — | — | `noauth` |
| TXT-13 | TXT-01 | Read the post **as a guest** | 200; `Café` composed | — | — | `noauth` |

## 7f · The edit limit — ten post edits an hour, per account ([#826](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/826))

> **What the folder proves:**
> - Editing a post is limited **per account**, not per address.
> - The eleventh edit in an hour is refused with its **own type** and a
>   `Retry-After`.
> - Comment edits are not included.
> - The limit sits **after authentication**.
>
> Folder 17 is **self-isolated**: two new accounts per run.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| EDL-01 | Setup: accounts A and B; A's post and comment; B's post | A edits the post **ten times** | 200 each | edited | — | One request, queued ten times |
| EDL-02 | EDL-01 | A edits it an **eleventh** time | **429**; `type: "edit_rate_limit"`, its own message, `Retry-After` > 0 | unchanged | — | Not `rate_limit`: the frontend words the two differently |
| EDL-03 | EDL-02 | A edits the **comment** | 200 | edited | — | Posts only |
| EDL-04 | EDL-02 | **B**, from the same address, edits B's post | 200 | edited | — | Per account, not per IP |
| EDL-05 | EDL-02 | An **unsigned** edit of A's post | **401**, not 429 | unchanged | — | `noauth`: the limit counts accounts, so it runs after authentication |

## 7g · Suggested accounts — who to follow ([#831](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/831))

> **What the folder proves:**
> - A reader is suggested the people their follows follow, **the more followed
>   first**, and never themselves or anyone they follow.
> - The viewed profile is left out.
> - Each row says who would be followed back.
> - A guest gets a list with no follow state.
>
> Folder 18 is **self-isolated**: five new accounts and their follows per run.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| SUG-01 | Setup: A→B, B→C, B→D, E→D, C→A | A asks, no parameters | 200; three rows; **D then C** first; no `meta` | — | — | Both followed by B; D has more followers |
| SUG-02 | Setup | A asks with `limit=20` | 200; neither A nor B; at most 20 | — | — | Never the reader, never anyone followed |
| SUG-03 | Setup | A asks with `exclude=` D's handle | 200; C first; no D | — | — | The viewed profile |
| SUG-04 | Setup | A asks | 200; C's row `followsYou: true`, `isFollowing: false` | — | — | What Follow back is drawn from |
| SUG-05 | — | A **guest** asks | 200; three rows, both flags false on every row | — | — | `noauth` |
| SUG-06 | — | Ask with `limit=21` | 422; `limit` named | — | — | Bounded, not paged |

## 7h · Trending ([#835](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/835))

> **What the folder proves:**
> - A hashtag trends from **two posts**, each post counted **once**, and shows
>   **the spelling most posts used**.
> - A hashtag in **one post**, in a **comment**, or **inside a web address**
>   does not trend.
> - An **edit** to a post's text, and **deleting** the post, take its count
>   away.
> - A **guest** reads it, and a signed-in reader gets the same list.
>
> Folder 19 is **self-isolated**: one new account, hashtags named for the run,
> and its own posts deleted at the end. The seven-day window's edges are not
> here: a post cannot be backdated over HTTP, so the integration lane owns them.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| TRD-01 | Setup: P1 `#Hot…`, P2 `#hot…`, P3 `#Hot… #HOT…`, P4 and P5 `#Pair…`, P6 `#Solo…` with a comment `#Solo…`, P7 `https://example.com/#Solo…` | A **guest** asks | 200; no `meta`; at most five rows of `{ tag, tweetsCount }`, each tag with its `#`, each count at least 2; `RateLimit-Policy` carries `q=100; w=900` | — | — | `noauth`; the general limiter |
| TRD-02 | Setup | A guest asks | Hot: `#Hot…`, **3**; Pair: 2, after Hot | — | — | P3 writes Hot twice and counts once; two posts spelled it `Hot` |
| TRD-03 | Setup | A guest asks | Solo absent | — | — | One post; a comment; a web address |
| TRD-04 | TRD-01 | The account asks | 200; the same list as TRD-01 | — | — | No per-reader state |
| TRD-05 | Setup | P5's text is edited to hold no hashtag; a guest asks | Pair absent | — | — | One post left |
| TRD-06 | TRD-05 | P1 is deleted; a guest asks | Hot: **2** | — | Every remaining post deleted; Hot and Pair then absent | The count goes with the post |

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

## Verification run — The comment thread (2026-09-23)

**Run against `feat/799-comment-thread-replies`, on the backend worktree's own
port (`4001`) and database (`quicktweets_w2`). All of CMT-T01…CMT-T18 passed, and
Checkpoint K matched exactly.** Newman: folder 12.1, **14 requests / 24 assertions,
0 failures**; folder 12.2, **6 requests / 8 assertions, 0 failures**, run in two
legs with Checkpoint K read between them. Folder 05 re-run after its CMT-02 change:
**6 requests / 9 assertions, 0 failures**.

| Scenario | Outcome |
|---|---|
| CMT-T01/T02 — a comment, then a reply naming it | ✅ `parentId` null then set; `repliesCount` on the parent only |
| CMT-T03 — reply to a reply | ✅ 422 naming `parentId`; nothing written |
| CMT-T04/T05 — parent absent / parent on another post | ✅ 404 and 422 respectively — the two refusals stay distinct |
| CMT-T06/T07 — the two lists | ✅ the reply is absent from the thread and alone in its own list |
| CMT-T08/T09/T10 — neither, both, and a missing parent | ✅ 422, 422, 404 |
| CMT-T11 — the post's count | ✅ 2 — one comment and one reply |
| CMT-T13/T14 — the cascade | ✅ 204; both replies and the parent gone in one transaction |
| **Checkpoint K** | ✅ before: 3 comments, ledger `["comment:97"]`. After: 0 comments, ledger `[]`, object `2531` still `ready` + owned, `refs = 0` → **unreferenced** |
| CMT-T15/T16/T17 — after the cascade | ✅ empty thread, 404 on the replies list, count back to 0 |
| CMT-T18 — the raw-delete backstop | ✅ refused: `violates RESTRICT setting of foreign key constraint "comments_parent_id_fkey"`; rolled back |

**One thing the run found, and it was not in the code.** Folder 05 first answered
401 throughout and looked broken. It was not: folder 09 had renamed the two
harness users in this database, leaving `verify_alice` free but
`alice@verify.local` taken, so `Register — User A` answered 409 and
`{{accessTokenA}}` stayed empty. Seeding the two tokens by logging in on the
**email** made folder 05 pass unchanged, 9/9. The trap is now written up in the
[runbook](verification-runbook.md#folder-01-cannot-re-register-once-folder-09-has-run-test-only-friction).

---

## Verification run — Likes, set and cleared (2026-09-23)

**Run against `feat/805-likes-on-comments`, on the backend worktree's own port
(`4001`) and database (`quicktweets_w2`). All of LIK-01…LIK-08 and
CML-01…CML-12 passed.** Newman: folder 13, **16 requests / 25 assertions, 0
failures**; folders 05 + 06 together, **14 requests / 22 assertions, 0 failures**;
folder 12.1 re-run because the comment payload changed under it, **24 assertions,
0 failures**.

| Scenario | Outcome |
|---|---|
| LIK-01/02 — `PUT`, then `PUT` again | ✅ 200 both times, count unmoved; no `409` |
| LIK-03/04 — `DELETE`, then again | ✅ 200 both times; no `404` for redundancy |
| LIK-05 — the retired toggle | ✅ `POST …/like` answers 404; the verb is gone |
| LIK-06/07/08 — missing tweet, and no reader | ✅ 404, 404, 401 |
| CML-01/02/03 — comment, again, and a reply | ✅ idempotent; a reply likes like anything else |
| CML-04/05 — reader vs guest | ✅ same `likesCount`, `isLiked` true then false |
| CML-06 — the replies list | ✅ carries both fields |
| CML-07/08 — clear, and clear again | ✅ count 0, and not a refusal |
| CML-09/10 — missing comment, no reader | ✅ 404, 401 |
| CML-11/12 — delete the comment | ✅ 204; both likes gone by cascade, replies list 404s |

**One thing the run found, and it was in the harness rather than the code.**
LIK-08, CML-05, CML-10 and CML-12 first passed for the wrong reason. The
collection carries a bearer token at its **root**, so a request that merely omits
`auth` inherits it — those four only behaved as unauthenticated because
`accessTokenA` happened to be empty in the environment they were first run
against. Re-run with a populated environment, LIK-08 failed and exposed it. All
four now set `noauth` explicitly, and the trap is written up in the
[runbook](verification-runbook.md#a-request-that-omits-auth-still-sends-one).

---

## Verification run — Follow state (2026-09-23)

**Run against `feat/810-follow-state`, on the backend worktree's own port (`4001`)
and database (`quicktweets_w2`). All of FOL-01…FOL-09 passed.** Newman: folder 07,
**17 requests / 30 assertions, 0 failures**. Re-run because the payloads changed
under them: folder 04 **25 assertions**, folder 12.1 **24**, folder 13 **25** — all
0 failures.

| Scenario | Outcome |
|---|---|
| FOL-01/02 — the pair, from each side | ✅ `true/false` then `false/true`; the directions are distinguishable |
| FOL-03/07 — a guest, on a profile and on a list | ✅ both `false`, and both still readable |
| FOL-04 — your own row | ✅ both `false` |
| FOL-05/06 — both list tabs | ✅ each row reports the reader's own side |
| FOL-08 — a post's author | ✅ carries the pair |
| FOL-09 — a comment's author | ✅ carries neither |

**One thing the run cost time, and it was not the code.** Folder 04 first reported
15 failures — every one of them `file load error: "fixtures/sample.png", no such
file`. Folder 04 uploads by **relative** path, so it needs
`--working-dir docs/development/verification`, exactly as folder 12.2 does. Run
that way it passes 25/25 untouched. The flag is now named for folder 04 in the
runbook rather than only for 12.2.

---

## Verification run — The edited marker (2026-09-23)

**Run against `feat/813-edited-marker`, on the backend worktree's own port
(`4001`) and database (`quicktweets_w2`). All of EDT-01…EDT-10 passed.** Newman:
folder 14, **10 requests / 19 assertions, 0 failures**; folder 04 (which carries
EDT-05), **27 assertions, 0 failures**. Re-run because their payloads changed:
folders 05 (**9**), 07 (**30**), 12.1 (**24**), 13 (**25**) — all 0 failures.

**The run corrected a premise, and it was mine rather than the code's.** EDT-05
was first written as *"a media-only edit leaves `editedAt` null"*, which failed —
correctly, because folder 04 edits the body **before** it reorders the media, so
the post is already marked by then. The assertion is now a genuine before/after:
`EDT-05a` records that the text edit marked the post, and `EDT-05` asserts the
media-only reorder leaves that exact instant alone. It is a stronger check than
the one it replaced, since it proves the marker is neither **set** nor
**refreshed** — and it runs inside the real media transaction.

## Verification run — The character rule (2026-09-24)

**Run against `fix/818-character-rule`, on the backend worktree's own port
(`4001`) and database (`quicktweets_w2`). All of CHR-01…CHR-09 passed.** Newman:
folder 15, **10 requests / 25 assertions, 0 failures**. Re-run because they post
and edit bodies: folders 12 (**24**), 13 (**25**) and 14 (**19**), and folders
00, 01, 04, 05 and 08 together (**59 requests / 102 assertions**). All 0 failures.

**The first combined run failed 90 of 94 assertions, and none of it was the
rule.** Three states of the harness, not of the code:

- `mediaOrigin` still pointed at port `4000`, which folder 00's health check
  reads. It is overridden like `baseUrl` when folders 00 or 02 run from the
  command line.
- The auth limiter was spent by the runs before it, so `Register` answered
  `429`, and everything after it was unauthenticated.
- Folder 01's fixed users already existed, so `Register` answered `409`
  ([the known friction](verification-runbook.md#folder-01-cannot-re-register-once-folder-09-has-run-test-only-friction)).
  The run passed once users A and B were given per-run handles and e-mails
  through `--env-var`.

## Verification run — Text safety (2026-09-24)

**Run against `feat/822-text-safety`, on the backend worktree's own port
(`4001`) and database (`quicktweets_w2`). All of TXT-01…TXT-13 passed.** Newman:
folder 16, **14 requests / 32 assertions, 0 failures**.

**Re-run because they write or read the same text:**
- folders 15 (**25**), 14 (**19**), 13 (**25**) and 12 (**24**);
- folders 00, 01, 04, 05, 08 and **09**, together (**71 requests / 125
  assertions**). Folder 09 is included because it goes through
  `PATCH /users/me`, the endpoint whose `name` and `bio` changed.

All 0 failures, run as the character rule's run describes: `mediaOrigin` set,
a fresh limiter, and per-run users A and B.

**Before the change, the same probes showed the gap:** a guest read a name of
spaces as `""`, a bio carrying U+202E, and a name made only of a zero-width
space.

## Verification run — The edit limit (2026-09-24)

**Run against `feat/826-edit-limit`, on the backend worktree's own port
(`4001`) and database (`quicktweets_w2`). All of EDL-01…EDL-05 passed.**

- **Newman, folder 17:** **19 requests / 23 assertions, 0 failures**, the ten
  edits counted as ten requests.
- **Rerun at once,** it passed again, since each run brings new accounts.

**Re-run as regression:**
- folders 16 (**32**), 15 (**25**), 14 (**19**), 13 (**25**) and 12 (**24**);
- folders 00, 01, 04, 05, 08 and 09, together (**71 requests / 125
  assertions**). Folder 04 edits posts, so it is the folder the limit could
  catch.

All 0 failures.

## Verification run — Suggested accounts (2026-09-24)

**Run against `feat/831-suggested-accounts`, on the backend worktree's own port
(`4001`) and database (`quicktweets_w2`). All of SUG-01…SUG-06 passed.**
Newman, folder 18: **16 requests / 28 assertions, 0 failures**.

**Re-run as regression:**
- folders 17 (**23**), 16 (**32**), 15 (**25**), 14 (**19**), 13 (**25**) and
  12 (**24**);
- folders 00, 01, 04, 05, **07**, 08 and 09, together (**88 requests / 155
  assertions**). Folder 07 is the follows folder this endpoint joins.

All 0 failures.

**The first runs of folder 18 failed, and none of it was the endpoint:**
- A test script declaring `data`, one of the Postman sandbox's own names, threw
  before asserting.
- The follow setup expected `201` where following answers `200`.
- Consecutive runs spent the sign-in limiter's budget.

## Verification run — Trending (2026-09-25)

**Run against `feat/835-trending`, on the backend worktree's own port (`4001`)
and database (`quicktweets_w2`). All of TRD-01…TRD-06 passed.** Newman, folder
19: **24 requests / 27 assertions, 0 failures**, and nothing of the run left
trending once it deleted its posts.

**Re-run as regression**, restarting the API between batches for the sign-in
limiter:
- folders 18 (**28**), 17 (**23**), 16 (**32**), 15 (**25**), 14 (**19**), 13
  (**25**) and 12.1 (**24**);
- folders 00, 01, 02, 04, 05, 06, 07, 08 and 09, together, with per-run users
  (**101 requests / 177 assertions**). Every folder that writes a post now
  stores its hashtags too.

All 0 failures.

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
| CHV-01b | CHV-01, within the window | `GET /channel-verification/challenges/current` (Bearer) | **200**; `status = "pending"`; `resendAvailableInSeconds` **> 0 and ≤ what CHV-01 reported** — one anchor, read a moment later | — | — | ✅ |
| CHV-02 | CHV-01 | `GET /users/me` | 200; `emailVerification = "pending"` | — | — | ✅ |
| CHV-03 | CHV-01, within 60s | `POST …/challenges` again | **429** `too_many_requests` — the per-address cooldown (**D2**) | no second open challenge | — | ✅ |
| CHV-04 | CHV-01 | `POST …/challenges/confirm {code:"ZZZZZZZZZZZZ"}` | **400** `bad_request`, *"That verification code is not valid."* | challenge **still open** — a wrong guess does not consume it | — | ✅ |
| CHV-05 | CHV-01 | confirm `{code:"!!"}` (malformed) | **byte-identical** to CHV-04 — not a `422`, no field errors (**G2**) | unchanged | — | ✅ |
| CHV-06 | CHV-01; code read from `.mail-capture/` | confirm with that code | **204**, empty body | challenge `closed_at` set, `closed_reason = 'verified'`; record `proven_at` set (Checkpoint I) | via reset | ✅ |
| CHV-07 | CHV-06 | `GET /users/me` | 200; `emailVerification = "proven"` | **no verification column on `users`** (Checkpoint I) | — | ✅ |
| CHV-08 | CHV-06 | confirm with the **same** code again | **byte-identical** to CHV-04 — a replay is indistinguishable from a wrong value (**G2**, **D5**) | unchanged | — | ✅ |
| CHV-09 | — | `POST …/challenges` with **no** Bearer | **401** `unauthorized` | none | — | ✅ |
| CHV-10 | CHV-06; wait out the 60s cooldown | issue again | **202** — a new challenge after the cooldown; rotation itself is proven in the API unit lane | the verified challenge **still present**, the new one **open** beside it; nothing reads `superseded`, since CHV-06 left none open (Checkpoint I) | via reset | ✅ |
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
>   **The response body is only half of it** — a position opened only for a real
>   account would answer the same question by its presence, which is why PWR-01a
>   reads the position back for an address no account has.
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
> - **G6 — the position is server-held, and every part of it is derived.** The
>   reader's step lives in a server record addressed by an `HttpOnly` key, and
>   is computed from whether a credential is bound to it — there is no step
>   column (PWR-00/01a/02a/07a/10a). The read **never `404`s**: no position is a
>   legitimate answer meaning *start at the beginning*.
> - **G7 — the client never holds a password-change credential.** Once a code is
>   confirmed it is the position's; `apply` carries only `{ newPassword }`, and a
>   body supplying a code is **refused rather than stripped** (PWR-09a). The flow
>   ends with less exposure than it began with.
> - **G8 — a completed reset proves the address.** The evidence becomes
>   sufficient at completion, not at confirmation, and Channel Verification
>   writes it (PWR-11a). Recovery reports; it never writes the fact.
>
> - **G9 — a reader may ask again without retyping.** The address is read from
>   the position, never from the request; one supplied is refused (PWR-03a). The
>   window and the bound move on the **ask**, not on the send (PWR-03c) — ones
>   that moved on the send would report that mail left.
>
> **Self-isolated.** The folder mints its own account with a per-run unique handle,
> so it never disturbs `verify_alice`/`verify_bob`. The run's identity is
> `{{pwrUsername}}`; its captured code is `{{pwrCode}}`.
>
> **The runner must keep the cookie jar.** Since ADR 0017 the position is
> addressed by an `HttpOnly` key the server sets, so every request after PWR-01
> depends on the jar carrying it. Postman does this by itself. **Newman must be
> told**: the run is necessarily split around the manual code paste, so the first
> leg needs `--export-cookie-jar` and the second `--cookie-jar` pointed at it.
> Without them PWR-07 onward fail on a position that is not there — and they fail
> as a `400`, indistinguishable from a bad code, because that is exactly what
> **G2** promises.
>
> **Setup precondition.** The server must run with `MAIL_MODE=capture`, which
> writes each message to `.mail-capture/` relative to the API process's working
> directory. Without it the code is unobtainable and PWR-07 onward cannot run.
>
> **And the migrations must be applied**: `password_reset_challenges`,
> `password_reset_sessions` and `mail_send_attempts`. The position lives in the
> second, and a missing one fails the folder at its first row. Every send passes through the mail mechanism's abuse
> controls, which **fail closed** when their state cannot be read: an unapplied
> migration turns PWR-02 into a silent no-send produced by a correctly-behaving
> system. Read that as a missing migration, never as a defect.
>
> **Two ordering constraints, both consequences rather than preferences.**
> **PWR-14 needs a restart** with a short `RESET_CODE_TTL_MS` and a shorter `RESET_RESEND_COOLDOWN_MS`, because the default
> ten minutes is not waitable by hand and shortening it for the whole folder would
> expire codes before they can be pasted. **PWR-15 must run last, and after its
> own restart** — it exhausts the per-IP mint budget for fifteen minutes and
> would block everything after it. That budget is **shared between requesting a
> code and resending one**, and this folder spends seven of its ten before
> PWR-15 begins, which is why the restart is what makes the count reliable. It starts from a cleared counter deliberately,
> rather than from an exact count of every request above it: folder 10's CHV-13
> documents that arithmetic and a runner has to get it right, and this avoids
> needing to.

| ID | Preconditions | Action | Expected API Result | Expected DB State | Cleanup | Result / Notes |
|----|---------------|--------|---------------------|-------------------|---------|----------------|
| PWR-00 | Setup registered | `GET …/session` before any request | **200**, `{step:"request", maskedEndpoint:null, retryAfterSeconds:0, canResend:false}` — the read **never `404`s** (**G6**) | no `password_reset_sessions` row for this run | — | ☐ |
| PWR-01 | Setup registered; server in `MAIL_MODE=capture` | `POST /auth/password-reset` for an address **no account has** | **202**; body is the **position** — `step:"code"`, the typed address masked, `retryAfterSeconds`, `canResend` (**G9**); **no `Retry-After`** | no `password_reset_challenges` row (Checkpoint J) | — | ☐ |
| PWR-01a | PWR-01 | `GET …/session` | **200**, `step:"code"` and a **masked** address — a position was opened for an address **no account has** (**G1**, **G6**) | one `password_reset_sessions` row, `challenge_id` **null** | — | ☐ |
| PWR-02 | PWR-01 | same request for the **real** address | **202**, identical to PWR-01 **except the mask**, which is a function of what was typed rather than of what exists (**G1**) | one row, `code_hash` a **64-hex digest**, `used_at` null (Checkpoint J) | via reset | ☐ |
| PWR-02a | PWR-02 | `GET …/session` | **200**, `step:"code"`, the real address masked to its first character; the unmasked value appears **nowhere** in the response (**D5**) | **still one** session row — PWR-01's was superseded, not added to | — | ☐ |
| PWR-03 | PWR-02, within 60s | same request again | **202**, **byte-identical to PWR-02** — the same submitted address, eligible then and cooling now, and the sharpest comparison in the folder (**G1**) | **still one row** — no second credential minted | — | ☐ |
| PWR-03a | PWR-03 | `POST …/resend` with an `email` in the body | **422** `validation`, field error on `email` — **refused, not stripped** (**G9**) | unchanged | — | ☐ |
| PWR-03b | PWR-03 | `POST …/resend` with an **empty** body, still inside the cooldown | **202**, **byte-identical to PWR-02**; the position key is **re-set**, not replaced | **still one credential row** — nothing was minted | — | ☐ |
| PWR-03c | PWR-03b | `GET …/session` | **200**, still `step:"code"` and `canResend:true` | the session's `resends_used` is **1** and `last_asked_at` has moved — **for a resend that sent nothing** (**G9**) | — | ☐ |
| PWR-04 | PWR-02 | `POST …/confirm {code:"ZZZZZZZZZZZZ"}` | **400** `bad_request`, *"That reset code is not valid."*, **no field errors** | row unchanged | — | ☐ |
| PWR-05 | PWR-02 | confirm `{code:"!!"}` (malformed) | **byte-identical** to PWR-04 — **not** a `422` (**G2**) | unchanged | — | ☐ |
| PWR-06 | — | confirm `{code:""}` | **422** `validation` with a `code` field error — a malformed *request* (**G2**) | unchanged | — | ☐ |
| PWR-07 | PWR-02; code read from `.mail-capture/` into `{{pwrCode}}` | confirm with that code | **204**, empty body | row **unchanged** — `used_at` still null (**G3**) | — | ☐ |
| PWR-07a | PWR-07 | `GET …/session` | **200**, `step:"password"` — derived from the bound credential, and **no step column exists** (**G6**) | the session row's `challenge_id` is now set | — | ☐ |
| PWR-07b | PWR-07 | `POST …/resend` once the code is confirmed | **400**, identical to PWR-04 — the position has moved past the step that asks (**G2**, **G9**) | unchanged | — | ☐ |
| PWR-08 | PWR-07 | confirm with the **same** code again | **204** again — confirm consumed nothing (**G3**) | unchanged | — | ☐ |
| PWR-09 | PWR-07 | `POST …/apply` with `{newPassword:"weak"}` — **the code is not the caller's to send** | **422** `validation`, field error on `newPassword` | **row still unspent** — a weak password never costs the code | — | ☐ |
| PWR-09a | PWR-07 | apply with **a `code` in the body** | **422** `validation` — the field is **refused, not stripped** (**G7**) | **row still unspent**; PWR-10 spends the same code immediately after | — | ☐ |
| PWR-10 | PWR-09 | apply with a **compliant** password | **204**, empty body, **no tokens** (**D2**); `Set-Cookie` **clears** the position key with the attributes it was set with | `used_at` set; **`refresh_tokens` for this account empty** (**G4**, Checkpoint J) | via reset | ☐ |
| PWR-10a | PWR-10 | `GET …/session` | **200**, `{step:"request", maskedEndpoint:null, retryAfterSeconds:0, canResend:false}` — the cleared key is what produces this (**G6**) | the session row **survives** until its own expiry; `apply` clears the cookie and deletes nothing. A runner reading Checkpoint J should expect the row, not its absence | — | ☐ |
| PWR-11 | PWR-10 | `POST /auth/login` with the **new** password | **200** | a single new session row | — | ☐ |
| PWR-11a | PWR-11 | `GET /users/me` with that session's token | **200**, `emailVerification: "proven"` (**G8**) — the account never verified by hand | a `channel_verifications` row for this endpoint with `proven_at` set | — | ☐ |
| PWR-12 | PWR-10 | login with the **old** password | **401** `unauthorized`, the generic credential error | unchanged | — | ☐ |
| PWR-13 | PWR-10 | apply again, the position now cleared | **byte-identical** to PWR-04 — a replay is indistinguishable from a value that never existed (**G2**) | unchanged | — | ☐ |
| PWR-13a | PWR-10 | `POST …/resend` with the position cleared | **byte-identical** to PWR-04 — no position, past the step, and out of asks are one outcome (**G2**) | unchanged | — | ☐ |
| PWR-14 | Restart with a short `RESET_CODE_TTL_MS` and a shorter `RESET_RESEND_COOLDOWN_MS` (see the runbook); request a fresh code | wait past expiry, then confirm — **run no sweep** | **400**, identical to PWR-04 (**G5**, **I8**) | the expired row is **still present**, unswept — no writer was needed | via reset | ☐ |
| PWR-14a | Restart with `RESET_MAX_RESENDS=1`; request a fresh code | resend once, then read the session | first resend **202**; the read then shows **`canResend:false`** | `resends_used` is **1** | — | ☐ |
| PWR-14b | PWR-14a | resend again | **400**, identical to PWR-04 — the bound is spent, and the read had already said so | `resends_used` **unchanged at 1**, and `expires_at` **stops moving** | restart | ☐ |
| PWR-15 | **Run last**, after a restart clearing the in-memory counter | eleven requests in a row | attempts 1–10 → **202**; **attempt 11 → 429** `rate_limit` | unchanged | wait 15 min or restart | ☐ |

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
