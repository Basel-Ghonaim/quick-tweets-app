# Verification Runbook — Media Subsystem & Core Flows (M1–M9 + Comment Media)

> A **manual** verification pass over the running system, before the destructive
> lifecycle work (**M11 reclamation**) runs. The M10 background substrate now
> exists but performs no deletion, so the pass is still non-destructive. It exists
> because the most important thing to verify — **Reference Coordination** — has no
> API and is only observable in the database. Comment Media is the third reference
> producer (after tweets and avatars); its scenarios live in folder 08.
>
> - **Postman drives** state transitions and asserts what the API exposes.
> - **pgAdmin verifies** coordination: that the `media_references` ledger moved
>   exactly as the mechanism promises.
>
> Scenarios (the authoritative catalogue) live in
> [verification-scenarios.md](verification-scenarios.md). This runbook is the
> *operational* companion: how to set up, where the DB checkpoints are, and the
> phase-by-phase order.

## Why the database is not optional here

By design (ADR 0005 Decision 8), Media reasons about referenced-ness from **its
own state**, and features never read Media's schema. The consequence for
verification: the ledger, `TweetMedia` rows, and `MediaObject` internals
(`status`, `uploader_id`) are **not exposed by any endpoint**.

| What you are verifying | Postman sees | Only pgAdmin sees |
|---|---|---|
| Object stored & servable | `GET /media/:token` → 200 | `status`, `uploader_id` |
| Avatar attached | `avatar:{token}` on the user | the `user-avatar:{id}` ledger row |
| Tweet media | `media:[{token}]` on the tweet | `tweet_media` rows + `tweet:{id}` ledger rows |
| **Reference began / ended** | *(nothing)* | **the ledger delta — the whole point** |
| Unreferenced (M11 target) | *(nothing)* | the reclamation target state (see terminology) |

**A Postman-only pass cannot validate the reclamation prerequisite.** Treat every
DB checkpoint below as a required step, not an optional peek.

## Terminology — the M11 reclamation target

- **Unreferenced (owned).** An object with an `uploader_id` that **no longer has
  any ledger row** pointing at it. It was owned and referenced; the reference
  ended. *Cause:* a tweet whose media was removed, or a tweet that was deleted.
  This is M11's **single** reclamation target.

The pre-auth grant **"abandoned"** class — a grant-provenance object never adopted
(`uploader_id IS NULL`, `grant_id` set) — was retired with the upload grant
(ADR 0008). Historical `media_reclamation_audit` rows may still carry
`reason="abandoned"`; those are immutable evidence, not a current target.

## Prerequisites

1. **pgAdmin running**, connected to the `quick_tweets` database.
2. **Server running** (from `D:\quick-tweets-app\server`):
   ```
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run dev
   ```
3. **Client running** (optional for this phase — the API is exercised directly):
   `npm run dev` from the project root.
