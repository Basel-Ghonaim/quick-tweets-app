# Authentication — Product & UX Brief

> **Status:** Active.
> **Class:** Contract ([Documentation Strategy §3](../../../architecture/documentation-strategy.md)).
> **Authority:** The authoritative source for the **ratified product and UX decisions** governing the authentication experience — which flows exist, what states each must support, and the post-registration journey. It owns **decisions**, never their visual expression and never their component mapping.
> **Scope:** The auth experience as a product: Login, Registration, Profile Completion, Email Verification, Forgot Password, Reset Password, and the unverified in-app state. Feature behaviour as currently implemented is the [authentication feature document](../authentication.md)'s; the wire contract is the [API contract](../../../api/api-contract.md)'s.
> **Version:** 1.2
> **Last Updated:** 2026-08-25
> **Owner:** Basel Ghonaim

`D1`–`D5`, `D9`, and the post-registration journey (Phases 1–3) are **settled product direction and are not reopened downstream.** `D6` and `D7` are **deferred**, and no later phase may foreclose them. `D8` was deferred *to* visual design and has since been decided there.

These decisions were subsequently tested against how real products behave; what that examination found is recorded in the [competitive UX research](ux-research.md), which reopens nothing here.

---

## 1 · Ground truth — three tiers, binding on every later phase

| Tier | Contents |
|---|---|
| **Live now (backend live, UI buildable today)** | Register (username · email · password) · login by neutral identifier (username or email) · logout · logout-all · silent refresh · `/users/me` · rate limiting · generic `401` · editable username · **`PATCH /users/me` for name, bio and avatar** · **authenticated media upload (`POST /media`)** |
| **Built in the backend, not wired to the product** | Channel Verification: issue/confirm, single-use time-limited codes, replay refusal — email is its first channel. Mail delivery is a port that exists but is `inert`: **nothing is actually sent yet** |
| **Future, required by direction** | Email Verification as a product flow · **Forgot/Reset Password** (needs a reset credential and an endpoint that do not exist yet; the only fixed constraints are expiry and single use) · the authenticated shell to land on |

> **Core note:** Profile Completion (Phase 2) is the **only stage of the entire auth experience buildable today with zero new backend work** — the endpoint is live and every component it needs already exists.

> The current `/auth` page is a **prototype and migration surface**, not a design reference ([frontend architecture](../../../frontend/architecture.md) identifies it as such). With `D1` and `D4`, its OAuth buttons and tab pattern are formally retired by direction.

---

## 2 · Ratified direction

**`D1` — No OAuth in v1.** No entry points, no "continue with…" affordances, no layout reservations for them.

**`D2` — Soft verification gate.** The user enters the app immediately on registration. Unverified users carry a persistent in-app reminder, and selected actions are restricted until verified.

**`D3` — Hybrid delivery, in both flows.**
- **Email Verification:** an in-app one-time code (OTP) is the primary path; the same email also carries a **shortcut deep link**. Both paths end in **the same verification state** — the design must show them converging.
- **Reset Password:** **two independent paths, either of which completes the reset.** A **secure emailed link** carries a single-use, time-limited credential and lands directly on the new-password screen; an **in-app one-time code** reaches the same screen. Neither is a fallback for the other, and both end in the same state.

**`D4` — Login is the primary screen.** No tabs. Registration is reached via a clear "Create new account" CTA below the login form, and registration links back to login symmetrically.

**`D5` — Reset ends at login.** No auto-login, consistent with invalidating all sessions.

**`D6` · `D7` — deferred.** Session-expiry re-entry and remember-me are out of scope for this phase; no layout may assume an answer to either.

**`D8` — delegated to visual design, and decided there.** This brief still takes no position of its own on the brand surface: the [design direction](ux-direction.md) owns it and has ratified a **typographic brand panel**, additive beside the form column and absent on mobile. The screen inventory below remains **content requirements, not layout.**

**`D9` — The feed is readable without an account.** Login offers a third way on, beside signing in and registering: browsing as a guest. Reading is all a guest may do — posting, liking, following and uploading each require an account — so a write action met as a guest is a prompt to sign up, never a silent failure.

