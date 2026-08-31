# Mail Delivery — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-31
> **Parent Issue:** *pending — created with the first Work Item*
> **Supersedes:** —

This plan sequences the implementation of a **real outbound mail mechanism** into six independently reviewable Work Items. Its architecture is **closed** — recorded in [ADR 0015](../architecture/decisions/0015-mail-delivery-boundary-and-abuse-control.md), which owns the boundary, the production posture, the abuse controls and the result semantics, and which this plan never reopens. The mechanism as it exists today is owned by [`backend/mail.md`](../backend/mail.md).

It is a **strategy document**: it owns the effort's execution order, boundaries, invariants, and the rationale for that order. Each Work Item's granular acceptance criteria and status belong to its Issue, which this plan links and never mirrors.

## 1 · Purpose & goals

- Make the mail mechanism **actually deliver**, so that Channel Verification — complete as a capability and unusable as a feature — can reach the person a code was minted for.
- Establish delivery's **abuse controls** before real sending exists, not after the first incident.
- Keep **one code path** between development and production, so what a developer exercises is what production runs.
- Leave the mechanism **honest**: nothing reports a claim it cannot support, in configuration or on the wire.

## 2 · Boundary declaration

**Covers:** an SMTP backend and its timeout · the three-state send result and the wire field that reports it · the production delivery-capability rule · relocation to a module · the cap's schema, migration and repository · the per-recipient cap and global outbound ceiling as a decorator · the cap's pruning job · co-versioning of `mail.md`, the API contract, the data model, `security.md`'s cession, and the verification harness.

**Does not cover:** retries, queueing, deduplication · bounce, complaint or suppression handling · templating, message content, or i18n — all the composing consumer's · multi-channel machinery · gating policy · a per-actor cap, which ADR 0015 assigns to consumers that have an actor · new logging or monitoring infrastructure · the `Future expansion` blocks in `auth.repository.ts` and `auth.types.ts` · any other recorded Finding.

## 3 · Pinned constraints

### 3.1 Invariants

Each Work Item cites the invariants it protects. Most are mechanically checkable.

- **I1 — One code path.** No environment-dependent branch inside the send path; development and production differ only by configuration. *(grep-verifiable: no `NODE_ENV` in any adapter)*
- **I2 — The port stays domain-ignorant.** The existing guardrail test keeps passing, unmodified.
- **I3 — Delivery imports no consumer.** The mechanism never imports a feature module or Channel Verification. *(grep-verifiable)*
- **I4 — No unsupportable claim.** Nothing reports success for a message no transport accepted.
- **I5 — Failure is returned, never thrown** — including cap refusals and timeouts.
- **I6 — The cap covers every backend.** No backend reaches a transport without passing it.
- **I7 — Cap state is independent.** No derivation from, and no foreign key to, any consumer's rows.
- **I8 — No test sends real mail.** *(grep-verifiable: no test selects the `smtp` mode)*
- **I9 — Every declared variant has a producer on the day it lands.** No dead union member — the defect recorded in #578, which this effort must not repeat.
- **I10 — Retention never falls below the longest cap window.** The window and the retention are separate settings introduced by separate Work Items; if retention is the shorter, pruning removes rows the window still counts and the cap silently under-enforces with no error anywhere. **Owned by WI-6**, which introduces retention, and cited by WI-5, which introduces the windows.

### 3.2 Settled decisions

Approved before drafting; **binding, and not reopened by any Work Item.**

