# Authentication — UX Design Direction

> **Status:** Active.
> **Class:** Contract ([Documentation Strategy §3](../../../architecture/documentation-strategy.md)).
> **Authority:** The authoritative source for **how the authentication experience should look and behave** — its visual personality, hierarchy, layout, form and CTA structure, state patterns, and the constraints any design exploration must respect. It owns **applied design decisions and component mapping**; the product decisions it applies are the [brief](ux-brief.md)'s, and the observations it draws on are the [research](ux-research.md)'s.
> **Scope:** The seven auth flows the brief ratifies. It contains **no screen designs** — it constrains an exploration rather than performing one.
> **Version:** 1.8
> **Last Updated:** 2026-09-02
> **Owner:** Basel Ghonaim

**Derives from:** the [product and UX brief](ux-brief.md) (ratified decisions) and the [competitive UX research](ux-research.md) (observations and insights). It reopens neither.

**What this document may not do:** reopen `D1`–`D5` or the three-phase journey · decide `D6`–`D7` (deferred: session-expiry re-entry, remember-me) · state a pixel value the Design System does not already define.

**What it may now do, and could not before:** name a token or a component the design requires and the vocabulary does not yet carry. That is a proposal into the [Foundation](../../../frontend/design-system/foundation.md) and the [authoring contract](../../../frontend/design-system/components.md), never a value invented at a call site — the prohibition on hardcoded literals is untouched.

**`D8` is the one it now decides.** The [brief](ux-brief.md) deferred the brand surface *to* visual design rather than away from it; §3 ratifies a **continuous brand ground** carrying the page at every viewport, and no later exploration reopens its shape.

---

## 1 · Visual personality

The Foundation already fixes most of it: Montserrat for body text, Inter for headings and display, a violet-anchored role palette, modest radii, hairline-to-2px borders, and a fast interactive curve. That is a **calm, restrained, utilitarian-modern** register — not playful, not brutalist, not luxury.

The direction adds one throughline, and it comes from the ratified decisions rather than from taste:

> **The visual language must express the soft gate.**

The whole journey is built on optionality — the account is valid immediately, Profile is skippable, Verification can wait indefinitely. A design that *looks* urgent or gated contradicts `D2` no matter what the copy says. Concretely: the verification banner is **informational, never alarming.** Reserve the error role for actual errors.

**Three words to test any exploration against:** *unhurried, legible, unceremonious.*

---

## 2 · Information hierarchy

**One primary anchor per screen** — the best-corroborated finding in the research, observed without exception.

| Level | Role | Use in auth |
|---|---|---|
| Brand moment | `display-large` / `display-medium` | The brand zone's single line of copy (§3) — the one surface in auth built around one piece of text |
| Screen title | `heading-large`, `heading-medium` or `heading-small` | "Log in", "Create your account", "Verify your email" |
| Supporting copy | `body-medium`, `body-small` | Explanatory text, the neutral confirmation |
| Field labels, buttons, stepper | `label-medium`, `label-small` | Inside components; the stepper is auth-composed |

**Do not use `display-*` for a form title.** The Foundation defines display as *"the one piece of text a surface is built around"* — a login screen is built around its form. Using display for a screen title inflates the hierarchy and leaves nothing above it. The brand zone (§3) is the surface that genuinely has such a piece of text, and it is the only place display belongs.

Descending emphasis: title (`--text-primary`) → supporting copy (`--text-secondary`) → quietest (`--text-muted`).

---

## 3 · Layout principles

- **The form column is the invariant, and it is the deliverable.** Every auth screen is a single, width-constrained column, designed to be **complete and correct standing alone** — not a half-layout awaiting a second half. The brand zone `D8` introduces sits *behind and beside* this column and never restructures it: every rule in §4–§10 holds with the zone present or absent.
- **One concern per screen.** Login is a single dense screen (`D4`). Registration, Profile and Verify are separate steps; do not merge them to save a screen.
- **Vertical rhythm is composed from the spacing scale.** Layout spacing belongs to the consumer, not the Design System — auth composes its own from `--space-*` directly, which the Foundation explicitly permits.
- **No layout reservations for OAuth.** `D1` removed it; leave no gap, divider or "or" separator where it used to sit.

