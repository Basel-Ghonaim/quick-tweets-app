# Design System — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-27
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
- **Tabs:** navigation, where each tab is its own address. The designs draw no other form — nothing uses the tablist role — so a form that switches panels in place stays owed until one is drawn.
- **Toast:** a brief, polite confirmation, optionally with an action, placed above the page and clear of the phone's bottom bar.
- **Tooltip:** names for icon-only controls on the collapsed navigation. **Deferred until it is drawn:** the approved designs name it in a comment and draw it nowhere, and §5 keeps parts for undesigned surfaces out. It stays owed.

### 2.3 · Changes to existing parts

- **Icons:** the additions the designs use, and mirroring in right to left where the meaning has a direction. A filled "liked" is not a second glyph — the design fills the shared one from the consumer.
- **Textarea:** no change. The designs place the character count in the composer's own toolbar, a sibling of the field rather than something it hosts, so the count is the consumer's composition and the limit never reaches this layer at all.
- **Input:** no change. The approved designs draw the search field on the stock filled variant and override the component nowhere, so the pill the extension log named was never settled.
- **Navigation drawn as an action:** the designs draw an anchor carrying a button's appearance, so it is a button that navigates rather than a link that looks like one (§4).

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

**Every Work Item settles the approved design's departures for the part it builds** — the extension logs (§6) record each one, and each is either admitted into the language or brought back to the existing value. That is a standing obligation of Execution Preparation rather than an item on this list, and it is how the departures settled so far were settled.

What remains outstanding, and what each one gates:

*Nothing is outstanding. The four questions that were, are answered below.*

### Settled, and where each answer lives

| Question | Answer |
|---|---|
| **How a component navigates** | **The seam.** `Link` takes the navigating element today; Tabs and navigation-drawn-as-an-action are the second and third that need one, which the [frontend architecture](../frontend/architecture.md) holds converts that pattern to an inversion. Its own Work Item, before either consumer |
| **Where determinate progress lives** | **One `Progress` part**, linear and ring, on the `progress` element's platform basis. The composer's count ring and an upload's bar are the same concept, so the part precedes the count |
| **`Alert`** | **Built with its migration, not before it:** implementing `Alert` includes replacing `MessageRegion` at its consumers, rather than leaving two message components standing. It waits on a design — the approved designs draw no `Alert` and compose the interim instead ([Finding 0024](../architecture/findings/open/0024-message-region-enters-the-layer-below-its-conventions.md)) |
| **How an icon expresses a filled form** | **The caller fills it.** The design renders one heart glyph in both states and fills it from a consumer class, so the set gains no filled twin and the shared icon contract gains no prop |
| The **stacking order** as a shared concept | Built. The approved designs supplied the complete sequence, and [Finding 0012](../architecture/findings/resolved/0012-no-shared-stacking-concept.md) closed with it |
| A larger **touch target** for coarse pointers | No token. Five parts want five sizes above one agreed floor, which is five decisions rather than one concept — the [Foundation contract](../frontend/design-system/foundation.md) holds the reasoning |
| The **reduced-motion** answer, for this track | Gates nothing here: the approved designs animate none of these parts, Skeleton included. [Finding 0013](../architecture/findings/open/0013-motion-claims-an-unbuilt-reduced-motion-resolution.md) stays open on its own merits |
| **Responsive widths** | Still owed by §2.1, and gating nothing here: no remaining part needs a breakpoint, and a dialog's phone form is a variant its caller passes. The mechanism ([Finding 0011](../architecture/findings/open/0011-breakpoint-tokens-unconsumable-mechanism.md)) is settled when the first consumer appears, which is a page composing layout rather than a part built here |

### Not this plan's to settle

The **image viewer** and the phone's **bottom sheet** are product surfaces composed from `Dialog`, which now exists with the forms they would extend. Both belong to the preparation of the track whose pages compose them, where their consumers can be seen; deciding them here would be designing for a caller this plan cannot see.

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