- **D1 — Provider-neutral SMTP.** A provider is a host and a credential, never a dependency. **The specific provider is chosen at execution** from the free transactional options, on a **dedicated sending subdomain** so that development traffic cannot damage the root domain's reputation. A local catcher is a host under this rule, not a backend.
- **D2 — Real delivery is required in development**, not a catcher only.
- **D3 — Production refuses a mode that cannot deliver**, stated positively so a future non-delivering backend is refused by construction. `inert` remains available outside production.
- **D4 — Development credentials are per-developer.** `.env` stays gitignored; `.env.example` carries a placeholder, as `JWT_SECRET` does today.
- **D5 — The ceiling's alarm is a distinguished, greppable log line plus provider-side alerting.** No logging or monitoring infrastructure is introduced by this effort; `mail.md` states plainly that this is what "alarmed" means here.
- **D6 — The cap counts attempts, over a rolling window**, and an `unknown` outcome **consumes quota** — the message may have been relayed, and treating ignorance as "did not happen" would hand an attacker free retries.
- **D7 — Cap storage failure fails closed.** The database was already required to persist the challenge moments earlier, so the cost is near zero, while failing open would remove the control precisely during an incident.
- **D8 — The cap is a decorator over every backend**, so it is exercised constantly rather than first in production. The verification harness must retain headroom.
- **D9 — `delivered` is renamed to a three-state field, not redefined.** A boolean cannot honestly carry three states, and the name asserts something no backend can promise.
- **D10 — The environment set is locked in §6** and introduced per Work Item, **each with a default where a default is meaningful**, each added to `.env.example` in the same commit so parity is never broken. Credentials carry a **placeholder, never a default** — ADR 0015 scopes "with defaults" to the cap's limits, the ceiling's headroom and the alarm, and a secret issued by a third party has no default to give.
- **D11 — The harness is updated first, then the human Postman gate is run once**, against the harness as it stands after the **last Work Item that touches it**. Channel Verification's **WI-8 criterion (#450)** is recorded as **retired, not met** — never presented as a retrospective pass.

  Two distinct activities must not be confused, which is the confusion #450 exists because of. An **implementer harness run** during execution is evidence that a Work Item did not break folder 10; the **human Postman gate** is the closing act, run once, by a person, on the final version. Neither substitutes for the other.

### 3.3 External prerequisite

**WI-1 does not open until a free transactional provider has been selected and proven able to deliver.** This is work outside the repository, and it gates the effort rather than running inside it.

It is satisfied when all of the following hold:

- a provider is chosen from the free options, and **SMTP is available on its free tier** — several offer an HTTP API only, which D1's transport decision cannot use;
- **domain authentication is available on that free tier**, and the dedicated sending subdomain and its DNS records are verified with the provider;
- **a message has been observed arriving in an inbox that was not pre-registered with the provider** — a sandbox that delivers only to verified addresses would satisfy a looser wording while proving nothing about real delivery;
- **provider-side alerting on send volume is configured**, which is the half of D5's alarm that lives outside the codebase and is owned here rather than by any Work Item.

Until all four hold, WI-1 cannot meet its own delivery criterion, and opening it would mean building against an unproven assumption.

It is stated as a prerequisite rather than a risk for two reasons: it has the longest lead time in the effort and depends on nobody here, so it can start immediately and in parallel; and the provider's configuration shape is what the transport's settings are derived from, so committing to those settings before it is settled would be guessing.

## 4 · Strategy & sequencing

**Order: 1 → 2 → 3 → 4 → 5 → 6.**

```
1 (SMTP + three-state + timeout + rename + contract + harness)
      │
      ▼
2 (production refuses a non-delivering mode)
      │
      ▼
3 (move to modules/mail-delivery/)
      │
      ▼
4 (cap schema + migration + repository) ─▶ 5 (recipient cap + ceiling, as a decorator)
                                     └────▶ 6 (pruning job)
```

**Why this order, and why parts of it cannot be split.**

- **WI-1 is indivisible.** SMTP is the only thing that can produce `unknown` or time out. Landing the three-state result before it would create a declared variant no code produces — precisely the defect recorded in **#578**, which this effort has no excuse for repeating (**I9**). The rename, the contract and the harness ride with it because Documentation Strategy §10 requires a triggered documentation update in the same pull request as its trigger.
- **1 → 2 is hard, and inverting it breaks production.** If the delivery-capability rule lands before a delivering backend exists, production cannot boot at all.
- **2 → 3 is sequencing, not necessity.** The move is *justified* by owned state, which arrives in WI-4; doing it here means WI-4's migration and repository land in their final home rather than moving immediately after. WI-1 and WI-2's files are moved once, as a pure rename.
- **3 → 4 → 5 is hard.** The controls need a repository; the repository needs the tables; both belong in the module.
- **4 → 6 is hard**, and 6 needs nothing else, so it may land any time after 4.

**Risk is front-loaded deliberately.** The two claims most likely to be wrong — that a real transport fits behind the existing port unchanged, and that the result type can express what SMTP actually returns — are both settled in WI-1, before any schema is committed to. The lowest-risk work (the pruning job) comes last, as it did for Channel Verification's sweep.

## 5 · Execution structure