4. **Postman** with the collection and environment imported (see below).
5. A **clean or known** database state (see [Reset strategy](#reset-strategy)).

## Import into Postman

1. Import `quick-tweets-verification.postman_collection.json`.
2. Import `environment.local.json` and select **QuickTweets — Local** as the
   active environment.
3. The image fixtures are under `fixtures/`. On the first file-upload request,
   Postman may ask you to re-select the file — point it at
   `fixtures/sample.png` (Postman stores file paths per machine).

## How auth is handled

- **Access token** is returned in the response *body*. Register/Login test scripts
  capture it into `{{accessTokenA}}` / `{{accessTokenB}}` and every authenticated
  request sends it as `Bearer`.
- **Refresh token** and the `qt_session` hint are **httpOnly / normal cookies**,
  handled automatically by Postman's cookie jar. `refresh` and `logout` need no
  body.
- **Two users, one cookie jar.** On `localhost` both users share Postman's jar, so
  logging in as B overwrites A's refresh cookie. That is why cross-principal tests
  authorize with the **per-user Bearer token**, never the cookie. Do not "fix"
  this by juggling cookies — the Bearer tokens are the source of truth.

## Rate-limit awareness (test-only friction, not a bug)

- `authLimiter` = **10 requests / 15 min** on `register` + `login`. The auth
  failure-path folder can trip this; a `429 rate_limit` there is the limiter
  working, not a defect. Space them out or accept the window.

## DB checkpoints

Open these in pgAdmin's Query Tool. Replace `:id` placeholders with the values
Postman captured (visible in the environment quick-look, or in each response).

### Checkpoint A — Media primitives (after folder 02)
```sql
-- Every uploaded object is 'ready', owned by its authenticated uploader
-- (uploader_id set — the single provenance model, ADR 0008).
SELECT id, status, uploader_id, content_type, size
FROM media_objects
ORDER BY id DESC
LIMIT 10;
```

### Checkpoint B — Avatar (authenticated User/Profile action)
```sql
-- An avatar set via PATCH /users/me: uploader_id is the owning user, and a
-- ledger row exists under user-avatar:{id}.
SELECT u.id AS user_id, u.avatar_media_id, m.status, m.uploader_id,
       r.referrer
FROM users u
JOIN media_objects m ON m.id = u.avatar_media_id
LEFT JOIN media_references r
       ON r.media_id = u.avatar_media_id AND r.referrer = 'user-avatar:' || u.id
WHERE u.username = 'verify_avatar';
-- Expect: uploader_id = user_id, status='ready', referrer='user-avatar:{id}' (NOT NULL).
```

### Checkpoint C — Tweet create with media (after "Create tweet with 2 media")
```sql
-- Two tweet_media rows in order, and two matching ledger rows under tweet:{id}.
SELECT tm.position, tm.media_id,
       (r.id IS NOT NULL) AS has_ledger_row
FROM tweet_media tm
LEFT JOIN media_references r
       ON r.media_id = tm.media_id AND r.referrer = 'tweet:' || tm.tweet_id
WHERE tm.tweet_id = :tweetId
ORDER BY tm.position;
-- Expect: two rows, positions 0 and 1, has_ledger_row = true for both.
```

### Checkpoint D — Edit set-difference (after each PATCH)
```sql
-- After "reorder [A2, A1]":         UNCHANGED — the reorder must signal nothing.
-- After "replace (drop A1, keep A2)": exactly one ledger row remains (A2).
-- After "remove all []":            zero ledger rows.
SELECT media_id FROM media_references
WHERE referrer = 'tweet:' || :tweetId
ORDER BY media_id;
```
> The **reorder** step is the sharp one: it swaps two items' positions, so
> `tweet_media` rows are rewritten, but the *set* is unchanged — the ledger must
> be **identical** before and after. Note the two rows before the reorder, then
> confirm they are the same two after (only the `tweet_media.position` values moved).

### Checkpoint E — Delete ends references, leaves an unreferenced object (after "Delete tweet")
```sql
-- The tweet and its tweet_media are gone; the ledger rows are gone; but the
-- MediaObjects survive as 'ready' with an uploader — i.e. UNREFERENCED (owned).
-- This is M11's single reclamation target (owned-but-unreferenced).
SELECT m.id, m.status, m.uploader_id,
       (SELECT count(*) FROM media_references r WHERE r.media_id = m.id) AS ref_count
FROM media_objects m
WHERE m.uploader_id = :userAId
ORDER BY m.id DESC
LIMIT 10;
-- Expect: the tweet's ex-media show ref_count = 0, status='ready', uploader_id set.
```

### Checkpoint F — The global invariant (run anytime)
```sql
-- The M11 precondition, both directions, across ALL THREE reference families
-- (tweet, avatar, comment). All four MUST be 0.
SELECT
  (SELECT count(*) FROM tweet_media tm
     WHERE NOT EXISTS (SELECT 1 FROM media_references r
                       WHERE r.media_id = tm.media_id
                         AND r.referrer = 'tweet:' || tm.tweet_id))            AS tweet_media_missing_ledger,
  (SELECT count(*) FROM users u
     WHERE u.avatar_media_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM media_references r
                       WHERE r.media_id = u.avatar_media_id
                         AND r.referrer = 'user-avatar:' || u.id))             AS avatars_missing_ledger,
  (SELECT count(*) FROM comments c
     WHERE c.media_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM media_references r
                       WHERE r.media_id = c.media_id
                         AND r.referrer = 'comment:' || c.id))                 AS comments_missing_ledger,
  (SELECT count(*) FROM media_references r
     WHERE NOT EXISTS (SELECT 1 FROM users u
                       WHERE u.avatar_media_id = r.media_id
                         AND r.referrer = 'user-avatar:' || u.id)
       AND NOT EXISTS (SELECT 1 FROM tweet_media tm
                       WHERE tm.media_id = r.media_id
                         AND r.referrer = 'tweet:' || tm.tweet_id)
       AND NOT EXISTS (SELECT 1 FROM comments c
                       WHERE c.media_id = r.media_id
                         AND r.referrer = 'comment:' || c.id))                 AS orphan_ledger_rows;
-- All four = 0 → every real reference (tweet, avatar, comment) is recorded and
-- no ledger row is stale.
```

### Checkpoint G — Rollback proof (after "cross-principal attach" failure)
```sql
-- The failed create must leave NOTHING: no tweet, no tweet_media, no ledger row
-- for the rejected object. Confirms the whole operation rolled back atomically.
SELECT
  (SELECT count(*) FROM tweets WHERE body = 'should fail')                     AS stray_tweets,
  (SELECT count(*) FROM media_references
     WHERE media_id = (SELECT id FROM media_objects
                       WHERE token = :mediaTokenB1))                           AS strays_for_B_object;
-- Both = 0.
```

### Checkpoint H — Username rename & reservation (folder 09)
```sql
-- WI-F: a rename moves the current username AND reserves the FORMER handle as an
-- alias pointing at the SAME user id (locator stability). Substitute :rnUserId
-- with the value folder 09's Setup captured.
SELECT u.id AS user_id, u.username AS current_username,
       a.username AS reserved_alias, a.user_id AS alias_user_id
FROM users u
LEFT JOIN username_aliases a ON a.user_id = u.id
WHERE u.id = :rnUserId
ORDER BY a.created_at;
-- After USR-01:        current = new; ONE alias row = old, alias_user_id = user_id.
-- After USR-09 (no-op): UNCHANGED — still exactly one alias (no duplicate row).
-- After USR-10 (reclaim): current = old; the `old` alias is GONE, and a NEW alias
--                          = new now reserves the just-vacated handle.

-- Global invariant: a reserved alias is NEVER also a live username — uniqueness
-- spans both tables. MUST be 0.
SELECT count(*) AS alias_collides_with_live
FROM username_aliases a JOIN users u ON u.username = a.username;
```
### Checkpoint I — Channel verification custody (folder 10)
```sql
-- The account holds the address; the capability holds whether it is proven, and
-- the two never mix. Substitute :cvUserId with the id folder 10's Setup captured.

-- 1. CUSTODY: the account table carries NOTHING about verification. MUST be 0.
SELECT count(*) AS verification_columns_on_users
FROM information_schema.columns
WHERE table_name = 'users'
  AND (column_name ILIKE '%verif%' OR column_name ILIKE '%proven%'
       OR column_name ILIKE '%challeng%' OR column_name ILIKE '%channel%');

-- 2. The fact lives in the capability's own tables, keyed inward to the account.
SELECT v.id, v.endpoint, v.proven_at, v.last_challenged_at,
       ch.id AS challenge_id, ch.expires_at, ch.closed_at, ch.closed_reason,
       length(ch.secret_hash) AS secret_hash_length
FROM channel_verifications v
LEFT JOIN channel_verification_challenges ch ON ch.verification_id = v.id
WHERE v.user_id = :cvUserId
ORDER BY ch.id;
-- After CHV-01: proven_at NULL; one challenge with closed_at NULL.
-- After CHV-06: proven_at SET; that challenge closed, reason 'verified'.
-- After CHV-10: the prior challenge reads 'superseded'. Success closes a
--               challenge, it never deletes it.

-- 3. THE SECRET IS NEVER STORED IN THE CLEAR. secret_hash_length above is 64 —
--    a SHA-256 hex digest. Compare it with the code visible in the capture file:
--    they must NOT match, and the code must appear nowhere in this table.
SELECT count(*) AS challenges_not_storing_a_digest
FROM channel_verification_challenges
WHERE secret_hash !~ '^[0-9a-f]{64}$';
-- MUST be 0.

-- 4. AFTER CHV-11 (the address moved): the projection reads unproven, and this
--    count is UNCHANGED from before the change — reading writes nothing, and no
--    row is created for the new address.
SELECT count(*) AS capability_rows_for_this_account
FROM channel_verifications WHERE user_id = :cvUserId;

-- 5. AFTER CHV-12 (a challenge expired, with no sweep run): the expired row is
--    STILL HERE, and the self-view still reads unproven. That is the point —
--    status is derived, so no writer is needed for expiry to be correct.
SELECT count(*) AS expired_but_unswept
FROM channel_verification_challenges ch
JOIN channel_verifications v ON v.id = ch.verification_id
WHERE v.user_id = :cvUserId AND ch.closed_at IS NULL AND ch.expires_at < now();
```
> **CHV-11 moves `users.email` directly**, because no endpoint does. That changes
> an *input* the capability is asked about; the capability's own state is
> untouched and is observed through the API. It is **not** the seeding pattern
> this harness rejects — nothing fabricates a state the system cannot produce,
> and no persistence fact about challenges is relied on to make a scenario pass.

> **USR-05** and **USR-07** have no distinct DB shape of their own — they are the
> *refusals* this reservation produces (a former handle rejected to a rename and to
> a registration). Confirm them by their `409` and by this checkpoint showing the
> alias still owned by the original account.

## Comment media checkpoints (CM-1 … CM-6)

> For Postman folder **08 · Comment Media**. Referrer tag `comment:{commentId}`,
> media column `comments.media_id`. Substitute the `:cm…` placeholders with the
> values the scenario's requests captured (visible in the environment quick-look).
> The **final** invariant for comments is **Checkpoint F** above (now extended) —
> run it as **CMT-M12**.

### CM-1 — Create with media (after **A2**)
```sql
-- Exactly one ledger row for the new comment, pointing at a ready, A-owned object.
SELECT r.referrer, r.media_id, m.status, m.uploader_id
FROM media_references r
JOIN media_objects m ON m.id = r.media_id
WHERE r.referrer = 'comment:' || :cmCreateCommentId;
-- Expect: ONE row; status='ready'; uploader_id = User A.
```

### CM-2 — PATCH set-difference (after **B4 / B5 / B6 / B7**)
```sql
-- A comment holds AT MOST ONE media reference (single attachment).
SELECT media_id FROM media_references
WHERE referrer = 'comment:' || :cmPatchCommentId;
-- After B4 (set none→set):     one row  = {{cmMediaSet}}'s object.
-- After B5 (replace set→repl):  one row  = {{cmMediaReplace}}'s object (set object now unreferenced).
-- After B6 (resubmit same):     UNCHANGED — same single row (no end, no begin).
-- After B7 (remove null):       ZERO rows (replace object now unreferenced).
```
> B6 is the sharp one: resubmitting the object already attached must be a true
> no-op — the row's `media_id` is identical before and after, with no intervening
> end/begin. B7 then drops it to zero.

### CM-3 — Delete ends the reference, object survives (after **C3**)
```sql
-- The comment's ledger row is gone; the object it carried is now UNREFERENCED
-- (owned, status='ready', zero ledger rows) — an M11 target, bytes untouched.
SELECT count(*) FROM media_references
WHERE referrer = 'comment:' || :cmDeleteCommentId;                       -- expect 0
SELECT m.status, m.uploader_id,
       (SELECT count(*) FROM media_references r WHERE r.media_id = m.id) AS ref_count
FROM media_objects m
WHERE m.token = :cmMediaDelete;   -- status='ready', uploader_id = A, ref_count = 0
```

### CM-4 — Cross-principal attach rolled back (after **D1**)
```sql
-- The rejected create persisted NOTHING that references B's object.
SELECT
  (SELECT count(*) FROM comments c
     JOIN media_objects m ON m.id = c.media_id
     WHERE m.token = :cmMediaB)                                    AS stray_comments,
  (SELECT count(*) FROM media_references r
     JOIN media_objects m ON m.id = r.media_id
     WHERE m.token = :cmMediaB AND r.referrer LIKE 'comment:%')    AS strays_for_B_object;
-- Both = 0.
```

### CM-5 — Transitive cascade ends BOTH families (after **E5**)
```sql
-- Deleting the tweet removed the comment and the tweet, and ended BOTH the
-- comment:{id} and the tweet:{id} references — in one transaction.
SELECT
  (SELECT count(*) FROM comments WHERE tweet_id = :cmCascadeTweetId)                         AS comments_left,     -- 0
  (SELECT count(*) FROM tweets   WHERE id       = :cmCascadeTweetId)                         AS tweet_left,        -- 0
  (SELECT count(*) FROM media_references WHERE referrer = 'comment:' || :cmCascadeCommentId) AS comment_ref_left, -- 0
  (SELECT count(*) FROM media_references WHERE referrer = 'tweet:'   || :cmCascadeTweetId)   AS tweet_ref_left;   -- 0
-- Both ex-media survive unreferenced (owned, ready):
SELECT m.token, m.status,
       (SELECT count(*) FROM media_references r WHERE r.media_id = m.id) AS ref_count
FROM media_objects m
WHERE m.token IN (:cmCascadeTweetMedia, :cmCascadeCommentMedia);   -- both: status='ready', ref_count = 0
```

### CM-6 — Restrict backstop is real (after **F2**, run in pgAdmin)
```sql
-- The API path (deleteTweet) deletes comments FIRST, so this FK never fires there.
-- A RAW delete, with a comment still pinning the tweet, must be REFUSED — proving
-- the ON DELETE RESTRICT backstop guards a code path that ever forgets to.
BEGIN;
DELETE FROM tweets WHERE id = :cmRestrictTweetId;
-- Expect: ERROR: update or delete on table "tweets" violates foreign key
--         constraint "comments_tweet_id_fkey" on table "comments"
ROLLBACK;   -- leaves the tweet + comment intact
```
> Likes still cascade (untouched by Comment Media); the restrict comment is
> deliberately **media-free**, so `comments_tweet_id_fkey` is the *only* thing
> that can refuse the delete — the proof is unambiguous.

## Incremental workflow

Run **in folder order**, pausing at each checkpoint before proceeding. Do not run
the whole collection at once — the point is to inspect state between steps.

| Phase | Folder | Ends at checkpoint |
|---|---|---|
| 1 — Auth spine | 00, 01 | none (API-observable only) |
| 2 — Media primitives | 02 | **A** |
| 3 — Avatar (authenticated) | 03 | **B** |
| 4 — Tweet coordination | 04 | **C → D (×3) → E**, then **G** for the failure |
| 5 — Social | 05, 06, 07 | none |
| 6 — Comment media | 08 | **CM-1 → CM-2 → CM-3 → CM-4 → CM-5 → CM-6** (see the execution map below) |
| 7 — Username rename | 09 | **H** (after USR-01, USR-09, and USR-10) |
| 8 — Channel verification | 10 | **I** (after CHV-01, CHV-06, and CHV-11). Run in order: CHV-13 **last**, and only after CHV-12's restart has cleared the confirm limiter |
| 9 — Invariant sweep | — | **F** — extended for comments; must be all-zero before declaring the phase clean |

A phase is "green" only when its API assertions pass **and** its DB checkpoint
matches. Record outcomes in [verification-scenarios.md](verification-scenarios.md)
(the Result/Notes column).

### Comment media — execution map (folder 08, top-to-bottom)

Run **08 · 0 · Setup** once, then each lettered scenario in order. Every scenario
mints its **own** media and its **own** comment, so nothing an earlier scenario
leaves behind can make a later one pass or fail — the only shared, read-only state
is `{{cmTweetId}}` (the host tweet, never mutated). Switch to pgAdmin only where a
checkpoint is named.

| Order | Postman | Creates | Reuses | API | pgAdmin |
|---|---|---|---|---|---|
| **Setup** | 0 · Setup (S1, S2) | `cmTweetId`, `cmMediaB` | — (needs `accessTokenA/B` from folder 01) | 201, 201 | — |
| **A** Create | A1 → A2 → A3 | `cmMediaCreate`, `cmCreateCommentId` | `cmTweetId` | 201 / 201 / 200 | **CM-1** after A2 |
| **B** PATCH | B1 → … → B8 | `cmPatchCommentId`, `cmMediaSet`, `cmMediaReplace` | `cmTweetId` | 201 then 200 ×7 | **CM-2** after each of B4·B5·B6·B7 |
| **C** Delete | C1 → C2 → C3 | `cmMediaDelete`, `cmDeleteCommentId` | `cmTweetId` | 201 / 201 / 204 | **CM-3** after C3 |
| **D** Cross-principal | D1 | — | `cmTweetId`, `cmMediaB` | **422** (opaque) | **CM-4** after D1 |
| **E** Cascade | E1 → E2 → E3 → E4 → E5 | `cmCascadeTweetMedia`, `cmCascadeTweetId`, `cmCascadeCommentMedia`, `cmCascadeCommentId` | — (fresh tweet) | 201×4 / 204 | **CM-5** after E5 |
| **F** Restrict | F1 → F2 | `cmRestrictTweetId`, `cmRestrictCommentId` | — (fresh tweet) | 201 / 201 | **CM-6** in pgAdmin (raw `DELETE … ROLLBACK`) |
| **Close** | — | — | — | — | **Checkpoint F** (extended) → all four = 0 |

**Fresh vs reused, stated plainly:**
- **Fresh every scenario:** the media object(s) and the comment under test. Comment
  media is a **Bearer** upload, so "fresh media" = one `POST /media` as User A —
  cheap, and it keeps each scenario's ledger unambiguous.
- **Reused (read-only):** `cmTweetId`, the host tweet that scenarios A–D hang a
  comment on. It is never edited or deleted, so it cannot skew a result.
- **Scenario E and F create their own tweets** (`cmCascadeTweetId`,
  `cmRestrictTweetId`) precisely because they delete / attempt-to-delete the tweet —
  they must never touch the shared host tweet.

## Reset strategy

Between full runs, return to a known state. Three options, least to most drastic:

**1. Soft reset (SQL) — keep the schema, clear the data.**
```sql
-- Order respects foreign keys. media_references and tweet_media first
-- (their Restrict FKs would otherwise block the media_objects delete).
TRUNCATE TABLE media_references, tweet_media, likes, comments, follows,
               refresh_tokens, tweets RESTART IDENTITY CASCADE;
UPDATE users SET avatar_media_id = NULL;   -- release avatar refs before removing objects
TRUNCATE TABLE media_objects RESTART IDENTITY CASCADE;
DELETE FROM users WHERE email LIKE '%@verify.local';
```
> Uploaded **bytes on disk** (under `apps/api/uploads/`) are *not* removed by SQL —
> Media owns physical deletion and M11 does not exist yet. Clearing the registry
> rows leaves those files as orphaned bytes. For this manual phase that is
> harmless; delete `apps/api/uploads/*` by hand if you want a truly clean slate.

**2. Full DB reset (schema + data).**
```
cd server
npx prisma migrate reset       # drops, recreates, re-applies every migration
```
> Re-runs the avatar backfill migration against an empty `users` table (a no-op),
> leaving a pristine schema. Fastest way to a guaranteed-clean baseline.

**3. Fixtures.** See [README.md](README.md) for the fixture files and how to
generate the oversize / additional-type files locally.

## What this phase deliberately does not do

- It does not run M10/M11 — no background execution, no physical deletion.
- It does not delete uploaded bytes (there is no reclaimer yet; that is M11).
- It does not exercise the compose UI (M9b is deferred) — the client flow is
  simulated by the Postman upload-then-submit-reference sequence.
