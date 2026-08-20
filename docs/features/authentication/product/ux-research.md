# Authentication — Competitive UX Research

> **Status:** Active.
> **Class:** Record ([Documentation Strategy §3](../../../architecture/documentation-strategy.md)).
> **Authority:** The record of **what competitive research observed** about auth flows in real products, and the design insights drawn from those observations. It owns **findings**, never applied decisions — what the product does with these insights is owned downstream.
> **Scope:** Ten products examined against the seven auth flows the [product and UX brief](ux-brief.md) ratifies. Sources are listed at the end so any finding can be re-checked.
> **Version:** 1.0
> **Last Updated:** 2026-08-20
> **Owner:** Basel Ghonaim

This document reopens nothing in the [brief](ux-brief.md). It tests those ratified decisions against how real products behave, and records what was found.

---

## Methodology and calibration

Five parallel research passes, each scoped to one flow cluster and a fixed set of ten products — Bluesky, Discord, Twitch, Instagram, X, Tumblr, Pinterest, Dropbox, Mastodon, GitHub. Findings are sourced from help articles, developer documentation, issue trackers and documented incidents rather than from general impression, and **confidence is flagged inline wherever evidence was thin, single-sourced or conflicting.**

Two claims from an earlier, less rigorous pass were **corrected here against primary sources**, which is why the calibration matters:

- Bluesky's entry point is **Create-Account-forward**, not the "sign-in-first" screen initially claimed.
- GitHub's password-reset message is **not** neutral — the neutral behaviour often assumed is an open, unresolved public feature request, not shipped behaviour.

Where a product could not be confirmed to behave as claimed, that is stated rather than smoothed over.

---

## Part 1 · Flow-by-flow observations

### Login

**Observed:** Generic, combined-field error copy ("Login or password is invalid") is the modern default, confirmed on two of four products. Single-screen identifier-plus-password is the dominant login shape. Explicit, time-bound rate-limit messaging outperforms vague throttling. Secondary CTAs sit as low-weight links, never competing with the primary button.

**Anti-pattern:** Field-specific errors ("that username doesn't exist") — a real account-enumeration leak, still present on two products.

**Uncertain:** Whether any product studied splits identifier and password across two screens — evidence conflicted and was not resolved.

### Registration

**Observed:** All four products studied use a **multi-step wizard** for registration even where login stays single-screen — one concern per screen, with inline username-availability validation.

**Insight:** Registration and login are structurally different problems. A product's login simplicity does not imply its signup will be equally simple.

### Profile completion

**Observed:** Two products have **no profile-completion step at all** — avatar and bio deferred entirely to settings, never surfaced during onboarding. Two others present it as its own optional screen with Skip as a plain, low-emphasis control that never competes visually with the primary action. **No progress indicator was evidenced** on any of these short optional sequences.

**Two documented anti-patterns, both worth naming:**

- A Skip that sometimes **re-presented the same screen** via a confirmation dialog. It erodes trust that the escape hatch works at all.
- A "create an avatar instead" option that **looks like a skip alternative but forces a sub-flow.** A soft trap: a genuinely optional field's skip must lead onward, not to a lighter version of the same task.

**No precedent either way** was found for the three-field, single-skip case the brief ratifies — no product studied offers a clean analog. This was correctly a human decision rather than something research could settle.

### Email verification and OTP entry

**Observed:** **No product confirmed a genuine same-flow OTP-plus-link hybrid.** The brief's `D3` combination is a novel pairing of two separately well-modelled halves, not something to copy wholesale. On OTP mechanics, evidence points to a **single logical input field** rather than confirmed segmented boxes — a real, unresolved industry tradeoff, though documented best practice favours the single field because it does not fight the user's instinct to paste a code from the very email they are reading.

**Anti-pattern:** A segmented per-digit input **without explicit paste handling** — it silently breaks the interaction the context invites.

**Standards-based mechanics, zero cost:** `autocomplete="one-time-code"` surfaces an incoming code above the keyboard; `inputmode="numeric"` triggers the numeric keypad; `type="text"` rather than `type="number"`, which strips leading zeros and adds spurious controls.

**Best practice for resend and error:** a visible countdown, never a hidden control while cooling down; progressive backoff on repeated resends rather than an immediate hard lock; an invalid or expired code as an **inline, field-level error with surrounding state preserved** — never a full reset.

### Soft verification banner and restricted actions