### WI-1 — SMTP backend, three-state result, timeout, and the wire rename
- **Goal & rationale:** make the mechanism capable of delivering, and make its report honest in the same change. It comes first because everything else is either meaningless without it (WI-2) or independent of it (WI-4 onward).
- **Scope:** an `smtp` backend behind the existing port · a bounded send timeout · the result becomes a three-state discriminated union · `inert` and `capture` updated to the new result · the consumer updated · the wire field renamed to report what is known · `api-contract.md` and `mail.md` co-versioned · folder 10 and the scenarios catalogue updated for the renamed field.

  Two things this Work Item must decide rather than assume. **It adds a generic SMTP client dependency** — the runtime has no SMTP client, and D1's "never a dependency" refers to a *provider SDK*, not a transport library; the dependency is proposed and the audit re-run once it lands. And **whether the transport's credentials are required conditionally on the selected mode**: the environment schema performs no cross-field validation today, so making them conditional would introduce a pattern there.
- **Non-goals:** no cap, no module move, no production rule, no retries or queueing.
- **Dependencies:** the **external prerequisite (§3.3)** — the provider is selected and proven able to deliver **before this Work Item opens**.
- **Boundary validated:** that a real transport fits behind the port **without changing the message shape or the `send` signature** — the claim WI-7A of the prior effort could only assert with a second non-sending backend. The **result type does change**, by ADR 0015 Decision 9; that is the decision being implemented, not a boundary failure.
- **Invariants protected:** **I1**, **I2**, **I4**, **I5**, **I8**, **I9**.
- **Verification:** unit tests over an injected fake transport covering accepted, refused and timed-out sends · the guardrail test passes **unmodified** · a real message reaches a real inbox from a development configuration, reported as executed by hand · no test selects `smtp`.
- **DoD:** the three outcomes are each produced by a real path; **the message shape and the `send` signature are unchanged**; typecheck + unit green; the harness reflects the renamed field.
- **Stop-risks:** if the transport **cannot** fit without changing the **message shape or the `send` signature** → **stop**; that is the wrong-abstraction risk ADR 0015 assumed away, and reshaping the port is an architectural decision, not a detail. A change confined to the **result** is not that risk.

### WI-2 — Production refuses a mode that cannot deliver
- **Goal & rationale:** close the silent-outage class — a misconfigured production that sends nothing and reports success. **It must follow WI-1**, or production could not boot.
- **Scope:** the mode resolver gains a delivery-capability requirement in production, stated positively · its recorded justification is narrowed in the same commit, since it currently argues the opposite · `mail.md` co-versioned.
- **Non-goals:** no change to non-production resolution, which keeps its fail-safe.
- **Dependencies:** **WI-1** (hard).
- **Boundary validated:** that the rule can be expressed as a property of a backend rather than a denylist, so a future non-delivering backend is refused without anyone remembering to add it.
- **Invariants protected:** **I4**.
- **Verification:** unit tests over the resolver at its edges — production with each mode, non-production unchanged; the comment no longer states a rationale the code contradicts. **A resolver test proves the resolver throws, not that the process refuses to start**, so one further test asserts at the **composition point** that building an adapter under production with a non-delivering mode propagates the failure — which is what "refuses to boot" actually means.
- **DoD:** production refuses to boot on a non-delivering mode, **proven at the composition point rather than inferred from the resolver**; development behaviour is unchanged; typecheck + unit green.
- **Stop-risks:** none material.

### WI-3 — Move to `modules/mail-delivery/`
- **Goal & rationale:** delivery is about to own a table, a migration and a repository, and **no module under `shared/` owns a model**. Moving now means WI-4's schema lands in its final home.
- **Scope:** relocation and import updates only · `mail.md`'s scope line updated.
- **Non-goals:** **no behaviour change of any kind.**
- **Dependencies:** **WI-2** (sequencing).
- **Boundary validated:** that `shared/` remains what it is — cross-cutting code that owns no schema.
- **Invariants protected:** **I3**.
- **Verification:** a pure rename — `git diff -M` shows moves and import lines and nothing else; the full suite passes unchanged.
- **DoD:** `shared/mail/` no longer exists; every test passes without modification beyond its import path.
- **Stop-risks:** if the move requires any behaviour change to compile → **stop and reassess**; that would mean the mechanism was coupled to its location.

### WI-4 — Cap schema, migration, and repository
- **Goal & rationale:** the durable state the controls need, independent of any consumer's rows.
- **Scope:** state recording send attempts, keyed to serve both the recipient cap and the global ceiling · its migration, following the house convention and declaring an **additive** safety class · the indexes the rolling-window queries need · a repository behind an interface · `data-model.md` co-versioned. The shape of the state, its keys and its indexes are settled in this Work Item.

  **The recipient key is an explicit decision here, not an implicit one** — specifically whether the address is **normalized** before it becomes a key, and whether it is stored **plaintext or as a digest**. Channel Verification sets a partial precedent and a warning: it stores the endpoint in plaintext and states outright that it *normalizes nothing*. That is safe there, because the account supplies the value from its own row and it is always the same string. It is **not** safe for a cap key: once a second consumer accepts a user-typed address, case or dot variation would produce different keys and defeat a per-recipient cap. Storing recipients for a rolling window is also a retention question this Work Item must answer rather than inherit.