### The brand panel — `D8`, decided

**A continuous brand ground carries the page at every viewport, and the form column sits on it.** `D8` originally ratified a panel *beside* the column, additive and therefore independently reversible. That shape is replaced: the ground is full-bleed, it exists at every viewport rather than on desktop alone, and both themes resolve it.

**What the amendment gives up, said rather than left to lapse.** The original decision's safety argument was **reversibility** — removing the zone left exactly the screen the rest of this section describes. A ground the page sits *on* cannot be removed that way, so that argument no longer holds and `D8` is no longer independently reversible. This is a different archetype replacing a ratified one, decided once on evidence: it answers the archetype's own documented anti-pattern by resolving both themes, where the research records the pattern as usually dark-only. It is not a precedent, and the illustration that argued for it is not an authority.

- **The zone never restructures the form column.** Every rule in §4–§10 applies identically with the ground present or absent — it sits *behind* the column and never inside it, and no rule below is qualified by it.
- **The zone carries the product's pitch.** A headline, one supporting line, and a small number of sample posts showing what the product is for. It says what the reader is signing in to, which a wordmark alone cannot.
- **The zone is inert.** **No field, no button, no link, no interactive element of any kind.** This is not restraint for its own sake; reading and focus order depend on it.
- **Typography and colour only.** No photography and no illustration — ruled out on **availability, not taste**: the product owns no image assets and no illustration library. Sample posts are composed from type and colour like everything else, so they depend on nothing that does not exist.
- **The zone's ground is feature-local, not vocabulary.** A page's brand treatment is not design language, because nothing else must agree with it ([Foundation](../../../frontend/design-system/foundation.md), the local / shared boundary). **This decision therefore introduces no token and no component.**
- **The form keeps its own neutral surface.** The brand ground never becomes the background of a control, so §7's colour rules — the on-surface / fill rule included — hold unchanged and unqualified.
- **Both themes resolve the zone** (§17.5). A brand ground that only works in dark is not portable and is not this decision.

**Reading and focus order reach the form first, at every viewport.** This is the documented failure mode of the pattern, recorded in the [research](ux-research.md): the panel folds above the form and takes the focus order with it. An inert zone is most of the guarantee — a region containing nothing focusable cannot misplace focus — and how the order is achieved is composition's to decide.

**On mobile the form leads.** The ground remains, because it is what the page stands on; what else of the zone survives the narrow viewport, and where, is composition's to decide. What does not change is that the form is the first thing reached.

---

## 4 · Form density and structure

- **Comfortable, not compact.** Auth is a first impression and a low-frequency task. Use the `medium` control size as the default; `small` is for dense surfaces this product does not yet have.
- **Login is one screen with both fields visible** — the dominant researched pattern and already `D4`'s shape. One identifier field (username *or* email) plus password.
- **Registration decomposes.** Every product studied uses a multi-step wizard for signup even where login stays single-screen. Phase 1 may present as one screen or a short sequence, bounded by "one concern per screen".
- **Phase 2 is one screen, three fields, one Skip** — ratified.
- **Field internals belong to the component.** Label, helper text, error placement and their wiring are the field anatomy's. Design the composition around a field, never inside it.
- **`fullWidth` is the auth default** for Input, Textarea, FileInput and the primary Button. Controls floating at intrinsic width inside a form column read as unfinished.

---

## 5 · CTA hierarchy and placement

| Screen | Primary (filled) | Secondary (text weight) |
|---|---|---|
| Login | "Log in" | "Forgot password?" · "Create new account" · "Browse without an account" |
| Registration | "Create account" | "Back to login" · "Browse without an account" |
| Phase 2 · Profile | "Save" / "Continue" | **"Skip"** |
| Phase 3 · Verify | "Verify" | **"Later"** · "Resend" (visible cooldown) |
| Forgot password | "Send code" | "Back to login" |
| Reset password | "Reset password" | — |

