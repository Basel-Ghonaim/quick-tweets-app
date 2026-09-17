# Manual Verification — Media Subsystem & Core Flows

A permanent, hands-on verification harness for the running system. It validates
**M7 attach-authorization, M8 `TweetMedia` and M8a/M9 Reference Coordination**
against a real database, alongside the core flows.

## What is here

| File | Purpose |
|---|---|
| [verification-scenarios.md](verification-scenarios.md) | **The catalogue** — every scenario with ID, preconditions, action, expected API + DB state, cleanup, result. The source of truth for *what* is verified. |
| [verification-runbook.md](verification-runbook.md) | **The operations guide** — setup, the pgAdmin/SQL checkpoints, and the phase-by-phase order. *How* to run it. |
| `quick-tweets-verification.postman_collection.json` | Postman v2.1 collection — the **driver** that produces each state transition. Folder 11 also runs from the command line: `npm run verify:reset`, and see the runbook. |
| `environment.local.json` | Postman environment (`QuickTweets — Local`) — base URLs, the two test users, and the captured-variable slots. |
| `fixtures/` | Signature-valid sample images + one deliberately invalid file. |

## The one thing to understand first

**Reference Coordination has no API.** The `media_references` ledger, `TweetMedia`
rows, and `MediaObject` internals are invisible to any endpoint by design. So:

> **Postman drives state. pgAdmin verifies coordination.**

Folder **10** adds a third element, because a verification code is knowable to
nobody by design — delivery discards it and storage digests it. A **capture**
mail backend writes each message to a file, and a person reads the code from
there. For that folder the line is:

> **Postman drives state · the capture file supplies the secret · pgAdmin
> verifies custody.**

The file read is a first-class step, exactly as a DB checkpoint is.

Half of this harness lives in the database. Skipping the DB checkpoints means not
verifying the very thing this phase is for. The runbook's checkpoint SQL is not
optional.

## Quick start

1. **pgAdmin** running, connected to `quick_tweets`.
2. **Server** — from `D:\quick-tweets-app\server`:
   `npm install; npx prisma generate; npx prisma migrate deploy; npm run dev`
3. **Postman** — import the collection and `environment.local.json`; select the
   **QuickTweets — Local** environment.
4. Follow [verification-runbook.md](verification-runbook.md) **phase by phase**,
   pausing at each DB checkpoint. Record outcomes in
   [verification-scenarios.md](verification-scenarios.md).

## Fixtures

| File | What it is | Used for |
|---|---|---|
| `fixtures/sample.png` | Real 1×1 PNG (magic bytes `89 50 4E 47`) | Happy-path uploads |
| `fixtures/sample.gif` | Real 1×1 GIF89a | A second content type |
| `fixtures/not-an-image.png` | Plain text with a `.png` name | The **content-signature rejection** test (MED-07) — must be refused `415` despite the extension |

Two fixtures you generate **locally** (not committed — one is large, one is
trivial):

- **Oversize (>5 MiB) for the `413` test (MED-10).** It must carry a **valid
  image signature**, then exceed the size limit — the signature *head* is
  inspected first, so a zero-filled or random oversize file is rejected `415`
  (unsupported type) **before** the size check ever runs. Prepend a real PNG
  magic and pad past 5 MiB:
  ```bash
  # bash (Git Bash): 8-byte PNG magic, then pad to 6 MiB
  printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a' > big.png
  head -c 6291456 /dev/zero >> big.png
  ```
  ```powershell
  # PowerShell equivalent
  $sig = [byte[]](0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)
  $f = [System.IO.File]::Create("$PWD\big.png"); $f.Write($sig,0,8); $f.SetLength(6MB); $f.Close()
  ```
  Uploading it must return **`413 payload_too_large`** with the server healthy.
- **JPEG / WebP** — any real small image you have on hand, if you want to exercise
  those two allowed types beyond PNG and GIF.