- **Non-goals:** no enforcement yet; nothing published; no job.
- **Dependencies:** **WI-3** (sequencing).
- **Boundary validated:** that the state can be keyed on what a domain-ignorant mechanism sees — a recipient and a timestamp — with **no reference to any consumer** (**I7**).
- **Invariants protected:** **I3**, **I7**.
- **Verification:** the migration applies cleanly to a populated database · `db:generate` + typecheck · unit tests over a fake client for the window queries and the row → domain mapping. **Atomicity is not claimed here**: a fake client cannot prove a database property, and concurrent enforcement is proven by WI-5's integration test against real Postgres.
- **DoD:** schema and migration land; no consumer table is referenced; typecheck + unit green.
- **Stop-risks:** if a rolling window cannot be expressed without per-event rows the pruning job cannot bound → **stop** and re-decide the window shape before building on it.

### WI-5 — The recipient cap and the outbound ceiling
- **Goal & rationale:** the effort's security climax — the controls ADR 0015 moved across an ownership boundary.
- **Scope:** a decorator wrapping **any** backend, so the same path runs under `inert`, `capture` and `smtp` · the per-recipient cap · the global ceiling as a circuit breaker whose trip emits the distinguished log line (**D5**) and reports a **definite refusal** · fail-closed on a storage error (**D7**) · attempts counted, `unknown` consuming quota (**D6**) · **the cap's window settings, constrained by I10** · `mail.md` co-versioned · `security.md` cedes the outbound cap to `mail.md` **by name**, the cession it already makes for Media's read-side posture.

  **A cap refusal is distinguishable from a transport failure in diagnostics only, never on the wire.** Both surface as the same refused outcome the caller already receives, so **no API-contract change belongs to this Work Item** — and telling a caller that a global ceiling is exhausted would leak system-wide operational state to a single account.
