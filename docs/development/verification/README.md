# Manual Verification — Media Subsystem & Core Flows

A permanent, hands-on verification harness for the running system. It exists so
the paths added since the M6 hands-on pass — **M7 attach-authorization, M8
`TweetMedia`, M8a/M9 Reference Coordination** — are validated against a real
database **before** the destructive lifecycle work (M10 substrate, M11
reclamation) is built.

## What is here

| File | Purpose |
|---|---|
| [verification-scenarios.md](verification-scenarios.md) | **The catalogue** — every scenario with ID, preconditions, action, expected API + DB state, cleanup, result. The source of truth for *what* is verified. |
| [verification-runbook.md](verification-runbook.md) | **The operations guide** — setup, the pgAdmin/SQL checkpoints, and the phase-by-phase order. *How* to run it. |
| `quick-tweets-verification.postman_collection.json` | Postman v2.1 collection — the **driver** that produces each state transition. |
| `environment.local.json` | Postman environment (`QuickTweets — Local`) — base URLs, the two test users, and the captured-variable slots. |
| `fixtures/` | Signature-valid sample images + one deliberately invalid file. |

## The one thing to understand first

**Reference Coordination has no API.** The `media_references` ledger, `TweetMedia`
rows, and `MediaObject` internals are invisible to any endpoint by design. So:

> **Postman drives state. pgAdmin verifies coordination.**

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
- **Bytes on disk** under `server/uploads/` are **not** cleared by SQL — Media
  owns physical deletion and M11 does not exist yet. Delete them by hand for a
  truly clean slate. (Their accumulation is exactly what M11 will address; seeing
  them pile up here is a preview of why reclamation is needed.)

## Test users

Two users are **required** — the cross-principal attach tests (TWT-09, TWT-12,
CMT-05) need a second principal. Both are defined in the environment
(`verify_alice`, `verify_bob`) and created by folder `01 · Auth`.

## Scope

This harness verifies **M1–M9**. It deliberately does **not**:

- run any background execution or physical deletion (that is M10/M11, intentionally
  unbuilt);
- exercise the compose UI (M9b is deferred pending UI/UX) — the client's
  upload-then-submit-reference flow is simulated by the Postman request sequence.

When every scenario passes — API assertions **and** DB checkpoints — the system is
cleared to proceed to M10, then M11.