> Allowed types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`. Size limit:
> **5 MiB** inclusive. Both are enforced server-side from the file's own bytes.

## Cleanup / reset between runs

Full detail (with the FK-safe order and the note on orphaned bytes) is in the
runbook's [Reset strategy](verification-runbook.md#reset-strategy). In short:

- **Soft reset** — a `TRUNCATE` script that clears data and keeps the schema.
- **Full reset** — `npx prisma migrate reset` for a pristine baseline.
- **Bytes on disk** under `apps/api/uploads/` are **not** cleared by SQL — Media
  owns physical deletion, and its reclamation runs report-only by default
  ([Media](../../backend/media.md)). Delete them by hand for a truly clean slate.

## Test users

Two users are **required** — the cross-principal attach tests (TWT-09, TWT-12,
CMT-05) need a second principal. Both are defined in the environment
(`verify_alice`, `verify_bob`) and created by folder `01 · Auth`.

## Username rename (WI-F)

Beyond the media phase, folder **09 · Username rename** exercises the
editable-username subsystem (History + Reservation + Redirect): a rename updates the
current handle, **reserves** the former one, and keeps historical locators alive. It
is **self-isolated** (mints its own two users with per-run unique handles) and
**non-destructive**. See scenarios **USR-01…USR-10** and **Checkpoint H**
(`username_aliases`). Its guarantees, in one line each: the session is **id-based**
(a token minted before a rename still works after it — no logout/refresh); a former
handle **never 404s** (301 on the profile URL, transparent resolution elsewhere); the
rename **reuses register's username validation** (one source of truth).

## Channel verification

Folder **10 · Channel verification** exercises proof of control over the account's
email: request a code, read it from the capture file, confirm it, and watch the
self-view move `unproven → pending → proven`. It is **self-isolated** (it mints
its own account with a per-run unique handle) and **non-destructive**. See
scenarios **CHV-01…CHV-13** and **Checkpoint I**.

**It needs the server started with `MAIL_MODE=capture`**, which writes each
message to `.mail-capture/` (gitignored). Without it the code cannot be obtained
and CHV-06 onward cannot run — that is not a gap in the harness but the property
being verified: the plaintext exists in process memory for one request, and
nowhere else.

**It also needs the migrations applied**, `mail_send_attempts` included. Every
send passes through the mail mechanism's abuse controls, which **fail closed**:
if that table is unreachable the send is refused rather than attempted, so CHV-01
answers `refused` while the API is behaving exactly as designed. Apply migrations
before the run, and read a `refused` there as a missing migration rather than a
defect.

Its guarantees, in one line each: the **proof binds to the address, not the
account**, so changing the address reads `unproven` with nothing written; **every
confirmation failure is the same response**, so malformed, wrong, expired,
superseded and replayed are indistinguishable; and **status is derived**, so an
expired challenge reads correctly with no sweep having run.

**Three** ordering constraints are consequences rather than preferences: **CHV-13
runs last** (eleven confirmations exhaust the per-IP budget for fifteen minutes);
**CHV-12 needs a restart** with a short `CHANNEL_VERIFICATION_CHALLENGE_TTL_MS`,
since the default is not waitable by hand and shortening it throughout would
expire codes before they could be pasted; and **CHV-13 depends on that restart**
having cleared the confirm limiter, or its arithmetic engages on the fifth
attempt rather than the eleventh. The catalogue states why each one holds.

## Password reset

Folder **11 · Password reset** exercises recovery for an account whose password its
owner no longer has: request a code, read it from the capture file, confirm it,
apply it, and watch every prior session disappear. Like folder 10 it is
**self-isolated** (its own account, a per-run unique handle) and
**non-destructive**. See scenarios **PWR-01…PWR-15** and **Checkpoint J**.

**It needs the same two preconditions as folder 10** — the server started with
`MAIL_MODE=capture`, and the migrations applied, `password_reset_challenges` and
`mail_send_attempts` both — and for the same reasons. All three endpoints are
**unauthenticated**, which is the point rather than an oversight: requiring a
session would exclude precisely the people recovery exists for.

The guarantee worth watching is the first one. **PWR-01, PWR-02 and PWR-03 must be
byte-identical**: an address no account has, a real address, and a real address
still inside its resend cooldown all answer the same. That is the opposite of
folder 10's CHV-03, which answers a cooldown with a distinct `429` — and the
difference is deliberate. Channel verification is authenticated, so it can afford
to report a cooldown; this surface is anonymous, where reporting one would
disclose that the address belongs to an account. If those three ever diverge, the
capability has stopped doing the one thing it exists to do.

Its other guarantees: **confirm checks and apply consumes**, so the same code
confirms twice and is spent exactly once; **every failure is the same response**,
so wrong, malformed, spent and never-issued are indistinguishable, with an absent
value the single carve-out because it is a malformed request rather than an
answer about a code; **a reset ends every session**, verified by counting rows
rather than by trusting the endpoint; and **spent/expired is derived**, so an
expired credential is refused with its row still sitting there unswept.

**Two** ordering constraints, both consequences: **PWR-14 needs a restart** with a
short `RESET_CODE_TTL_MS` and a shorter `RESET_RESEND_COOLDOWN_MS`, since the default ten minutes is not waitable by hand;
and **PWR-15 runs last, after its own restart**, because it exhausts the per-IP
request budget for fifteen minutes. PWR-15 starts from a cleared counter on
purpose — folder 10's CHV-13 has to document exactly how many attempts precede it
and a runner has to get that arithmetic right, and this avoids needing to.

**What it deliberately does not cover:** the reserved recovery floor. Reaching the
general per-recipient limit takes 15 sends to one address, and the only consumer
that can produce them is channel verification's issue endpoint, whose per-IP
limiter is 10 per 15 minutes and is a **code literal, not configuration** — so the
harness cannot get there without a code change, and seeding the attempts table
directly is the precondition this harness refuses to take. That property is
proven where it can be, in `recipientCapReserve.integration.test.ts`.

## Scope

This harness verifies **M1–M9**. It deliberately does **not**:

- run any background execution or physical deletion — reclamation's destructive
  path is certified by the automated suite below;
- exercise the compose UI (M9b is deferred pending UI/UX) — the client's
  upload-then-submit-reference flow is simulated by the Postman request sequence.

## Automated: M11 destructive-path certification

Separate from this manual M1–M9 harness, the M11 destructive reclamation path is
certified by an **automated** controlled-verification suite — a disposable
PostgreSQL database + isolated storage, the real unmodified reclaimer, an
independent literal oracle, and the real Tweet/Comment/Avatar producers. Its
result — a **Pre-production Engineering GO** that certifies the implementation
**without enabling destructive mode** — is recorded in
[reclamation-controlled-verification-go.md](reclamation-controlled-verification-go.md).