- **One filled button per screen.** Everything else is `Button variant="ghost" size="small"`. **Cross-screen navigation is the exception and binds `Link`**, which carries the anchor semantics a button cannot (§15).
- **A CTA names what its own action does, not where the reader is in a sequence.** Registration's button reads "Create account" because the account exists the moment it succeeds — the journey continues afterwards, and every step of it is optional, so a label borrowed from the sequence would understate what the reader just did.
- **Leaving without an account is offered wherever an account is being asked for**, which is registration as well as login (`D9`). A reader who arrives at the form and decides against one should not have to go back a screen to read.
- **Skip and Later must be unmissable but never visually co-equal with the primary action.** The research identified this as the most important CTA question: the target is *obviously available, not obviously recommended*.
- **Skip is one tap.** No confirmation, no disguised sub-flow. Real products fail exactly here, and it destroys trust in the escape hatch.
- **Resend is never hidden while cooling down** — visible, disabled, with its countdown legible.

---

## 6 · Typography

Bind **composite text styles only** — `--type-<role>-<step>`. Never assemble a style from a size plus a weight; text styles are composite precisely so a call site cannot pick them apart.

```
--type-display-large   --type-display-medium
--type-heading-large   --type-heading-medium   --type-heading-small
--type-body-large      --type-body-medium      --type-body-small
--type-label-large     --type-label-medium     --type-label-small
```

Heading and display carry Inter; label and body carry Montserrat. A screen title in Inter over Montserrat body is the intended texture, not an accident to correct.

In practice: screen titles `heading-large`/`heading-medium`/`heading-small`; explanatory and confirmation copy `body-medium`/`body-small`; stepper labels `label-small`. A title variant **requires** an explicit element — appearance and document outline are chosen separately.

---

## 7 · Colour and surface

**Surfaces:** `--surface-page` is the ground; `--surface-default` the form's own surface where a container is used; `--surface-subtle` a quiet inset; `--surface-hover` / `--surface-active` are interaction states components already bind.

**Text — three tiers, deliberately:** `--text-primary` (titles, entered values) · `--text-secondary` (supporting copy) · `--text-muted` (hints, inactive stepper steps) · `--text-accent` for an emphasised inline reference.

**`--text-tertiary` is not used in auth.** It resolves to the same value as `--text-muted` in both themes today, so a design built on the distinction would render as one tier and read as a bug later. Three tiers is the right depth for six short screens regardless.

**Roles:** the primary CTA binds `primary`. Reserve `error` for genuine failure, `success` for genuine completion, `info` for the verification reminder. **Do not colour the verification banner with `warning` or `error`** — that contradicts §1 and `D2`.

### The one hard colour rule

**Error *text* binds `--role-on-surface-error`. Error *fill or border* binds `--role-fill-error`.** Two different tokens answering to two different contrast criteria, and **not** interchangeable.

This is not pedantry — it is a defect this project shipped and caught. In the **light** theme `--role-on-surface-*` and `--role-fill-*` resolve to the *same* palette entry for `success`, `warning`, `error` and `info`, so a design using the fill token as text looks correct in light and drops **below the 3:1 non-text contrast floor in dark** for most roles. A light-only review cannot catch it.

**Every colour decision must be reviewed in both themes. No exceptions.**

### Elevation — restrained, and unbacked

Shadows exist only as primitives, declared once rather than per theme, so a shadow tuned for the light ground is wrong on the dark one. **No semantic elevation tier is earned**, and the primitive family says so at its own declaration: no consumer has established an elevation role, so an `--elevation-*` intent would be invention.

**Surface and border are therefore the means of separation**, not a preference among several: `--surface-default` on `--surface-page`, divided by a `--border-width-thin` hairline in `--border-default`. §1's *unceremonious* register agrees — a login form is not a floating object, and nothing in auth is dramatic.

Where a container would genuinely need lifting off its ground, that is a **stop into a proposed tier** (§17.1) — never a raw shadow primitive bound at a call site, and never a per-theme shadow invented by the consumer. Nothing in auth needs one today.