**Observed:** Banner placement matters — it lives where the user actually returns (the main feed on one product, the account area with a mobile variant on another), not where it will not be seen. It is **not session-dismissible**: it tracks account state rather than user preference. A blocked action is communicated two ways across the set — a standing banner explaining several gated actions at once, or a **just-in-time inline prompt at the moment of the specific attempt.** The second is notable because it teaches the reason exactly when it is relevant, rather than relying on a banner the user has tuned out. Verified status is confirmed **global and portable**: verify once, unlocked everywhere, never re-prompted per surface.

**Anti-pattern, with a measured cost:** the one hard-gate product ties *all* access to a single third-party-dependent step — an inactive token and 403s until the email link is clicked. Documented cases exist of users locked out entirely by nothing more than delayed or spam-filtered email, with no in-app recovery path. This is the concrete argument behind `D2`'s soft gate, not an abstract preference.

### Forgot password

**Observed:** The product most plausibly assumed to have solved anti-enumeration **leaks account existence today** — a different message for a registered versus unregistered email — with the neutral behaviour tracked in its own open, unresolved public feature request. A cautionary case, not a template.

A documented incident on another product — **unmasked identifiers echoed back on a recovery screen**, affecting millions of accounts — is the sharpest lesson: never echo a real identifier unless it is masked at the source, not merely truncated client-side. A confirmed bug on a third shows a prior screen's error state **leaking into** the forgot-password screen; screens must reset their own transient state on entry.

**Insight:** the only reliable way to guarantee a neutral message never diverges is **structural, not disciplinary** — both branches routed through one shared response path with identical copy, timing and side effects, leaving no `if (exists)` branch free to drift. The observed failure is exactly a branch allowed to diverge.

### Reset password

**Observed:** Link-based reset landing directly on a single new-password form is confirmed on two products — matching `D5`'s shape. Two others use a code rather than a link, useful as contrast only, since `D3` is explicit that OTP is not the reset path.

**The strongest confirmed match to `D5` anywhere in this research:** one product's own documentation states that resetting the password logs the user out of **every** active session — full re-authentication, no exceptions.

**An industry blind spot:** no product in the set publishes its expired-link dead-end copy. The safe shape is to state plainly that the link is no longer valid, offer one action to request a new one, and **never differentiate** "expired" from "already used" from "not found" — differentiating would itself leak state.

---

## Part 2 · Design insights

What the observations imply. **These are insights, not decisions** — the applied direction they inform is owned elsewhere and is not restated here.

- **One primary anchor per screen.** Every product studied treats the primary submit action as the single visual anchor, with secondary paths deliberately quieter. The pattern was uniform enough to be treated as settled.
- **Registration decomposes; login does not.** The two are structurally different problems and should not inherit each other's shape.
- **"No step at all" is a legitimate answer for optional fields.** Two products omit profile completion from onboarding entirely. Where a step does exist, Skip is a low-emphasis control that is nonetheless unmissable.
- **A trustworthy escape hatch is one tap.** Both profile-completion anti-patterns fail for the same reason: they look optional but are not.
- **Verification status must be portable**, and a just-in-time prompt at the point of a restricted action teaches the reason better than a banner alone.
- **Neutrality must be built structurally**, since the observed failure is a diverging branch rather than careless copy.
- **Fixed-bottom CTAs are a documented mobile failure case**, hidden by the on-screen keyboard unless handled with the mechanisms browsers already provide.
- **Auth accessibility is mostly a component-layer concern** — correct autocomplete pairings, a named visibility toggle, a hit-target floor, live-region announcement of status messages, focus moved to the first error on failure.

---

## Sources

GitHub Community Discussion #154955 · GitHub `password_reset` documentation · Dropbox password-reset help and accessibility statement · Bluesky Zendesk password-reset article · `bluesky-social/social-app` issues #6169, #2688, #5328 · X (`help.x.com`) password-reset documentation · Discord password-reset and email-verification support articles · Pinterest Help Center ("Manage your email address") · Tumblr Help Center ("Email Verification") · Twitch blog ("Securing your Chat with Phone and Email Verification") · Mastodon developer documentation (`accounts` API methods) · `mastodon/mastodon` issues #20125, #36795 · web.dev ("SMS OTP form best practices") · Twilio ("Best Practices for OTP Input Forms in HTML") · MDN (`autocomplete` attribute; One-Time Passwords) · Chrome for Developers (WebOTP API) · W3C ARIA19 and ARIA21 techniques · WCAG 2.2 SC 2.5.8 (Target Size) · WCAG 4.1.2 (Name, Role, Value) · Cyberpress and BankInfoSecurity reporting on the password-reset identifier-leak incident.

---

> **This document owns observations and the insights drawn from them.** It ratifies nothing and applies nothing: the decisions it informs are owned downstream, so one finding never has two conclusions attached to it.
