# Pages — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-22
> **Parent Issue:** [#795](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/795)
> **Supersedes:** —

---

## 1 · Purpose

The **Feed**, **Tweet details** and **Profile** are where the reader meets the product. This plan states **what the pages must provide**: the surfaces, the frame they share, and the composition that brings the features together as the approved designs draw them.

- **What this plan owns:** the surfaces, and the responsibilities the pages carry.
- **Who works it:** Worker 1, in the main worktree.
- **What it leaves to the worker:** how pages are grouped and structured, how each responsibility is met, how the work is split into Work Items, and in what order. These are settled with the owner in Execution Preparation.
- **What stays the same:** the current architecture rules, which bind every page (§6):
  - a page **composes**: it owns no product fact and no state, and never reaches the server itself;
  - it reaches each capability **only through that capability's public surface**;
  - it owns **routes, layout and destinations**, which no feature does;
  - **access is stated at each route**, never inherited.
- **No temporary components.** Pages are built from real Design System parts and real features. The temporary-component phase is cancelled.

---

## 2 · What the pages must provide

### 2.1 · The surfaces

- **Feed:** the feed with its composer, for readers and guests alike.
- **Tweet details:** a post as a page of its own, with its thread, the reply box and "About the author".
- **Profile:** a person's profile, with Posts, Followers and Following, each at its own address.

Each surface replaces the placeholder that holds its address today, once it exists.

### 2.2 · The frame the surfaces share

- **Navigation:** Home, Search, Profile, Settings and a Post action. Where the reader is, is always marked.
- **The sidebar:** search, Trending, "Who to follow" and the links footer.
- **The phone's frame:** a top bar, a bottom bar and a floating Post action.
- **The account menu:** theme, language and signing out.
- **The guest's frame:** Sign in and Create account, with language and theme.
- **Every approved width** (phone, tablet and desktop), **both directions** and **both themes**, as the designs draw them.

### 2.3 · States the pages show

- **Lists:** loading, empty (worded for you or for someone else), failed with retry, the end, and more failing to load.
- **Tweet details:** the post not found, the post deleted while it is being read, and a guest's view.
- **Profile:** not found, loading, no posts, nobody followed or following, and a guest's view.
- **Nothing untrue:** a surface never shows invented content in production.

### 2.4 · Composition

- **Places each feature's interface** where the design puts it.
- **Places one feature's interface inside another's:** a follow item in a post's menu, the quoted post in a reply, "About the author" beside a post. Features never do this themselves.
- **Supplies every destination:** a post's address, a profile, Search, and the auth pages for a guest.
- **Answers what features raise:** a guest intent with the one guest prompt, and feedback with a toast, both placed where the designs draw them.
- **Hosts the overlays:** new post and edit post (from any screen), discard, delete confirmations, the image viewer and menus. Each is in the right layer and returns focus when it closes.
- **Settings entry points** (Settings in the navigation, Edit profile) lead where the deferred Settings track allows. They are not built out here.

### 2.5 · Every surface also

- keeps the reader's **place** where the designs expect it, such as returning to the feed;
- carries its **words** in both catalogues;
- meets the **accessibility baseline** the designs set: landmarks, headings, focus order, and names on icon-only controls;
- is **proven** in both directions, per the testing topology.

---

## 3 · What the pages rely on

A surface grows as its parts arrive. It does not wait for every feature.

| Track | What the pages take from it |
|---|---|
| [Frontend Features plan](frontend-features-plan.md) | Every product capability a surface shows: posts, comments, following, profiles and discovery (§2). |
| [Design System plan](design-system-plan.md) | The presentation parts the frame and overlays use, such as Dialog, Menu, Tabs, Toast, Avatar and Skeleton, plus the stacking order and responsive widths (§2). |
| [Shared Platform plan](shared-platform-plan.md) | The session and preferences for the frame, the guest-intent and feedback mechanisms, and the words (§2). |
| [Backend plan](backend-plan.md) | Nothing directly. Pages never reach the server, so they receive backend capabilities through features. |

**The frame can come before the features:** navigation, sidebar layout, the phone's frame and the account menu need only the Design System and the platform. Each surface's content then arrives feature by feature.

---

## 4 · Decisions to settle in Execution Preparation

Each is settled with the owner before the responsibility it affects is built:
- **how pages are grouped.** The shared frame is needed by every surface, and one page group may not import another, so it matters where the frame lives. This is recorded where the page-group contract is owned;
- **what the front door leads to** once the Feed exists, and what the Feed shows before its features are complete. It shows nothing untrue (§2.3);
- **how destinations are supplied** to features ([#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739));
- **where guest intents and toasts are answered**, with the platform side in Shared Platform §4;
- **how responsive widths are consumed** (Design System §4; [Finding 0011](../architecture/findings/open/0011-breakpoint-tokens-unconsumable-mechanism.md));
- **keeping the reader's place**, which may depend on how routing is set up;
- **what Search shows** before its results page is designed;
- **where Edit profile and Settings lead** while Settings is deferred;
- **how a page's "owns no state" rule is proven** ([Finding 0033](../architecture/findings/open/0033-a-page-owning-state-is-not-checkable-by-imports.md));
- **documentation:** the pages' own document ([Finding 0036](../architecture/findings/open/0036-documentation-the-feature-split-found-missing.md)).

---

## 5 · Out of scope

- **Settings** (deferred, [#796](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/796)), including Settings → Profile.
- The **search results page**, the profile's **Likes tab**, and any surface not yet designed.
- **Product behaviour:** that is the features'.
- **Presentation language:** that is the Design System's.
- **Changes to the auth pages** beyond what a guest's return to a surface requires.

---

## 6 · References

Read the architecture before starting. Read the others when the question they answer comes up.

### Architecture and contracts (settled; never reopened here)

| Document | What it answers | Read when |
|---|---|---|
| [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) | The four zones. Decision 2: a page group is a route subtree with the layout its routes share, and composes capabilities. | First read. Before grouping pages. |
| [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) | Why the session is platform. That is how a page knows the reader without owning state. | The frame, the account menu, guest views. |
| [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) | Decision 4: the theme is resolved by the Design System and selected by the application. | The account menu's theme switch. |
| [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) and the [testing topology](../development/testing-topology.md) | Which lane proves what. Decision 6 bars code whose only consumer is a story. | Planning proof. What a surface shows before its features exist. |
| [Frontend architecture](../frontend/architecture.md) | **The page-group contract**, the dependency rule, the composition root, the capability structure, and known deviations. | First read. Before any page work. |
| [Localisation](../frontend/localisation.md) | The reader's language, direction, catalogues and approval. | Every surface's words and direction. |
| [Design System README](../frontend/design-system/README.md) | What pages take from the presentation language. | Composing the frame and overlays. |
| [Documentation Strategy](../architecture/documentation-strategy.md) | One owner per fact, and when a page's document is created. | Documenting the pages. |
| [The auth page group](../../apps/web/src/pages/auth/) and its [feature documents](../features/authentication.md) | The one page group that exists today: how it publishes its routes, guards access, and checks its own boundary. | Shaping the new pages. |

### Open questions on record

| Source | What it holds | Read when |
|---|---|---|
| [#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739) | Route literals inside capability screens, and a guest's return address. | Supplying destinations. |
| [Finding 0011](../architecture/findings/open/0011-breakpoint-tokens-unconsumable-mechanism.md) | No valid mechanism for breakpoints yet. | Responsive widths. |
| [Finding 0033](../architecture/findings/open/0033-a-page-owning-state-is-not-checkable-by-imports.md) | A page owning state cannot be caught by import checks. | Proving the "owns no state" rule. |
| [Finding 0036](../architecture/findings/open/0036-documentation-the-feature-split-found-missing.md) | Documentation the split found missing, including the page group's document. | Documenting the pages. |

### Sibling plans

| Plan | What it holds | Read when |
|---|---|---|
| [Frontend Features plan](frontend-features-plan.md) | The features the pages compose. | Before composing a surface. |
| [Design System plan](design-system-plan.md) | The presentation parts that will exist. | Building the frame and overlays. |
| [Shared Platform plan](shared-platform-plan.md) | Session, preferences, guest intents, feedback and words. | Anything more than one surface needs. |
| [Backend plan](backend-plan.md) | What the server will provide, reached only through features. | Understanding what a surface can show. |

### Approved decisions and designs

Sources marked *local* are working material in `.project/`, outside the repository. They are available to this effort's workers, not to other readers.

| Source | What it holds | Read when |
|---|---|---|
| [Approved designs](https://claude.ai/artifact/LFz7oGKfFJbRNumTZzBAtY) (Claude Design canvas) | The **Feed**, **Tweet details**, **Profile** and **Shared pieces** pages (all approved): every surface at every width, both directions and both themes, every state and overlay. Each carries an **ownership board**, a starting point for §4, not a decision. **Feed · v2** is still under review: until it is approved, the approved Feed governs. | Building any surface. The values come from the approved design, never from earlier code. |
| Feed design brief (local: `.project/feed-design/design-brief.md`) and Profile and Tweet details brief (local: `.project/feed-design/profile-tweet-details-brief.md`) | The approved decisions: the three regions, the sidebar's order, Tweet details as a page, tabs as addresses, the guest prompt, and the widths, directions and accessibility baseline. | When a surface's behaviour needs its reason. |
| Feed implementation analysis (local: `.project/feed-design/feed-implementation-analysis.md`), §4 | The first framing of the page's shape, what a page owns, and the options for grouping. | Starting the track, and settling §4. It predates the Tweet details and Profile designs. |