---

## 8 · Borders, radii, spacing, rhythm

- **Radii:** `--border-radius-sm | md | lg | xl | full`. A container composed by auth picks from this scale — `lg` or `xl` reads correctly against the components' `md`. Never a raw value.
- **Borders:** `--border-width-thin` is the default hairline; `--border-default` and `--border-strong` are the colours.
- **Spacing:** `--space-1 … --space-24`. Suggested rhythm — tight groupings from `--space-2`/`--space-3`, field-to-field from `--space-4`, section-to-section from `--space-6`/`--space-8`. The constraint is *from the scale, and consistently*.
- **Field-internal spacing is not yours** — `--field-gap` is bound inside the anatomy.
- **Motion — auth owns none.** Components carry their own: `Button` its hover and press feedback, `Spinner` its rotation. **Auth adds no entrance animation, no banner transition, no stepper animation.** This is §1's personality taken literally, and it has a second benefit — there is no reduced-motion resolution in the token layer today ([Finding 0013](../../../architecture/findings/0013-motion-claims-an-unbuilt-reduced-motion-resolution.md)), so a flow owning no motion has no reduced-motion obligation to get wrong. Motion is an escalation, not a detail.

---

## 9 · Error, validation, loading and success

| Pattern | What exists | Direction |
|---|---|---|
| **Field-level error** | Field anatomy renders it with `role="alert"`, already associated | Use it. No parallel field-error treatment. |
| **Form-level message** | No `Alert` component | **Auth composes its own message region** — below. Not a new component. |
| **Loading** | `Button` `isLoading` + `loadingText`; `Spinner` | Submit disables and shows the busy state in place. Never a full-screen overlay for a form submit. |
| **Success** | — | **No toast needed** — below. |
| **Disabled** | `--control-opacity-disabled`, bound by components | Do not restyle. |
| **Validation timing** | — | Validate on submit; inline-on-blur only for a hard format rule. Never validate an untouched field. |

### The form-level message region — composed, not invented

Every flow needs somewhere to speak about the form as a whole: a failed login, a rate limit, the neutral forgot-password confirmation, an expired link, a reset success. `Alert` is committed but unbuilt, and **auth does not need to wait for it.**

**Auth composes the region from vocabulary that already exists:** `Typography` for the text, `--role-on-surface-<role>` text on the card's own surface for the treatment, `--border-radius-md` and a hairline border in that role for the shape, `--space-*` for padding, and `role="alert"` on the container so it is announced rather than merely rendered.

**It carries no fill, and the reason is measured.** An earlier revision paired the role text with the role's `-subtle` fill. Every `-subtle` fill is a tenth-alpha overlay, so what the pair actually resolves to depends on what sits behind it, and `tokenContrast` never measures a composited fill as a background: composited, `error` reaches **3.98:1 on the page and 4.13:1 on the card** in light, against a 4.5 floor. On the card's own surface the same text is a pair the check already guarantees, and separation by surface and border is what §7 asks for elsewhere.

This is **feature-local composition**, which the Foundation explicitly permits — a page's composition belongs to the page until a shared concept is established. `Alert` is committed rather than speculative, so this region is **an interim standing in for it** — not the evidence that would justify it. What the region settles is the *shape* `Alert` should take, proven against six real screens before a line of it is written; auth's messages bind `Alert` once it exists.

One region, one position — directly above the form's first field on every screen that has one — so an interruption always appears in the same place.

### Success needs no toast

Examined flow by flow, **every confirmation lands on a screen that can carry it**: profile saved → the next step is the confirmation; verified → the banner and restrictions dissolving *is* the confirmation; reset succeeded → `D5` routes to Login, which carries the message in its own region.

There is no auth moment where something completes and the user stays put with nothing to show for it — the only situation a toast solves. **Toast is not a dependency of this design.**

---

## 10 · Flow navigation

