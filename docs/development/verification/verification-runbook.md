# Verification Runbook — Media Subsystem & Core Flows (M1–M9 + Comment Media)

> A **manual** verification pass over the running system. It deletes no stored
> bytes: reclamation runs report-only by default ([Media](../../backend/media.md)),
> and nothing here enables it. It exists
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

1. **pgAdmin running**, connected to the database your tree's `DATABASE_URL`
   names — a linked worktree has its own ([local setup](../setup.md#working-in-a-linked-worktree)).
2. **Server running** — install once at the repository root, then run the rest
   from `apps/api/`:
   ```
   npm install                # at the repository root
   cd apps/api
   npx prisma generate
   npx prisma migrate deploy
   npm run dev
   ```
3. **Client running** (optional for this phase — the API is exercised directly):
   `npm run dev` from the repository root. In a linked worktree, run it with its
   port pinned and `VITE_API_URL` set, as [local setup](../setup.md#working-in-a-linked-worktree)
   says — otherwise it drives the other tree's backend.
4. **Postman** with the collection and environment imported (see below).
5. A **clean or known** database state (see [Reset strategy](#reset-strategy)).

## Import into Postman

1. Import `quick-tweets-verification.postman_collection.json`.
2. Import `environment.local.json` and select **QuickTweets — Local** as the
   active environment.
3. The environment points `baseUrl` and `mediaOrigin` at port `4000`, the
   backend's default. If yours runs on another `PORT` — a linked worktree's does
   ([local setup](../setup.md#working-in-a-linked-worktree)) — change the port
   in **both**, together: they are pinned separately, and folders 00 and 02 read
   `mediaOrigin`. The Newman runs need only `baseUrl`
   ([below](#running-folder-11-from-the-command-line-newman)).
4. The image fixtures are under `fixtures/`. On the first file-upload request,
   Postman may ask you to re-select the file — point it at
   `fixtures/sample.png` (Postman stores file paths per machine).

## Running folders 11, 12 and 13 from the command line (Newman)

Three folders have scripted runners, and for more than one reason. **Folder 11** is
scripted because its guarantees are cheap to break and invisible in a body.
**Folder 12.1** is scripted because the opposite is true: every guarantee in it —
which list a query asks for, which refusal an id earns, what a page's meta says —
*is* the body, so a CLI run checks exactly the thing the folder exists for.

**Folder 12.2 is split off precisely because that stops being true.** Its API half
scripts fine, but whether a removed reply's media reference ended is invisible to
every endpoint by design, so that half is Checkpoint K in pgAdmin.

**Folder 13** is the clean case of the same argument: a like holds no media
reference, so nothing about it is invisible to the API. Count and state are both
in the body, and the folder therefore runs whole, with no pgAdmin half at all.

The remaining folders stay hand-driven: they need pgAdmin beside them, and a green
CLI run would say nothing about the coordination they exist to check.

### Folder 07 — follows, and the state every Follow button reads

**Not self-isolated**: it needs folder 01's tokens and handles, so seed them by
the note below if folder 09 has already run.

```bash
npm run verify:follows -- --env-var baseUrl=http://localhost:4001/api/v1
```

Like folder 13 it needs no pgAdmin: follow state is two booleans in a body, and
the graph it asserts against is deliberately **asymmetric** — B follows A and A
does not follow back — so the two directions can be told apart. A mutual pair
would pass whichever way the fields were wired.

### Folder 14 — the edited marker

Self-isolated, and needs no pgAdmin: the marker is a field in a body.

```bash
npm run verify:edited -- --env-var baseUrl=http://localhost:4001/api/v1
```

**One of its scenarios lives elsewhere.** `EDT-05` — that a media-only edit
neither sets nor refreshes the marker — is asserted in **folder 04**, where a
media-only PATCH already exists after a text edit, so the before/after is real
rather than staged. Folder 04 uploads fixtures, so it needs `--working-dir`.

### Folder 13 — comment likes

Self-isolated: its own account with a per-run handle, its own post and comments.

```bash
npm run verify:likes
# from a linked worktree, as ever:
npm run verify:likes -- --env-var baseUrl=http://localhost:4001/api/v1
```

**Folder 06 changes with it** and is not self-isolated — it needs `accessTokenB`
and the `tweetId` folder 05 leaves behind, so run `05` and `06` together, seeding
the tokens by the note below if folder 09 has already run.

### Folder 12 — the comment thread

Self-isolated: it mints its own account with a per-run handle and its own posts,
so it needs no reset and collides with nothing.

```bash
# 12.1 — shape, levels, pages and refusals. Exports the environment 12.2 needs.
npm run verify:thread

# 12.2 — the cascade. Pause between its two halves for Checkpoint K.
npm run verify:thread:cascade
```

**Pause after CMT-T13** (the reply carrying an image) and record Checkpoint K's
"before" counts, then let CMT-T14 run and record the "after". Running 12.2 straight
through is fine for the API assertions, but it steps over the one thing the folder
cannot assert.

From a linked worktree, append the tree's own base URL to each — a linked tree
runs on its own port ([local setup](../setup.md#working-in-a-linked-worktree)):

```bash
npm run verify:thread -- --env-var baseUrl=http://localhost:4001/api/v1
```

### Folder 11 — password reset

Folder 11 **runs in three legs, and the breaks are not arbitrary.** The first is the
manual code paste — the code is knowable to nobody by design, so no runner can
cross it. The second is a restart, because the limiter counter is in memory.
The subfolders are named for those breaks.

Run all three from the repository root: the scripts live in its `package.json`
and resolve the collection and `.newman/` from there.

```bash
# Leg 1 — everything up to the point the code is needed.
# Exports the environment and the cookie jar that leg 2 depends on.
npm run verify:reset

# Read the code from the newest file in apps/api/.mail-capture/, then:
npm run verify:reset:code -- --env-var pwrCode=7QK3MNP2XVZB

# Restart the API, then run the limiter last.
npm run verify:reset:limiter
```

Against a server somewhere other than the default, append
`-- --env-var baseUrl=http://localhost:4300/api/v1` to each.

### `--working-dir`, for any folder that uploads a fixture

**Folders 04, 08 and 12.2 upload files by a path relative to `fixtures/`**, so a
run started from the repository root cannot find them and every upload fails with
`file load error: "fixtures/sample.png", no such file` — which then cascades into
every assertion downstream of it. It looks like a broken folder and is not:

```bash
npx -y newman@6.2.2 run <collection> -e <env>   --working-dir docs/development/verification --folder "04 · Tweets + media (M7–M9)"
```

The folders that upload nothing — 07, 12.1, 13 — do not need it.

> **Leg 2 will not work without leg 1's cookie jar**, and it fails in the most
> misleading way available: every request from PWR-07 answers `400`,
> indistinguishable from a wrong code — which is exactly what **G2** promises, so
> the harness cannot tell you which one it was. If leg 2 fails wholesale, suspect
> the jar before suspecting the capability.

> **Newman is not a dependency of this repository.** The scripts invoke it through
> `npx` at a pinned version, so nothing is installed and the lockfile is untouched.
> That is deliberate: newman's tree carries a large number of advisories, and this
> is a manual harness that never runs in CI. The cost of pulling it in permanently
> is not worth a runner used by hand.

> **`.newman/` is git-ignored.** The exported environment holds the pasted code and
> the jar holds the position key it was issued against. Both are live single-use
> secrets, for the same reason captured mail is ignored.

**PWR-14 has no script**, and cannot: it needs a restart at a short
`RESET_CODE_TTL_MS` with a shorter `RESET_RESEND_COOLDOWN_MS`, and a wait. It stays a hand-run step — see its note below.

## How auth is handled

- **Access token** is returned in the response *body*. Register/Login test scripts
  capture it into `{{accessTokenA}}` / `{{accessTokenB}}` and every authenticated
  request sends it as `Bearer`.
- **Refresh token** and the `qt_session` hint are **httpOnly / normal cookies**,
  handled automatically by Postman's cookie jar. `refresh` and `logout` need no
  body.
- **`qt_reset`** is a third cookie, and folder 11 depends on it entirely: it
  addresses the reader's position in the recovery flow, and `apply` reads the
  credential from it rather than from a request body. It is `httpOnly` and
  scoped to `/api/v1/auth/password-reset`, so the jar carries it and nothing
  else needs to know it exists.
- **Two users, one cookie jar.** On `localhost` both users share Postman's jar, so
  logging in as B overwrites A's refresh cookie. That is why cross-principal tests
  authorize with the **per-user Bearer token**, never the cookie. Do not "fix"
  this by juggling cookies — the Bearer tokens are the source of truth.

## Folder 01 cannot re-register once folder 09 has run (test-only friction)

Folder 09 **renames** the two users. Their rows keep the harness's *emails* and
take new *usernames*, so a later folder 01 finds `verify_alice` free and
`alice@verify.local` taken, and `Register — User A` answers **409 "Email already
in use"**. The register script never runs, `{{accessTokenA}}` stays empty, and
every authenticated request after it answers **401** — including all of folder 05,
which then looks broken while nothing is wrong with it.

Deleting the `verify_alice` / `verify_bob` *usernames* does not help, because the
rows holding those emails no longer carry them. Either do a reset
([below](#reset-strategy)), or log in to the existing accounts by **email** and
seed the two tokens:

```bash
curl -s -X POST http://localhost:4001/api/v1/auth/login   -H "Content-Type: application/json"   -d '{"identifier":"alice@verify.local","password":"Passw0rd!23"}'
```

Note `identifier`, not `email` — the login body takes either a username or an
address under that one key.

## A request that omits auth still sends one

**The collection carries a bearer at its root** (`{{accessTokenA}}`), so a request
that simply leaves `auth` out **inherits it**. Any scenario whose subject is being
*unauthenticated* — or being a *guest* — must set `auth` to `noauth` explicitly,
or it tests nothing and passes for the wrong reason.

This is not hypothetical: **LIK-08**, **CML-05**, **CML-10** and **CML-12** were
written without it and passed only because `accessTokenA` happened to be empty in
the environment they were first run against. They pass for the right reason now.
Anything added later that reads *as a guest* needs the same.

## Rate-limit awareness (test-only friction, not a bug)

- `authLimiter` = **10 requests / 15 min** per IP, counting every `register` and
  `login` whatever it answers. Folders 01, 09 and 10 spend all ten between them
  before CHV-12's restart clears the counter, so repeating any of them first
  needs a restart. A `429 rate_limit` there is the limiter working, not a defect.

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

### Checkpoint B — retired

It checked the avatar of the account the pre-auth avatar folder created, and was retired with that folder and the upload grant (ADR 0008). Where the authenticated avatar is proven is the [catalogue's §3](verification-scenarios.md#3--avatar--retired-pre-auth-adoption-removed).

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
-- The failed creates (TWT-07, then the cross-principal attach) must leave NOTHING:
-- no tweet, no tweet_media, no ledger row for either object they named.
SELECT
  (SELECT count(*) FROM tweets WHERE body = 'should fail')                     AS stray_tweets,
  (SELECT count(*) FROM media_references
     WHERE media_id = (SELECT id FROM media_objects
                       WHERE token = :mediaTokenA1))                           AS strays_for_A1_object,
  (SELECT count(*) FROM media_references
     WHERE media_id = (SELECT id FROM media_objects
                       WHERE token = :mediaTokenB1))                           AS strays_for_B_object;
-- All three = 0.
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
-- After CHV-10: the verified challenge is STILL PRESENT — success closes a
--               challenge, it never deletes it — and the resend's own open
--               challenge joins it. Nothing reads 'superseded': CHV-06 had
--               already closed the only open challenge, so the resend found
--               none to supersede. A row reads 'superseded' when a resend
--               rotates a challenge that was never confirmed — which this
--               order never produces.

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
--    Timestamps are stored in UTC without a zone, so now() is read in UTC too.
SELECT count(*) AS expired_but_unswept
FROM channel_verification_challenges ch
JOIN channel_verifications v ON v.id = ch.verification_id
WHERE v.user_id = :cvUserId AND ch.closed_at IS NULL AND ch.expires_at < now() AT TIME ZONE 'UTC';
```
> **CHV-11 moves `users.email` directly**, because no endpoint does. That changes
> an *input* the capability is asked about; the capability's own state is
> untouched and is observed through the API. It is **not** the seeding pattern
> this harness rejects — nothing fabricates a state the system cannot produce,
> and no persistence fact about challenges is relied on to make a scenario pass.

#### The two steps folder 10 cannot make as requests

The scenario catalogue sends you here for both. Neither has an endpoint.

**CHV-11 — move the address, then restore it.** Run the move, call
`GET /users/me` (it must read `unproven`), then put the address back.

```sql
-- Move it. Any unused, unique value works.
UPDATE users SET email = 'moved-' || email WHERE id = :cvUserId;

-- Restore it after observing the projection.
UPDATE users SET email = regexp_replace(email, '^moved-', '') WHERE id = :cvUserId;
```

**CHV-12 — restart with a waitable expiry.** Stop the server and start it again
with a short `CHANNEL_VERIFICATION_CHALLENGE_TTL_MS` (a few seconds), still in
`MAIL_MODE=capture`. Issue against a fresh unproven address, wait past the
expiry, and read the projection — **run no sweep.** That restart is also what
clears the confirm limiter CHV-13's arithmetic assumes, which is why CHV-13 runs
after it.

> **Apply the migrations before any of this**, `mail_send_attempts` included: the
> mail mechanism's controls fail closed, so an unapplied migration makes CHV-01
> answer `refused` from a correctly-behaving system. The scenario catalogue's
> setup precondition states why.

> **USR-05** and **USR-07** have no distinct DB shape of their own — they are the
> *refusals* this reservation produces (a former handle rejected to a rename and to
> a registration). Confirm them by their `409` and by this checkpoint showing the
> alias still owned by the original account.


### Checkpoint J — Password reset custody, position and revocation (folder 11)
```sql
-- The credential lives entirely inside Auth, shares nothing with Channel
-- Verification, and a completed reset leaves no session alive. Substitute
-- :pwrUserId with the id folder 11's Setup captured.
--
-- Queries 6-8 cover the position (ADR 0017). Note they are NOT keyed on
-- :pwrUserId, and cannot be: a position opened for an address no account has
-- has no user to key on, which is the point of opening one for every address
-- alike. Read them against the run's live rows instead.

-- 1. ISOLATION: the reset credential has no foreign key to, and no column
--    naming, any channel-verification table. MUST return 0 rows.
SELECT tc.constraint_name, ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'password_reset_challenges'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name LIKE 'channel_verification%';

-- 2. The credential, and the shape it is stored in. After PWR-02 exactly one
--    row; after PWR-03 and PWR-03b still exactly one (the cooldown minted nothing);
--    code_hash is a 64-character digest and never the code itself.
SELECT id, user_id, length(code_hash) AS code_hash_length,
       expires_at, used_at, created_at
FROM password_reset_challenges
WHERE user_id = :pwrUserId
ORDER BY created_at DESC;

-- 3. REVOCATION (I7): after PWR-10 this MUST be 0, and after PWR-11's login
--    exactly 1 — the new session, and nothing that predates the reset.
SELECT count(*) AS live_sessions
FROM refresh_tokens
WHERE user_id = :pwrUserId;

-- 4. DERIVED, NOT STORED (I8): after PWR-14 the expired row is still present
--    and still unspent. Nothing had to write for confirm to refuse it, and no
--    sweep has run. MUST return the row, with used_at NULL and expires_at past.
--    Timestamps are stored in UTC without a zone, so now() is read in UTC too.
SELECT id, expires_at, used_at, expires_at < now() AT TIME ZONE 'UTC' AS is_expired
FROM password_reset_challenges
WHERE user_id = :pwrUserId
ORDER BY created_at DESC
LIMIT 1;

-- 5. And the credential table carries no status column — usable is decided by
--    used_at and expires_at alone. MUST be 0.
SELECT count(*) AS status_columns
FROM information_schema.columns
WHERE table_name = 'password_reset_challenges'
  AND (column_name ILIKE '%status%' OR column_name ILIKE '%state%');

-- 6. THE STEP IS DERIVED (G6). The position table carries no step column. MUST
--    be 0 — a stored step would be a second copy of something the credential
--    already decides.
--
--    `user_id` was on this list and is deliberately no longer: the resend route
--    reads the account from the position, and the column is NULL for an address
--    no account holds, so the row stays identical in KIND on every branch.
--    Neutrality is a property of what a caller can observe, and this table is
--    not observable — the challenges table has carried a user_id since the
--    capability was built, so a reader of the database could already tell.
SELECT count(*) AS forbidden_columns
FROM information_schema.columns
WHERE table_name = 'password_reset_sessions'
  AND (column_name ILIKE '%step%' OR column_name ILIKE '%status%'
       OR column_name ILIKE '%state%');

-- 6a. AND THE ACCOUNT COLUMN IS NULLABLE (G1). MUST be 'YES'. A NOT NULL here
--     would mean a position could not be opened for an address no account
--     holds, which is the disclosure the constant 202 exists to prevent.
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_sessions' AND column_name = 'user_id';

-- 7. THE POSITION ITSELF. After PWR-01a exactly one live row with challenge_id
--    NULL (the step reads 'code') and user_id NULL (no account holds that
--    address); after PWR-02a still exactly one, superseded rather than added
--    to, now with user_id set; after PWR-03c resends_used is 1 and
--    last_asked_at has moved FOR A RESEND THAT SENT NOTHING; after PWR-07a
--    that row's challenge_id is set (the step reads 'password').
--
--    After PWR-10a the row SURVIVES. `apply` clears the cookie and deletes
--    nothing, so the read answers 'request' because the key is gone, not
--    because the row is. Expect to find it here.
SELECT id, challenge_id, user_id, resends_used, masked_endpoint,
       last_asked_at, expires_at, created_at
FROM password_reset_sessions
WHERE expires_at > now() AT TIME ZONE 'UTC'
ORDER BY created_at DESC;

-- 8. THE MASK IS WHAT IS STORED (D5). Masking happens where the address is
--    held, so the unmasked value is never written here and cannot leak from a
--    stale row. MUST be 0.
SELECT count(*) AS unmasked_rows
FROM password_reset_sessions
WHERE masked_endpoint NOT LIKE '%•%';
```

> **PWR-15 runs last, and after its own restart.** Eleven requests exhaust the
> per-IP mint budget — ten per fifteen minutes, **shared with the resend route** —
> and would block everything after them. It starts from
> a cleared counter deliberately: folder 10's CHV-13 has to document exactly how
> many attempts precede it and a runner has to get that arithmetic right, and
> starting fresh removes the need to.

> **PWR-14a and PWR-14b are runbook steps too**, and share one restart. Start the
> API with `RESET_MAX_RESENDS=1` (and a cooldown short enough to wait out —
> `RESET_RESEND_COOLDOWN_MS=1000` against the default TTL). Request a code, wait
> the window out, resend once: the answer already reads `canResend: false`.
> Resend again and the answer is the same `400` as PWR-04, with query 7 showing
> `resends_used` still 1 and `expires_at` unmoved — a refused ask extends nothing.

> **PWR-14 is a runbook step, not a request.** The default `RESET_CODE_TTL_MS` is
> ten minutes, which is not waitable by hand, and shortening it for the whole
> folder would expire codes before they can be pasted. Restart the API with
> `RESET_CODE_TTL_MS=5000` and `RESET_RESEND_COOLDOWN_MS=1000` (both, as
> [local setup](../setup.md#password-reset) requires), run PWR-02 again to mint a fresh code, wait past five
> seconds, then confirm it. The answer must be the same `400` as PWR-04, and
> query 4 above must still find the row — the point being that **no writer had to
> run** for an expired credential to stop working.

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
-- Expect: an ERROR naming constraint "comments_tweet_id_fkey" on table "comments";
--         the wording around it varies by PostgreSQL version.
ROLLBACK;   -- leaves the tweet + comment intact
```
> Likes still cascade (untouched by Comment Media); the restrict comment is
> deliberately **media-free**, so `comments_tweet_id_fkey` is the *only* thing
> that can refuse the delete — the proof is unambiguous.

## Checkpoint K — the reply cascade (folder 12)

**What it is for.** CMT-T14 deletes a top-level comment that has two replies, one
of them carrying an image. The endpoint answers `204` and says nothing more. Three
facts matter and none of them is in that response: the replies really went, the
removed reply's media reference really ended, and the object itself survived to be
reclaimed rather than being dropped.

**Before CMT-T14** — with the thread built by 12.1 and CMT-T13:

```sql
-- The shape the cascade is about to remove: one parent, two replies, one image.
SELECT id, parent_id, media_id FROM comments WHERE tweet_id = :thrTweetId ORDER BY id;

-- The ledger rows those comments hold.
SELECT referrer FROM media_references
WHERE referrer IN (SELECT 'comment:' || id FROM comments WHERE tweet_id = :thrTweetId);
```

Expect three comment rows — one with `parent_id` NULL, two pointing at it, one of
those carrying a `media_id` — and **one** ledger row, `comment:{the media reply}`.

**After CMT-T14:**

```sql
-- Nothing at either level is left.
SELECT id FROM comments WHERE tweet_id = :thrTweetId;                      -- expect 0 rows

-- Every reference those comments held has ended.
SELECT referrer FROM media_references WHERE referrer = 'comment:' || :thrMediaReplyId;  -- expect 0 rows

-- The object itself survived, owned and unreferenced — reclamation's to take.
SELECT o.id, o.status, o.uploader_id,
       (SELECT count(*) FROM media_references r WHERE r.media_id = o.id) AS refs
FROM media_objects o WHERE o.token = :thrMediaToken;
```

Expect `status = ready`, `uploader_id` set, `refs = 0`. **That last row is the
whole point.** A reply deleted while Media still believed its object referenced
would leak the object permanently, and nothing in the API would ever say so.

**CMT-T18 is pgAdmin-only**, exactly as CMT-M11 is — no endpoint can ask the
database to bypass the application:

```sql
BEGIN;
DELETE FROM comments WHERE id = :aParentWithReplies;  -- expect: violates comments_parent_id_fkey
ROLLBACK;
```

A single-row delete of a comment that still has replies is refused. (One statement
covering *both* levels is accepted, because a RESTRICT check passes when the
referencing row goes in that same statement — which is why the application deletes
in dependency order rather than resting on when the constraint is evaluated.)

## Incremental workflow

Run **in folder order**, pausing at each checkpoint before proceeding. Do not run
the whole collection at once — the point is to inspect state between steps.

| Phase | Folder | Ends at checkpoint |
|---|---|---|
| 1 — Auth spine | 00, 01 | none (API-observable only) |
| 2 — Media primitives | 02 | **A** |
| 3 — Avatar | — | retired with the upload grant |
| 4 — Tweet coordination | 04 | **C → D (×3) → E**, then **G** for the failures |
| 5 — Social | 05, 06, 07 | none |
| 6 — Comment media | 08 | **CM-1 → CM-2 → CM-3 → CM-4 → CM-5 → CM-6** (see the execution map below) |
| 7 — Username rename | 09 | **H** (after USR-01, USR-09, and USR-10) |
| 8 — Channel verification | 10 | **I** (after CHV-01, CHV-06, and CHV-11). Run in order: CHV-13 **last**, and only after CHV-12's restart has cleared the confirm limiter |
| 9 — Password reset | 11 | **J** (after PWR-02, PWR-10, and PWR-14). Run in order: PWR-15 **last**, and only after its own restart has cleared the request limiter |
| 10 — Invariant sweep | — | **F** — extended for comments; must be all-zero before declaring the phase clean |

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
| **E** Cascade | E1 → E2 → E3 → E4 → E5 → E6 | `cmCascadeTweetMedia`, `cmCascadeTweetId`, `cmCascadeCommentMedia`, `cmCascadeCommentId` | — (fresh tweet) | 201×4 / 204 / 404 | **CM-5** after E5 |
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
> Media owns physical deletion, and its reclamation runs report-only by default. Clearing the registry
> rows leaves those files as orphaned bytes. For this manual phase that is
> harmless; delete `apps/api/uploads/*` by hand if you want a truly clean slate.

**2. Full DB reset (schema + data).**
```
cd apps/api
npx prisma migrate reset       # drops, recreates, re-applies every migration
```
> Re-runs the avatar backfill migration against an empty `users` table (a no-op),
> leaving a pristine schema. Fastest way to a guaranteed-clean baseline.

**3. Fixtures.** See [README.md](README.md) for the fixture files and how to
generate the oversize / additional-type files locally.

## What this phase deliberately does not do

- It exercises no background job and deletes no uploaded bytes — reclamation's
  destructive path is certified by its [automated suite](README.md#automated-m11-destructive-path-certification).
- It does not exercise the compose UI (M9b is deferred) — the client flow is
  simulated by the Postman upload-then-submit-reference sequence.