---

## 3 · Post-registration journey — ratified

Three sequential phases: **one mandatory, two optional.** Phase 1's success never depends on what follows it.

### Phase 1 — Registration — **mandatory**

The only step required to create an account. Successful registration **does not depend** on completing the profile or on email verification. The account is fully valid the moment it is created.

> This is not a new design choice — it is the existing architectural model ([ADR 0008](../../../architecture/decisions/0008-auth-first-onboarding-grant-retirement.md)): `POST /auth/register` creates the account and session **and nothing else**, and the steps that follow are **independent operations, never one transaction.**

### Phase 2 — Profile completion — **optional, one screen**

Three fields on a single combined screen, with one explicit skip action:

| Field | Live backend constraint |
|---|---|
| Bio | up to 160 characters |
| Name | up to 50 characters · optional · clearable |
| Avatar | authenticated upload, then attach by reference · a narrower type policy than the general media policy |

- **A clear "Skip" action, and its presence is mandatory.**
- **Skipping never blocks continuing**, and never leaves the account in an incomplete state.
- Skipping is, in practice, simply not calling the update endpoint; there is no intermediate state and no "draft profile."

> **Profile completion is formally in scope for the auth experience** because it is an integral part of the post-registration journey — even though it is not an authentication mechanism itself.

### Phase 3 — Email verification — **optional at first**

- A **"Later / skip for now"** action must be provided.
- The user enters the authenticated app **without** completing verification.
- **The soft verification gate (`D2`) stays in effect** for unverified users: persistent reminder, selected restricted actions.
- The primary path is in-app OTP entry; the deep link is an alternate path reaching the same state (`D3`).

**Cross-phase rule:** no later phase invalidates an earlier one. Leaving the browser at any point after Phase 1 leaves a valid account and a logged-in user.

**Journey progress is communicated** across the three phases, with Phase 1 shown as complete and Phases 2 and 3 marked optional. How that is presented visually is a design-phase decision.

---

## 4 · Screens and states — required inventory