- **Login is the front door** (`D4`). No tabs, no switcher.
- **Forward motion is always one primary action.** Back-navigation is a text link, never prominent.
- **The journey stepper — `1 Account → 2 Profile → 3 Verify` — is required.** The stepper reports progress and never navigates. The step you are on reads as *in progress*; a finished step reads as *done*. Steps 2 and 3 **must be labelled optional in text, not by visual weight alone** — the same principle §12 applies everywhere else. The current step is the single emphasised element. A skipped step renders as *skipped*, never as complete. Whether the stepper reappears when a user returns to Phase 2 later is the brief's open question, untouched here.
- **Screens own their state.** A prior screen's error must never bleed into the next — the research found a real product shipping exactly this bug.
- **Never echo an unmasked identifier** on a recovery screen. If an email is shown back, it is masked at the source.

---

## 11 · Desktop and mobile

- **Mobile is the constraint case; design it first.** The form column is the same on both; desktop adds breathing room, not structure.
- **The CTA must stay reachable with the on-screen keyboard open** — the documented mobile failure case for auth forms. Avoid `100vh` with a fixed-bottom CTA; verify on a real device, not a resized desktop browser.
- **The code field must accept a pasted code** — pasting is the primary path, since the code sits in the email the user is reading. **The code is alphanumeric, so the field must not request a numeric keyboard.** It forgives case, spacing and look-alike characters on the user's behalf rather than rejecting them.
- **Avatar upload on mobile** goes through the camera or gallery and needs a visible progress state; its lifecycle (idle → uploading → success → retryable failure) is the one genuinely new state machine in the journey.

---

## 12 · Accessibility invariants

Already guaranteed by the layer. **The job is not to add them — it is to not break them.**

- **Never design a custom focus treatment.** Components compose the owned focus ring and never declare their own; an exploration inventing a focus style breaks a system invariant.
- **The minimum hit target is `--control-target-min`**, already floored by the controls. Design nothing smaller — including any interactive part of the stepper.
- **Contrast is token-guaranteed in both themes** for the pairs `tokenContrast` actually asserts — a role's text against a surface, and on-fill text against its fill — *provided* §7's on-surface/fill rule is respected. **A translucent fill is outside that guarantee**: the check measures token against token and cannot see a composite, so a design that stacks a `-subtle` fill on a surface owes its own measurement (§9).
- **Never signal state by colour alone** — why the stepper's optional steps carry a text label, and why an error needs more than a red border.
- **Status messages must be announced**, not merely rendered: the neutral confirmation, the expired-link message and any form-level error need a live region. Field-level errors already have `role="alert"` for free.
- **Focus moves to the first error on failed submit.**
- **Icon-only controls need an accessible name.** `IconButton` enforces this at the type level; any new icon-only affordance inherits the obligation.
- **The brand zone carries no focusable element** (§3). That is what makes reading and focus order reach the form first at every viewport without anything to maintain — the invariant is structural, not a checklist item.

---

## 13 · Making six flows feel like one product

1. **One column, one anchor, one primary action** — identical across all six.
2. **One typographic ladder** — the same roles in the same positions on every screen.
3. **One CTA grammar** — filled primary forward, text weight everything else, always in the same relative place.
4. **One voice for interruption** — errors, neutral confirmations, expired links and the verification banner share a single treatment vocabulary, so an interruption always looks like the same kind of event.

**The coherence test:** screenshot any two auth screens side by side with the copy removed. They should be recognisably the same product and the same moment in it.

---

## 14 · Which decisions belong where

| Owned by the **Design System** — consumed, never redefined | Owned by **auth** — explored here |
|---|---|
| All colour, type, spacing, radius, border, motion and opacity values | Page composition and layout of the form column |
| Control geometry, density, hit target | Vertical rhythm between fields and sections |
| The focus indicator | The stepper's visual arrangement |
| Field anatomy — label, helper, error and their wiring | Which components appear on which screen, in what order |
| Component APIs — variants, sizes, states | Copy, tone, and any brand treatment (subject to `D8`) |
| Both theme resolutions | Breakpoints and responsive behaviour |