**The stacking order, the overlay ground and elevation roles.** [#808](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/808) · [#809](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/809).

- **Settled.** A stacking order is **named in full or not at all** — six layers, including the sticky and floating ones this system does not build, because an order is only meaningful as a complete relative sequence and half of one leaves pages guessing the rest against numbers they cannot see. **Elevation is a role, not a shadow:** three of the four reach for one value today and stay three tokens, since they are three decisions that must be free to diverge. The **overlay ground resolves per theme** and the media wash does not bind it, however alike the two look. Stacking also settled that a family whose values exist only to realise its roles has **no scale to fall back to**, so the earning criterion has nothing to ask of it.
- **Amended.** None. §2.1 states what must exist and still does.
- **Recorded.** No finding. `tokenReferences` refusing an interpolation whose vocabulary it cannot read is the mechanism working, not a deviation — the proof names its tokens literally instead. What would reopen elevation's theme classification is written at the value rather than left to memory.

**Menu, Dialog and Toast.** [#812](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/812) · [#814](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/814).

- **Settled.** The layer **builds on the platform's own overlays** where they exist: `popover` carries Menu's top layer, and `<dialog>` carries the guarantees a dialog lives by — focus held inside, focus returned, the page behind it inert — because those are expensive to rebuild and quiet when they break. The consequence is that **the top layer ignores the stacking order**, so three of its six layers name surfaces nothing now binds them for; the order governs what the page positions itself, and §2.1's family is complete rather than consumed. **Placement is measured, not declared** — it flips and shifts from what it measures, and the inline offset is computed from the reader's starting edge so the stylesheet binds one logical property. **A dismissal a platform answers only to real input is taken back**: Menu and Dialog close on Escape themselves, or the guarantee is one no lane can prove. Toast **waits its turn**, colours the glyph by role and leaves which glyph to the caller, and owns no timer and no queue.
- **Amended.** None. §2.2 states what must exist and still does. Tooltip stays listed there and is undrawn, which is why it was not built here.
- **Recorded.** [Finding 0040](../architecture/findings/open/0040-the-browser-lane-certifies-less-than-it-is-cited-for.md) — the browser lane certifies one engine and no real input, so a green run cannot be read for which of its claims were observed and which were modelled. Building on platform overlays is what made both limits bite at once.

**The vocabulary the surfaces still need.** [#823](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/823) · [#825](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/825).

- **Settled.** **The artboards outrank the extension log.** Three of its entries have now proved wrong in the same direction — an avatar size it omitted, a filled glyph it invented, and a pill nothing draws — so a part is built from what the design renders, never from what the log says is needed. A **filled form is the consumer's**, not a second glyph: the design fills one heart from its own rule, which outranks the attribute the icon carries. A **ramp is as long as the design makes it**, and this layer owns the colour while the meaning, its per-theme resolution and the wash beneath it stay the product's. The shared class helper now sits where all three peers reach it, so the next icon composes its class rather than hand-rolling one.
- **Amended.** §2.3 — `Input` needs no change, and navigation-drawn-as-an-action is a button that navigates rather than a link that looks like one, which §4 already said and §2.3 contradicted.
- **Recorded.** No finding. [Finding 0016](../architecture/findings/resolved/0016-class-name-helper-is-not-reachable-by-its-peers.md) is closed by the move rather than recorded again, and the withdrawn pill is marked in the design's own extension log so it is not proposed a second time.

**Skeleton and Progress.** [#828](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/828) · [#830](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/830).

- **Settled.** **An indicator says nothing of its own.** A placeholder, a bar and a ring are all silent and `aria-hidden`, because what is loading and whether it matters is known only to the surface that composes them — the Spinner's rule, now the rule for everything of its kind. **Past its maximum, a fraction draws as done rather than as more:** overrunning is real, it is the consumer's to word, and a circle cannot mean more than once round. **Geometry gets a module and unit tests of its own**, since a dasharray plausible at half way is exactly what a rendered story samples and passes. And `Progress` is grounded by **adoption rather than by the platform** — a ring cannot be the `progress` element, so the element's semantics do not admit it and the committed vocabulary does.
- **Amended.** §2.3 — `Textarea` needs no change: the designs place the character count in the composer's own toolbar, so the limit never reaches this layer. The fourth extension-log divergence, and the second Work Item running to the rule that the artboards outrank the log.
- **Recorded.** No finding. Two guarantees were unproven until a mutation said so — a removed `aria-hidden` raises no accessibility violation, and a quarter arc drawn from three o'clock is as long as one drawn from the top — so both are asserted directly rather than inferred.