| Flow | Screens | States that must exist |
|---|---|---|
| **Login (primary)** | 1 | idle · submitting · **generic credential error** (never field-specific) · rate-limited · → app. CTAs: "Create new account", "Forgot password?", **"Browse without an account"** |
| **Phase 1 · Registration** | 1 | idle · inline validation (lowercase-only username **rejected, not normalized** · email format · password + confirm) · `409` duplicate (field-specific is safe here) · rate-limited · submitting · success → Phase 2 |
| **Phase 2 · Profile completion** | 1 | idle · per-field inline validation (50- and 160-character limits) · **avatar upload: idle → in progress → success → retryable failure** · image type/size rejection with an explicit message · saving · success → Phase 3 · **"Skip" → Phase 3 directly** |
| **Phase 3 · Email verification** | prompt + outcome | OTP entry · resend with an **announced** cooldown · invalid/expired code · resend exhausted · verified ✓ · **"Later" → app** · deep-link path: success landing and expired-link landing |
| **Unverified in-app state** | banner + restricted moment | persistent reminder · restricted-action response · both dissolve together on verification |
| **Forgot password** | 1 | email entry · submitting · **one neutral confirmation** regardless of account existence — visually and programmatically identical |
| **Reset password** (via link or code) | 2 + dead end | code entry (for the code path) · new password + confirm (registration's own strength rules) · submitting · **dead end for an expired/invalid link or code** with "request a new one" · success → Login with confirmation (`D5`) |

---

## 5 · Relationship to the Design System

The auth experience is **built from the Design System's existing vocabulary** — its tokens, its components, its focus and accessibility invariants. It introduces no presentation language of its own.

**Which components serve which screen is a design decision, not a product one**, and this document deliberately does not make it. The Design System's own contracts own the language ([Foundation](../../../frontend/design-system/foundation.md)) and what admits a component into it ([authoring contract](../../../frontend/design-system/components.md)).

**Explicitly excluded from any later phase:** the prototype's colour gradient, its panel treatment, and its raw font bindings — consumer-owned values, never design-system vocabulary.

---

## 6 · Responsive and accessibility requirements

**Responsive:** a single column led by the form on mobile. Phase 2 is the longest screen in the journey — its save and skip actions must stay reachable with the on-screen keyboard open. Mobile avatar upload goes through the camera or gallery and needs a visible progress state. Deep links (`D3`) must survive the mobile mail-client → browser handoff. Touch targets are already guaranteed by the control layer.

**Accessibility:** mostly inherited — the field anatomy wires label, error and help text together, errors are announced via `role="alert"`, focus uses the owned ring, and contrast is token-guaranteed in both themes. These flows add five obligations:

1. Focus moves to the first error on a failed submit.
2. The resend cooldown is **announced**, not only displayed.
3. The neutral forgot-password confirmation reads **identically** to a screen reader in both cases.
4. Verification success is announced before any redirect.
5. Avatar-upload progress and its outcome are announced (Phase 2).

---

## 7 · The journey, end to end

<pre>
                          ┌──────────────────────────┐
     guest ──────────────▶│      LOGIN  (primary)    │◀─────────────────────────┐
                          └────┬─────────────┬───────┘                          │
                       success │             │ "Create new account"             │
                               │             ▼                                  │
                               │   ╔═══════════════════════════╗                │
                               │   ║ PHASE 1 · REGISTRATION    ║   REQUIRED     │
                               │   ║ account is valid here     ║                │
                               │   ╚═══════════╤═══════════════╝                │
                               │               │ success                        │
                               │               ▼                                │
                               │   ┌───────────────────────────┐                │
                               │   │ PHASE 2 · PROFILE         │   OPTIONAL     │
                               │   │ Bio · Name · Avatar       │                │
                               │   └───────┬───────────┬───────┘                │
                               │      save │           │ SKIP                   │
                               │           ▼           ▼                        │
                               │   ┌───────────────────────────┐                │
                               │   │ PHASE 3 · EMAIL VERIFY    │   OPTIONAL     │
                               │   │ OTP  ◀── or ──▶  email    │                │
                               │   │                   link    │                │
                               │   └──┬────────────────┬───────┘                │
                               │      │ verified       │ LATER                  │
                               ▼      ▼                ▼                        │
                    ┌────────────────────────────────────────────┐              │
                    │            AUTHENTICATED APP               │              │
                    │  unverified? → persistent banner +         │              │
                    │  selected actions restricted   (D2)        │              │
                    │       └─▶ in-app verification entry ───────┼──▶ PHASE 3   │
                    └────────────────────────────────────────────┘              │
                                                                                │
   "Forgot password?" ──▶ FORGOT (email) ──▶ neutral confirmation (always same)  │
                                        │                                       │
                                        ▼  emailed link ◀── or ──▶ in-app code  │
                              RESET (new password) ──success──▶ LOGIN (D5) ─────┘
                                        │
                                        └─ expired / invalid ─▶ dead end → request new
</pre>

**Reading the map:** Phase 1 alone is mandatory. Phases 2 and 3 each have an explicit exit (`Skip` / "Later") leading to the next state with no penalty. Entry to the app is possible from Phase 2, from Phase 3, or directly. Verification remains available in-app via the banner indefinitely.

---

## 8 · Open at the product level

These are genuinely unresolved and belong to the product, not to visual design:

1. **Banner semantics** — dismissible per session versus truly persistent, and whether it escalates over time.
2. **Deep-link landing** — silent auto-confirm in-app, or a visible confirmation moment before continuing.
3. **Error-recovery voice** — one tone across the generic `401`, rate limits, and expired codes and links.
4. **Returning to Phase 2 later** — offered as an in-app prompt (mirroring the verification banner), or left to account settings alone.

**Deferred by decision — not open:** the restricted-action list (**not settled before the authenticated shell exists**) · session-expiry re-entry (`D6`) · remember-me (`D7`). **`D8` is no longer among them** — the brand surface is decided by the [design direction](ux-direction.md), which owns its shape and its constraints.

---

> **This document owns ratified product and UX decisions.** It contains no visual design, no layout decision, and no component mapping — each belongs to the design phase and is owned there.