**If an exploration needs something in the left column that does not exist, that is a stop and an escalation — never a silent invention.** The stop routes into a vocabulary or component change, proposed and reviewed on its own terms; it is not a refusal, and the design is not rewritten around the gap. The [Foundation](../../../frontend/design-system/foundation.md) owns that route.

---

## 15 · Components — what auth uses, and what it does without

**Built and available:**

| Component | Vocabulary that matters here |
|---|---|
| `Button` | `variant` contained · outlined · ghost; `color`; `size`; `isLoading` + `loadingText`; `fullWidth`; `leftIcon`/`rightIcon` |
| `IconButton` | `variant`; `shape` circle · rounded; `icon` and `aria-label` both **required** |
| `Input` | `variant` outlined · filled · underlined; `label` · `helperText` · `errorMessage`; `prefix`/`suffix`; `fullWidth`; **password visibility toggle built in** |
| `Textarea` | `variant` plain · outlined; `autoResize` + `maxRows` **or** `resize` (mutually exclusive by type); no `isLoading` |
| `Checkbox` | `label` required |
| `FileInput` | `variant` standard · dropzone · **avatar** (`avatarShape`, `avatarFill`, `avatarBorder`, `avatarSize`) |
| `Typography` | display/heading/body/label variants; `tone`; element required for title variants |
| `Link` | `href` required; `as` for the navigating element; `placement` in-text · standalone; `underline` none · always · hover · subtle; `tone` |
| `Spinner` | `color` only — sizes itself from surrounding text |
| Field anatomy | Internal; label, messages and wiring composed automatically |

**Mapping:** Login and Registration → `Input` + `Button`. Phase 2 → `Textarea` (Bio) + `Input` (Name) + `FileInput variant="avatar"` (Avatar) + `Button`. Reset → `Input` ×2 + `Button`. Every busy state → `Button isLoading` or `Spinner`.

### What this design requires, and what it does not

**This design requires components the layer does not yet carry, and says so.** An earlier revision recorded that it added none — true of the column-only screens it described, and false once `D8` and the journey stepper entered. The distinction that matters is *why* something is absent: a gap left by **scarcity** is closed by extending the vocabulary, while a gap closed by **analysis** stays closed.

**Required, and committed** ([committed scope](../../../project/overview.md)): `Icon` · `Alert` · `Stepper` — and `Link`, which is now **built** and listed with the available components above. Each is interface vocabulary whose meaning survives this product; which layer builds each is the [admission test](../../../frontend/design-system/components.md)'s call, not this document's.

**The one-time-code input is committed too, and this design needs no component for it** — the table below settles what serves it. A commitment names a need; it never obliges a component to be built for that need, and here an existing control already carries it.

**Closed by analysis, and still closed** — these were never scarcity workarounds, and adding them would not make the design stronger:

| Apparent gap | Resolution |
|---|---|
| `Toast` — success confirmation | **Not needed.** Every confirmation lands on a destination screen that carries it (§9). |
| `Badge` — verified state | **Not needed.** Verification is expressed by the banner and restrictions *disappearing* — stronger than a badge appearing. |
| OTP / code-entry field | **A single `Input`** — decided. Paste is the primary interaction and a single field does not fight it; the code's length also rules out a segmented treatment at the column's width. |

**A trade that no longer needs making:** using `Button` for cross-screen navigation gave up anchor semantics — open-in-new-tab, middle-click — and was accepted only while `Link` did not exist. `Link` is built, so auth's navigational secondaries bind it rather than inheriting the workaround. There is no interim: nothing here has been authored against the stand-in.

### Icons — use what exists, prototype what does not

The existing set covers what these flows need: `CheckIcon` for a completed step and verification success · `RefreshIcon` for resend · `EyeIcon`/`EyeOffIcon` free inside `Input` · `CameraIcon`/`UploadIcon`/`UserIcon` already used by `FileInput`'s avatar variant · `XIcon` for dismiss · `UserIcon`/`PencilIcon`/`EnvelopeIcon` for the three journey steps.

