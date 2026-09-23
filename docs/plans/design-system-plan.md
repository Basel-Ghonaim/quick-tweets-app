# Design System — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-23
> **Parent Issue:** [#792](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/792)
> **Supersedes:** —

**Start here.** New to the project: [CLAUDE.md](../../CLAUDE.md), then the [agent onboarding guide](../development/agent-onboarding.md). This track is worked under the [Engineering Execution Standard](../development/engineering-execution-standard.md) — nothing in this plan replaces it. §6 holds every reference; §7 records what each Work Item settled.

---

## 1 · Purpose

The approved designs for the **Feed**, **Tweet details** and **Profile** need presentation parts the Design System does not have yet. This plan states them as **what the Design System must provide**, so the features and pages can be built directly on real parts. The temporary-component phase is cancelled.

- **What this plan owns:** which foundations and components must exist, and which existing ones must change.
- **Who works it:** Worker 1, in the main worktree.
- **What it leaves to the worker:** how each part is designed and built, how the work is split into Work Items, and in what order. These are settled with the owner in Execution Preparation.
- **What stays the same:** the Design System's architecture and contracts (§6). Every addition is admitted by the existing admission tests and validated the way existing parts are. Nothing in this plan reopens them.

**From this plan to merged work.** A capability below is not a Work Item. The route is the Execution Standard's:

1. **Execution Preparation** with the owner: agree the task, decide what one Work Item is, and write its contract — scope and acceptance criteria — into an **Issue** (§3 and §8 there).
2. **One branch per Work Item**, cut from the latest `main`, in the worktree the track uses (§4, §5).
3. **Atomic Conventional Commits**, and the documentation a change obligates lands in the **same pull request** ([Documentation Strategy](../architecture/documentation-strategy.md) §10).
4. **A pull request** carrying its evidence: what was run, what was not, and the base it was rebased onto (§8). The browser lane runs in both directions and its result is stated.
5. **Human review and merge.** The worker never merges, and never decides an architectural question alone — those are proposed and escalated (§9, §10).
6. **When it merges,** the Work Item gets its entry in §7.

---

## 2 · What the Design System must provide

### 2.1 · Foundations

- **A stacking order** for everything that sits above the page: sticky headers, a floating action, menus, dialogs, a confirmation above a dialog, and toasts.
- **An overlay ground** (the scrim behind a dialog), for both themes.
- **Elevation roles** for what is raised: menus, dialogs, the floating action and toasts. The shadow primitives exist; what each raised thing uses does not.
- **Responsive widths** a page can rely on: phone, tablet and desktop.
- **The palette colour** the product uses for "liked". The Design System owns only the colour; what it *means* belongs to the product.

### 2.2 · Components to add

- **Avatar:** a picture in a circle with a fallback, at the sizes the designs use, from small rows to the profile header.
- **Skeleton:** placeholder shapes while content loads.
- **Menu:** anchored to what opens it, with ordinary, checked and dangerous items, and correct placement in both directions.
- **Dialog:** a modal dialog, an alert dialog for confirmations, and a full-screen form for phones. It can host a confirmation above itself.
- **Tabs:** tabs that can also be navigation, where each tab is its own address.
- **Toast:** a brief, polite confirmation, optionally with an action, placed above the page and clear of the phone's bottom bar.
- **Tooltip:** names for icon-only controls on the collapsed navigation.

### 2.3 · Changes to existing parts

- **Icons:** the additions the designs use, including a filled form for "liked" and mirroring in right to left where the meaning has a direction.
- **Textarea:** hosts a character count. The limit is passed in and never known to the Design System.
- **Input:** a rounded (pill) shape, for the search field.
- **Navigation drawn as an action:** a link that looks like a button.

### 2.4 · Qualities every addition keeps

These are existing contracts (§6), restated so the plan is complete:
- both themes;
- both directions, using logical placement only;
- keyboard operation, and focus that is kept inside an open overlay and returned when it closes;
- the contrast and hit-target floors;
- reduced motion wherever something moves;
- proof in Storybook, in both directions.

---

## 3 · Not the Design System's

The designs contain product surfaces built *from* the Design System. They belong to a feature or a page, not here:
- the post and its action row;
- the comment and reply;
- the composer and the reply box;
- the follow button and its states;
- the profile header;
- the guest prompt;
- the navigation surfaces and the sidebar panels.

Also not the Design System's:
- "**this user's** avatar": resolving the user's image, and the fallback for that user;
- the **meaning** of "liked";
- a generic **Card**. It is not grounded today; a panel is expressible with existing foundations.

---

## 4 · Decisions to settle in Execution Preparation

Each is settled with the owner before the part it affects is built:
- **the design's departures from Design System values.** The approved designs record each one (§6, the extension logs). Each is either admitted into the language or brought back to the existing value;
- how **responsive widths** are made consumable ([Finding 0011](../architecture/findings/open/0011-breakpoint-tokens-unconsumable-mechanism.md));
- the **stacking order** as a shared concept ([Finding 0012](../architecture/findings/open/0012-no-shared-stacking-concept.md));
- the **reduced-motion** answer for anything that animates ([Finding 0013](../architecture/findings/open/0013-motion-claims-an-unbuilt-reduced-motion-resolution.md));
- which existing part takes **navigation drawn as an action**;
- whether the **image viewer** is a form of Dialog or a product surface;
- whether the phone's **bottom sheet** is a form of Dialog;
- whether **upload progress** is a Design System part or product presentation;
- whether a larger **touch target** for coarse pointers is earned;
- whether **Alert** replaces the interim MessageRegion now or later ([Finding 0024](../architecture/findings/open/0024-message-region-enters-the-layer-below-its-conventions.md)).

---

## 5 · Out of scope

- **Settings** (deferred, [#796](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/796)), and any part only Settings needs.
- **Redesigning existing components** beyond the changes in §2.3.
- Parts for surfaces **not yet designed**, such as search results.
- A **visual-regression** system.
- The rest of the committed vocabulary, which is built when a design needs it.

---

## 6 · References

Read the architecture before starting. Read the others when the question they answer comes up.

### Architecture and contracts (settled; never reopened here)

| Document | What it answers | Read when |
|---|---|---|
| [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) | The Design System's boundary and invariants. Decision 2 sets when a part is **grounded**; Decision 8 says product-semantic colour is not the Design System's. | Before any addition. When deciding whether something belongs here at all. |
| [ADR 0011](../architecture/decisions/0011-intent-layer-earned-not-assumed.md) | When a token earns an intent tier rather than staying a primitive. | Adding foundations (§2.1), such as elevation or stacking. |
| [ADR 0012](../architecture/decisions/0012-foundation-contract-independent-of-consumer-adoption.md) | The Foundation contract stands independent of who adopts it. | Changing or adding a foundation. |
| [ADR 0014](../architecture/decisions/0014-document-classes-and-committed-product-scope.md) | Document classes, and where committed product scope lives. | Checking whether a component is committed. |
| [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) | The four zones. The Design System sits in `shared/` and imports nothing above it. | Deciding where a part lives (§3). |
| [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) and the [testing topology](../development/testing-topology.md) | Which lane proves what, including the browser lane (Storybook). | Planning how a part is proven. |
| [Design System README](../frontend/design-system/README.md) | What the Design System owns, its public surface, and where each fact lives. | First read. |
| [Foundation contract](../frontend/design-system/foundation.md) | Tiers, token admission, naming, residency and enforcement. | Any foundation work (§2.1). |
| [Component authoring contract](../frontend/design-system/components.md) | Component admission, the authoring convention, the variant model, and usage documentation. | Any component work (§2.2, §2.3). |
| [Code-adjacent map](../../apps/web/src/shared/design-system/README.md) | The index for documentation living beside the code. | Finding a part's local notes. |
| [Committed scope: the interface vocabulary](../project/overview.md#interface-vocabulary) | Which components the product is committed to. That is the grounding for §2.2. | Confirming a component is committed. |
| [Frontend architecture](../frontend/architecture.md) and [localisation](../frontend/localisation.md) | The dependency rule (the Design System takes navigation from outside), and how words and numbers reach a component. | Navigation drawn as an action; any part that shows words or counts. |

### Precedent

| Document | What it answers | Read when |
|---|---|---|
| [Design System Re-establishment plan](historical/design-system-reestablishment.md) and [Component Set plan](historical/design-system-components.md) (both Historical) | How earlier Design System work was sequenced, proven and closed. | Shaping Work Items for this track. |
| The open findings named in §4 | The recorded questions this track may answer. | Before the decision each one blocks. |

### Approved decisions and designs

Sources marked *local* are working material in `.project/`, outside the repository. They are available to this effort's workers, not to other readers.

| Source | What it holds | Read when |
|---|---|---|
| [Approved designs](https://claude.ai/artifact/LFz7oGKfFJbRNumTZzBAtY) (Claude Design canvas) | The **Feed**, **Tweet details**, **Profile** and **Shared pieces** pages (all approved). Each carries an **ownership board** (which zone owns each part) and an **extension log** (each departure from Design System values). **Feed · v2** is the approved Feed and governs; the version before it is superseded. | Building any part. The values come from the approved design, never from earlier code. |
| [Quick Tweets Design System](https://claude.ai/artifact/KsXinK8EnPfk4KCsohznXV) (Claude Design) | The design-time mirror of the tokens and components. **The repository is authoritative:** where they differ, the code wins, and the difference is raised. | Comparing a design value with the language. |
| Feed design brief (local: `.project/feed-design/design-brief.md`) and Profile and Tweet details brief (local: `.project/feed-design/profile-tweet-details-brief.md`) | The approved product and design decisions, with who approved each. | When a design choice needs its reason. |
| Feed implementation analysis (local: `.project/feed-design/feed-implementation-analysis.md`), §1 | The first inventory of Design System needs, with each part's grounding. | Starting the track, and settling §4. It predates the Tweet details and Profile designs, which add Tabs, Toast and larger avatars. |

---

## 7 · Execution log

One entry per Work Item, newest last: its Issue and pull request, what it settled, which sections of this plan it amended, and what it recorded. No status lives here — that is the tracker's ([ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 3). **When and where an entry is written** is the [plans README](README.md)'s, which owns this convention.

**Avatar — a picture in a circle, with a fallback.** [#800](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/800) · [#806](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/806).

- **Settled.** Avatar is **presentational**: the approved design draws the circle as a link and as a menu button, and the caller supplies that element, so the layer gains no second consumer of the router and the navigation seam stays closed ([frontend architecture](../frontend/architecture.md), the dependency rule). Its five sizes are **named rather than given in pixels** and are the component's **own geometry**, not shared language — an avatar's diameter is a dimension nothing else must agree on, so it earns no token family. The **page owns the 72/96 swap**, which keeps the component clear of the unsettled responsive-widths question (§4). The picture arrives as an already-resolved `src` with a **required `alt`** that may be empty, and `UserIcon` covers both absence and a picture that fails to arrive — a state no design draws.
- **Amended.** §6 — Feed · v2 is the approved Feed and governs; the version before it is superseded.
- **Recorded.** [Finding 0039](../architecture/findings/open/0039-the-avatar-variant-restates-the-circle-and-composes-classes-by-hand.md) — the file input's avatar variant restates the circle this component now owns, and it and the dropzone compose class lists outside the shared helper; a follow-up Work Item is proposed, not opened. [Finding 0024](../architecture/findings/open/0024-message-region-enters-the-layer-below-its-conventions.md) gains the second half of its class-reference evidence: the check reads a comment as a call site.
