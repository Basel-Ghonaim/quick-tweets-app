# Verification Runbook — Media Subsystem & Core Flows (M1–M9)

> A **manual** verification pass over the running system, before the destructive
> lifecycle work (M10 substrate, M11 reclamation) is built. It exists because the
> most important thing to verify — **Reference Coordination** — has no API and is
> only observable in the database.
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
(`status`, `uploader_id`, `grant_id`) are **not exposed by any endpoint**.

| What you are verifying | Postman sees | Only pgAdmin sees |
|---|---|---|
| Object stored & servable | `GET /media/:token` → 200 | `status`, `uploader_id`, `grant_id` |
| Avatar attached | `avatar:{token}` on the user | the `user-avatar:{id}` ledger row |
| Tweet media | `media:[{token}]` on the tweet | `tweet_media` rows + `tweet:{id}` ledger rows |
| **Reference began / ended** | *(nothing)* | **the ledger delta — the whole point** |
| Abandoned vs unreferenced | *(nothing)* | the M11 target states (see terminology) |

**A Postman-only pass cannot validate the reclamation prerequisite.** Treat every
DB checkpoint below as a required step, not an optional peek.

## Terminology — two distinct M11 targets (do not conflate)

These are different states with different causes. M11 will treat them
differently, so this verification keeps them separate:

- **Abandoned (grant-provenance).** An object uploaded under an upload grant that
  was **never adopted**, whose grant is no longer live. It has `uploader_id IS
  NULL` and a `grant_id`. This is ADR 0007's "abandoned" — it never belonged to a
  principal. *Cause:* a register flow that uploaded an avatar but never completed.
- **Unreferenced (owned).** An object with an `uploader_id` (an authenticated
  upload, or an adopted avatar) that **no longer has any ledger row** pointing at
  it. It was owned and referenced; the reference ended. *Cause:* a tweet whose
  media was removed, or a tweet that was deleted.

The word **abandoned** is reserved for the first. The second is **unreferenced**.

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
- `mediaMintLimiter` guards `POST /media/grants`. Mint sparingly.

## DB checkpoints

Open these in pgAdmin's Query Tool. Replace `:id` placeholders with the values
Postman captured (visible in the environment quick-look, or in each response).

### Checkpoint A — Media primitives (after folder 02)
```sql
-- Every uploaded object is 'ready', with the right provenance.
--   Bearer upload  → uploader_id set, grant_id null
--   grant upload   → uploader_id null, grant_id set
SELECT id, status, uploader_id, grant_id, content_type, size
FROM media_objects
ORDER BY id DESC
LIMIT 10;
```

### Checkpoint B — Avatar adoption (after folder 03, step 3)
```sql
-- The adopted avatar: uploader_id is now the new user, grant_id retained as
-- provenance, and a ledger row exists under user-avatar:{id}.
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
-- MediaObjects survive as 'ready' with an uploader — i.e. UNREFERENCED (owned),
-- not abandoned. This is M11's target for owned-but-unreferenced reclamation.
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
-- The M11 precondition, both directions. All three MUST be 0.
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
  (SELECT count(*) FROM media_references r
     WHERE NOT EXISTS (SELECT 1 FROM users u
                       WHERE u.avatar_media_id = r.media_id
                         AND r.referrer = 'user-avatar:' || u.id)
       AND NOT EXISTS (SELECT 1 FROM tweet_media tm
                       WHERE tm.media_id = r.media_id
                         AND r.referrer = 'tweet:' || tm.tweet_id))            AS orphan_ledger_rows;
-- All three = 0 → every real reference is recorded and no ledger row is stale.
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

## Incremental workflow

Run **in folder order**, pausing at each checkpoint before proceeding. Do not run
the whole collection at once — the point is to inspect state between steps.

| Phase | Folder | Ends at checkpoint |
|---|---|---|
| 1 — Auth spine | 00, 01 | none (API-observable only) |
| 2 — Media primitives | 02 | **A** |
| 3 — Avatar adoption | 03 | **B** |
| 4 — Tweet coordination | 04 | **C → D (×3) → E**, then **G** for the failure |
| 5 — Invariant sweep | — | **F** (must be all-zero before declaring the phase clean) |
| 6 — Social | 05, 06, 07 | none |

A phase is "green" only when its API assertions pass **and** its DB checkpoint
matches. Record outcomes in [verification-scenarios.md](verification-scenarios.md)
(the Result/Notes column).

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
> Uploaded **bytes on disk** (under `server/uploads/`) are *not* removed by SQL —
> Media owns physical deletion and M11 does not exist yet. Clearing the registry
> rows leaves those files as orphaned bytes. For this manual phase that is
> harmless; delete `server/uploads/*` by hand if you want a truly clean slate.

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