- **Non-goals:** no purpose partitioning (deferred until a second consumer earns it) · no per-actor cap (a consumer's).
- **Dependencies:** **WI-4** (hard).
- **Boundary validated:** that a control keyed only on the recipient and on total volume is enforceable without the mechanism learning who any actor is.
- **Invariants protected:** **I1**, **I5**, **I6**, **I7**.
- **Verification:** unit tests with an injected clock and a fake repository — the cap refuses at its limit, the ceiling trips, an `unknown` outcome consumes quota, a storage error refuses rather than sends · an integration test against real Postgres proving **concurrent sends cannot exceed the cap**, which is where atomicity is established · **an implementer harness run confirming folder 10 stays within the recipient cap** (**D8**) — evidence that this Work Item did not break the harness, and **not** the human closing gate of **D11**.
- **DoD:** every backend passes through the cap; the trip is distinguishable from a transport failure **in diagnostics, not on the wire**; the harness has verified headroom; typecheck + unit green, integration green locally.
- **Stop-risks:** if enforcing the cap requires the mechanism to know **why** a message is sent → **stop**; that is the purpose dimension ADR 0015 deferred, and adding it is a boundary decision.

### WI-6 — The cap's pruning job
- **Goal & rationale:** bound the rolling window's rows. Deliberately last and low-risk: like the challenge sweep, no answer depends on it having run.
- **Scope:** a job cloned from the existing sweep, reaching the database through WI-4's repository, registered on the existing scheduler · the retention setting, **which this Work Item owns and which I10 constrains** · `mail.md` co-versioned.
- **Non-goals:** no new scheduler substrate; no second data-access path.
- **Dependencies:** **WI-4** (hard).
- **Boundary validated:** that hygiene and enforcement stay separable — pruning removes only what no window can still count, so the control's correctness never depends on the job having run.
- **Invariants protected:** **I7**, **I10**.
- **Verification:** unit test with a stubbed repository and injected clock; the job is registered at composition; **a test that retention below the longest window is refused rather than silently applied** (**I10**).
- **DoD:** the job runs on the existing scheduler; disabling it changes no answer the cap gives within its window; retention cannot be configured below the longest window; typecheck + unit green.
- **Stop-risks:** if the substrate needs modification to host it → **stop**; it is meant to be generic, and three jobs already prove it.

## 6 · Configuration — the locked set

This section fixes **which Work Item introduces which configuration**, so nothing arrives unplanned. **Identifiers, defaults and values are settled in the Work Item that introduces them**, not here.

| Configuration | Work Item |
|---|---|
| The existing mode setting, extended to select the new backend | WI-1 |
| The transport's target and its credentials | WI-1 |
| The sender identity, held as adapter configuration | WI-1 |
| The send timeout | WI-1 |
| The per-recipient cap — its limit and window | WI-5 |
| The global outbound ceiling — its limit and window | WI-5 |
| The pruning cadence and retention | WI-6 |

The transport's settings are **derived from the provider chosen in §3.3**, so their shape is not assumed here: providers differ in how a target, a port and a credential are expressed, and fixing them before the provider is selected would be guessing.

Two things hold whatever the identifiers turn out to be. **Credentials carry a placeholder in `.env.example`, never a value** — the convention `JWT_SECRET` already follows. And the transport's credential is the project's **first external secret**: `JWT_SECRET` is self-generated, whereas this one is issued by a third party and can be used to send as the project.

## 7 · Risks & mitigations

- **A free tier's own limit can silently become the real ceiling.** If the provider refuses before our ceiling does, *its* refusal is not alarmed by us and the circuit breaker is defeated without anyone noticing. **Mitigation:** the ceiling is set **below** the provider's published limit, so our breaker trips first and visibly. WI-5 settles the value against whatever §3.3 selected.
- **The provider and its domain verification are external and slow.** Owned by the prerequisite in **§3.3**, which gates WI-1 rather than being managed inside it.
- **Real sending from development consumes real reputation and spend.** **Mitigation:** the dedicated subdomain isolates reputation; the ceiling binds every environment, not production alone.
- **A test could email a real person.** **Mitigation:** **I8** — unit tests inject a fake transport, integration runs never select `smtp`, and the harness stays on `capture`.
- **The production rule guards an environment that does not exist.** There is no deploy pipeline; its first real exercise is the first deployment. **Mitigation:** cover it at the resolver's edges in unit tests, which is where the rule actually lives.
- **CI has no database**, so the cap's concurrency behaviour is provable only locally — the posture Channel Verification already accepted. **Mitigation:** unit-cover everything a fake can prove; run integration locally before each PR and say which gate was run.
- **The move is a large rename diff** that could conceal a substantive change. **Mitigation:** WI-3 is behaviour-free and reviewed as a pure rename.
- **The harness changes before its outstanding gate was ever run.** **Mitigation:** **D11** — updated first, run once afterwards, and the old criterion recorded as retired rather than met.

## 8 · Completion criteria

- All six Work Items merged, each green under the real CI gate (typecheck + unit; integration verified locally).
- A real message **reaches a real inbox from a development configuration**, and the fact is reported as executed rather than assumed.
- Production **refuses to boot** on a mode that cannot deliver; development is unchanged.
- A send reports three outcomes, **each with a producer**; the wire reports what is known and asserts no delivery.
- Recipient cap and ceiling enforced **over every backend**, fail-closed, with the ceiling's trip distinguishable in diagnostics and carrying the in-process half of **D5**'s alarm; the provider-side half is the prerequisite's (**§3.3**).
- Retention cannot be set below the longest cap window (**I10**).
- Cap state references no consumer, and is pruned on its own schedule.
- `shared/mail/` no longer exists; no module under `shared/` owns a model.
- `mail.md`, `api-contract.md`, `data-model.md` co-versioned, and `security.md` cedes the cap by name.
- The verification harness passes a full run under the **human Postman gate**, run once after the last Work Item that touches it, with Channel Verification's **WI-8 criterion (#450) recorded as retired rather than met** (**D11**).

## 8.1 · Reconciliation with the Channel Verification plan

The [Channel Verification plan](channel-verification.md) is still **Active**, and its completion criteria name the API contract and a full harness run — both of which this effort changes. Nothing here invalidates that plan; what changes is that the artefacts it points at move on.

Two consequences follow. Its **WI-8 criterion is retired, not met** (**D11**), and that retirement is recorded in **#450** rather than only here. And whichever plan reaches `Historical` second carries the forward links for both, so a reader of either lands on the documents that now own the facts.

## 9 · Reconciliation

*Added as this plan approaches `Historical`: where the durable knowledge landed, which findings were recorded, and the forward links.*
