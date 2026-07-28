# M11 Reclamation — Controlled Verification & Pre-production Engineering GO

> **Verdict: Pre-production Engineering GO — GRANTED.** The M11 destructive
> reclamation implementation is certified correct under controlled oracle,
> failure, recovery, and concurrency conditions.
>
> **This certification enables nothing.** It does **not** set
> `MEDIA_RECLAMATION_MODE=destructive`, does **not** change the `report` default,
> and is **not** a decision to run destructive anywhere. Actually enabling
> destructive is a separate **Deployment GO** (see the last section).

This is the record for **WI-B (#375)**, the controlled verification of the M11
destructive path. It hard-depended on **WI-A (#356)** (tombstoned-lingering-bytes
recovery), which is merged.

## What was verified, and how independence is guaranteed

The **real, unmodified** reclaimer (`runReclamation`, `createReclamationRepository`)
runs against a per-run **disposable PostgreSQL database** (`wib_verify_*`, schema
built from the committed migrations) and an **isolated temp-dir** local-disk
store. The harness lives in [`server/src/modules/media/verification/`](../../../server/src/modules/media/verification/).

Independence from the implementation (the Oracle can *fail* M11, not ratify it):

- **Expectations are hand-authored literals** from each fixture's intent + ADR 0005
  Decision 8 — never computed by calling M11's selection predicate.
- **Real producers** build the ledger: the referenced / reference-ended fixtures
  are driven through the actual **Tweet**, **Comment**, and **PATCH /users/me
  Avatar** use-cases, so reference coordination itself is under test.
- **Bidirectional** DB↔storage reads — a reclaimer that updates one but not the
  other, hard-deletes a row, deletes on divergence, or reads a feature table is
  caught.
- **Negative controls** prove every Oracle mechanism reports failure on an injected
  wrong state — the anti-circularity evidence.

## Results

### Oracle — O1–O13, M1–M3 (all PASS)

| # | Fixture | Producer | Report | Destructive (DB / storage) |
|---|---|---|---|---|
| O1 | referenced by live tweet | Tweet | not selected | ready / bytes kept |
| O2 | tweet ref ended, past grace | Tweet | would_reclaim | **deleted (row retained)** / bytes deleted |
| O3 | referenced by live comment | Comment | not selected | ready / bytes kept |
| O4 | comment ref ended, past grace | Comment | would_reclaim | deleted (retained) / bytes deleted |
| O5 | current avatar | Avatar | not selected | ready / bytes kept |
| O6 | avatar removed, past grace | Avatar | would_reclaim | deleted (retained) / bytes deleted |
| O7 | never referenced, within grace | — | not selected | ready / bytes kept |
| O8 | never referenced, past grace | — | would_reclaim | deleted (retained) / bytes deleted |
| O9 | row_without_bytes | — | would_quarantine | **ready (not tombstoned)** / quarantined |
| O10 | orphan_bytes | — | would_quarantine | **bytes never deleted** / quarantined |
| O11 | lingering tombstone | — | would_recover | deleted (retained) / **bytes recovered** |
| O12 | under open quarantine | — | excluded | untouched |
| O13 | attach vs reclaim | Tweet attach | — | both winners legal; never tombstoned+referenced |
| M1 | second pass | — | — | converges to no-op |
| M2 | crash → recover | — | — | next pass recovers; tombstone retained |
| M3-after | delete fails post-commit | — | — | left deleted + lingering (backlog); mates reclaim |
| M3-before | tombstone tx fails pre-commit | — | — | rolls back to ready; mates reclaim |

### Negative controls (all fired — the Oracle is sharp)
A deleted+referenced row trips the forbidden-state invariant; a byte/status change
trips report-changed-nothing; a hard-deleted row fails the reclaimed literal (proving
tombstone retention is enforced); a divergence byte-deletion fails the quarantined
literal; a feature-model access trips the registry-only tap. Each was manufactured
directly — **no alternate M11 implementation was built.**

### Global invariants (all held)
- **No `deleted+referenced`** across every pass and interleaving.
- **Report mutated nothing** — bytes and row statuses identical before/after,
  including lingering-tombstone recovery (report performs **zero physical byte
  deletion**).
- **No hard row deletion** — `count(media_objects)` unchanged; reclamation only
  flips `status` to `deleted`, retaining the tombstone.
- **Registry-only at runtime** — the model query-tap observed the selection touch
  only `mediaObject` / `mediaReference` / `mediaReclamationAudit` /
  `mediaQuarantine`; never a feature model.

### DB / storage isolation proof
Each run binds a dedicated `PrismaClient` + transaction runner to a `wib_verify_*`
database (distinct name/OID) and a temp-dir store; `guard()` asserts the bound
`current_database()` matches `^wib_verify_` and differs from dev, and that the
storage root is not the dev upload dir, **before** any destructive pass. Identity
relies on the database name/OID + bound connection + fixture counts + isolated
storage root — **not** the cluster `system_identifier`, which a same-cluster
disposable database shares. Teardown drops the database and removes the temp dir.

### Producer coordination
Tweet (`tweet:{id}`), Comment (`comment:{id}`), and Avatar (`user-avatar:{userId}`)
begin/end signals were exercised through the real services; the resulting ledger
drove selection exactly as the literals expected — the current avatar producer
(PATCH /users/me) included.

### Process-scoped mode semantics
`resolveReclamationMode` enables destructive only for the exact string
`"destructive"` (every other value → report); the job resolves the mode once at
creation and carries it to every run; a source guardrail confirms the handler
re-reads no config per run. A mode change requires a process restart — no
live-config mechanism exists or was added.

## Evidence (reproduce)

From `server/`:

```
# 51 controlled-verification integration tests (disposable DB required)
npx vitest run --config vitest.integration.config.ts src/modules/media/verification/

# process-scoped mode semantics (unit; part of the 178-test unit suite)
npx vitest run src/modules/media/verification/reclamation-verify.mode.test.ts
```

At time of certification: **51/51** integration + **14/14** mode-unit pass;
typecheck clean.

## Findings & deviations

- **No M11 behavioral defect found; no production-code change required.** The
  reclaimer's actual behavior matched every independently-authored literal.
- **Benign:** a `node-postgres` deprecation warning ("client.query() when the
  client is already executing") surfaces during the disposable-env lifecycle. It
  is a warning only — every test passes — and does not affect results.
- **Out of scope (recorded separately):** verification/test sources currently
  compile into `dist` via `tsc`; a build-hygiene item, not addressed here.

## Deferred to the Deployment GO (NOT part of this certification)

Enabling destructive remains a separate operational decision requiring, in
addition to this Engineering GO:

- a **real-traffic soak** with human review (its unique value requires real
  traffic, which the project does not yet have);
- an explicit, per-environment `MEDIA_RECLAMATION_MODE=destructive` flip with the
  kill-switch (restart-to-report) retained;
- production divergence monitoring / alerting and a quarantine-triage runbook.

Until then, `MEDIA_RECLAMATION_MODE` stays `report`.