**Where a design genuinely needs an icon that does not exist — a lock, a back arrow — the design idea is not dropped.** Use a **clearly marked placeholder** during exploration and record it, so it is replaced when the real icon is added to the Design System later. Where the need is settled rather than exploratory, the icon is added instead: an envelope and a pencil arrived that way for the journey stepper, which is cheaper than a placeholder that has to be found again.

Two constraints on that:

- **A placeholder is an exploration artifact, not a contribution to the layer.** `Icon` is committed and the set will grow, but an exploration does not grow it in passing: a needed icon is named and added deliberately, exactly as a token is.
- **Every placeholder must be visibly marked as one** and listed with the exploration, so it can never be mistaken for an available asset or silently ship.

An icon's absence is a reason to flag it, never a reason to weaken the design.

---

## 16 · Patterns explicitly not to copy

Each was observed in a real product and is rejected for a stated reason:

- **Field-specific login errors** — an account-enumeration leak. Our error is generic, and the visual must not undo that.
- **A non-neutral forgot-password response** — the most-cited product in the research still leaks account existence here.
- **A hard verification wall** — ties all access to email deliverability with no fallback, producing documented permanent lockouts. `D2` exists to avoid exactly this.
- **A Skip that asks for confirmation** — manufactures doubt about whether the escape hatch worked.
- **A "skip alternative" that is really a sub-flow.** If it is not a skip, it must not look like one.
- **An unmasked identifier echoed on a recovery screen** — a real, large-scale incident.
- **Error state bleeding between screens.**
- **A segmented OTP input without paste handling** — looks inviting, breaks the primary interaction.
- **OAuth buttons and any "or" divider** (`D1`) and **tabbed login/register** (`D4`) — retired by direction, not by taste.

---

## 17 · Constraints any exploration must respect

1. **Bind the vocabulary; never write a literal.** Every colour, size, space, radius and duration comes from a token name. A needed value the vocabulary cannot express is a **stop into a proposed extension** — named, reviewed and merged — never a raw value at a call site and never a design bent around the gap.
2. **Use the components §15 names — built or committed.** Reaching for `Toast` or `Badge` still departs from the direction: §15 closed those by analysis, and that reasoning has not changed. Reaching for a component in neither list is a stop.
3. **Icons: use the existing set, or a clearly marked placeholder** (§15). An exploration never adds one in passing.
4. **Never redesign a component's internals** — only its composition on a page.
5. **Both themes, always.** A light-only review cannot catch §7's contrast class of defect.
6. **Do not decide `D6` or `D7`.** `D8` is decided — the brand ground of §3 — and an exploration composes within it rather than reopening its shape.
7. **Do not reopen `D1`–`D5`** or the three-phase journey.
8. **No pixel values** except where the Design System already defines one.
9. **§12's accessibility invariants are non-negotiable** — an exploration breaking one is wrong regardless of how it looks.

---

## 18 · Genuinely open

Visual detail, deliberately unresolved — and **none of it requires a component or token that does not exist**:

- Exact copy for the neutral confirmation, the expired link-or-code dead end, and the optional-step labels — the *shape* is decided, the words are not.

**Resolved and no longer open:** the stepper's visual form and where its optional label sits · the message region's proportions · registration's step count within Phase 1 · the column's measure and its vertical rhythm · the brand zone's ground and copy · card-versus-page-ground (bordered surface, no elevation, §7) · whether auth owns motion (it does not, §8) · how form-level messages and success work without `Alert` or `Toast` (§9) · **which components this design requires, and which stay closed by analysis** (§15) · how a missing icon is handled during exploration (placeholder, §15) · **whether auth has a brand surface, and of what kind** (`D8` — a continuous typographic brand ground, §3) · **registration's primary and secondary actions** (§5).

---

> **This document owns applied design decisions and component mapping.** Ratified product decisions are the [brief](ux-brief.md)'s; observations are the [research](ux-research.md)'s; the design language itself is the [Design System](../../../frontend/design-system/README.md)'s. No screen is designed here.
