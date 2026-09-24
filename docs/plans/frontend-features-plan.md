# Frontend Features — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-24
> **Parent Issue:** [#794](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/794)
> **Supersedes:** —

**Start here.** New to the project: [CLAUDE.md](../../CLAUDE.md), then the [agent onboarding guide](../development/agent-onboarding.md). This track is worked under the [Engineering Execution Standard](../development/engineering-execution-standard.md) — nothing in this plan replaces it. §6 holds every reference; §7 records what each Work Item settled.

---

## 1 · Purpose

The **Feed**, **Tweet details** and **Profile** are composed from product features. This plan states **which features must exist and what each must let the reader do**, so the pages can compose them.

- **What this plan owns:** the product capabilities the frontend must provide, and what each depends on from the other tracks.
- **Who works it:** Worker 1, in the main worktree. Worker 2 may take features for the backend capabilities it delivered, when appropriate.
- **What it leaves to the worker:** how each feature is built, its exact boundaries, how the work is split into Work Items, and in what order. These are settled with the owner in Execution Preparation.
- **What stays the same:** the zone rules. A feature owns a fact and the operations on it. It may own the interface that *is* its interaction. It owns no route, no layout and no other feature, and features never import one another (§6).

### The data library: decided

**RTK Query is the chosen library for server data and its state**, across most if not all of these features. The choice is [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 7's ("RTK Query owns server cache state; it does not own domain logic"); this plan only states that it applies here. How it is used, and how the data layer is designed, are settled in Execution Preparation, with the data layer itself provided by the [Shared Platform plan](shared-platform-plan.md) §2.1.

**From this plan to merged work.** A capability below is not a Work Item. The route is the Execution Standard's:

1. **Execution Preparation** with the owner: agree the task, decide what one Work Item is, and write its contract — scope and acceptance criteria — into an **Issue** (§3 and §8 there).
2. **One branch per Work Item**, cut from the latest `main`, in the worktree the track uses (§4, §5).
3. **Atomic Conventional Commits**, and the documentation a change obligates lands in the **same pull request** ([Documentation Strategy](../architecture/documentation-strategy.md) §10).
4. **A pull request** carrying its evidence: what was run, what was not, and the base it was rebased onto (§8). The browser lane runs in both directions and its result is stated.
5. **Human review and merge.** The worker never merges, and never decides an architectural question alone — those are proposed and escalated (§9, §10).
6. **When it merges,** the Work Item gets its entry in §7.

---

## 2 · Features required

The names below are working names. Each feature's final boundary is decided in Execution Preparation.

### 2.1 · Posts

- **Read:** the feed, a single post, and a person's posts, each loaded progressively where it is a list.
- **Write:**
  - create a post with text and images. Images carry no description, because the backend does not support one ([Backend plan](backend-plan.md) §2.6);
  - edit your own post, text and images alike;
  - delete your own post.
- **Act:**
  - like and unlike;
  - share a post's link;
  - open a posted image full size.
- **Show:** the post with its author, time, "Edited", text with links, images and action row. Your own post shows your own menu.
- **Repost** appears in the design but has no behaviour yet (§5).

### 2.2 · Comments and replies

- **Read:** a post's thread, oldest first and loaded progressively. Replies stay collapsed until asked for.
- **Write:**
  - reply to a post;
  - reply to a comment, which opens with the @mention of the person answered when replying to a reply;
  - edit your own comment in place;
  - delete your own comment, which removes its replies too.
- **Act:** like and unlike a comment or a reply.
- **Show:** your new comment appears straight away where you wrote it, marked as yours.

### 2.3 · Following and people

- **Follow and unfollow**, with the button's states: Follow, Following (Unfollow on hover or focus) and Follow back.
- **Followers and Following lists** for a person.
- **Suggested accounts ("Who to follow")**, never including the person being viewed.

### 2.4 · Profiles

- **Read any person's profile** by username: identity, bio, join date and counts. A former username leads to the current one, and an unknown one shows "not found".
- **Know the reader's own profile**, for the account block and the composer.
- **Where this lives:** a `users` capability absorbing the existing profile capability has been approved. **Moving the profile form belongs with Settings and is deferred** (§5). Until then, the existing profile editing is not changed.

### 2.5 · Discovery

- **Trending:** the current terms, each leading to Search.
- **Search:** a field that takes the reader to Search. #hashtags in text lead there too.

### 2.6 · Across every feature

- **Guests** can read. Anything that needs an account raises the guest intent the page answers (Shared Platform §2.6).
- **Feedback after an action** uses the shared toast (Shared Platform §2.6).
- **Failure** is shown where it happened, with a way to retry, and never only in a toast.
- **Words** are in both catalogues, in both directions and both themes.

---

## 3 · What each feature relies on

A feature is ready to build when its dependencies are in place. The tracks deliver in parallel, so this table decides when each can start.

| Feature | [Backend plan](backend-plan.md) | [Design System plan](design-system-plan.md) | [Shared Platform plan](shared-platform-plan.md) |
|---|---|---|---|
| **Posts** | §2.1 Posts, §2.2 Likes, §2.6 Images, §2.7 Text; the existing feed and single post (§3) | Menu, Dialog, Skeleton, Avatar, Toast, icons, character count (§2.2, §2.3) | Data, Media, Formats, Shared rules, Presentation, Interaction (§2.1–§2.6) |
| **Comments and replies** | §2.3 Comments and replies, §2.2 Likes, §2.6 Images, §2.7 Text | Menu, Dialog, Skeleton, Avatar, Toast, character count | Data, Media, Formats, Shared rules, Presentation, Interaction |
| **Following and people** | §2.4 Following and people | Avatar, Skeleton | Data, Presentation, Interaction |
| **Profiles** | Existing profile reads (§3), plus §2.4's "follows you" | Avatar, Tabs, Skeleton | Data, Formats, Presentation |
| **Discovery** | §2.5 Discovery | Input's pill shape | Data, Formats, Shared rules |

**Where a backend capability already exists** (the feed, a single post, likes on posts, creating, editing and deleting a post, following), a feature can start before the rest of its backend lands. The capabilities still to come are added as they arrive.

---

## 4 · Decisions to settle in Execution Preparation

Each is settled with the owner before the feature it affects is built:
- **each feature's boundary:** which features exist and what each owns. For example, likes may live with what is liked, or apart from it;
- **how RTK Query is used:** the data layer's shape, how a change in one feature reaches the others, and how the reader's own actions are shown before the server answers. The platform side is Shared Platform §4;
- **how a feature reaches a destination it does not own**, such as a post's address, a profile or Search. The page supplies it ([#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739));
- **how a feature's interface is placed inside another's:** a follow item in a post's menu, the quoted post in a reply, "About the author" on Tweet details. The page composes them, since features never import each other;
- **when a `users` capability** takes over reading profiles (§2.4);
- **documentation:** the first Work Item that changes a feature's behaviour creates that feature's document ([Finding 0036](../architecture/findings/open/0036-documentation-the-feature-split-found-missing.md)).

---

## 5 · Out of scope

- **Settings** (deferred, [#796](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/796)), including moving the profile form.
- **Repost:** its meaning is not yet defined. Nothing is built for it until it is.
- The **search results page** and the profile's **Likes tab**, which are not yet designed or are deferred.
- **Pages:** routes, layouts and composition belong to the Pages track.
- **Migrating existing capabilities** (authentication, recovery, journey, the existing profile editing) onto the new data layer.

---

## 6 · References

Read the architecture before starting. Read the others when the question they answer comes up.

### Architecture and contracts (settled; never reopened here)

| Document | What it answers | Read when |
|---|---|---|
| [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) | The four zones. Decision 3 says what a feature owns and may not do. | Before shaping any feature. |
| [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) | Why the session is platform, not a feature. That is how a feature knows the reader. | Anything that depends on who is reading. |
| [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) and the [testing topology](../development/testing-topology.md) | Which lane proves what: answers, not answerers. | Planning how a feature is proven. |
| [Frontend architecture](../frontend/architecture.md) | The dependency rule, **the capability structure** (its layers and rules), the page-group contract, and the platform index. | First read. Before adding a feature. |
| [API client](../frontend/api-client.md) | The transport, and the RTK Query stack as it stands today. | Before any feature reaches the server. |
| [API contract](../api/api-contract.md) | Every endpoint, payload, error and pagination shape the features consume. | Any feature that reads or writes server data. It grows as the Backend track lands. |
| [Error handling](../frontend/error-handling.md) | How a refusal is normalised before a feature words it. | Failure states. |
| [Forms](../frontend/forms.md) | The schema-driven form engine. | Any feature with input. |
| [Localisation](../frontend/localisation.md) | Catalogues, numbers, and approving a language's words. | Every feature that shows words or counts. |
| [Design System README](../frontend/design-system/README.md) | What features take from the presentation language. | Before composing a feature's interface. |
| [Documentation Strategy](../architecture/documentation-strategy.md) | One owner per fact, and when a feature's document is created. | Documenting a feature. |
| Existing feature documents: [profile](../features/profile.md), [authentication](../features/authentication.md), [recovery](../features/recovery.md), [journey](../features/journey.md) | How a feature document is written in this project. | Writing the first document for a new feature. |

### Open questions on record

| Source | What it holds | Read when |
|---|---|---|
| [#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739) | Route literals inside capability screens. | A feature needs a destination it does not own. |
| [#272](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/272) | The deferred state-and-data document. | Settling how RTK Query is used. |
| [Finding 0036](../architecture/findings/open/0036-documentation-the-feature-split-found-missing.md) | Documentation the feature split found missing, including profile details the form relies on. | Documenting posts, comments or profiles. |

### Sibling plans

| Plan | What it holds | Read when |
|---|---|---|
| [Backend plan](backend-plan.md) | The capabilities the server will provide. | Before a feature relies on one. |
| [Design System plan](design-system-plan.md) | The presentation parts that will exist. | Before composing an interface. |
| [Shared Platform plan](shared-platform-plan.md) | The data layer, media, formats, shared rules, shared presentation and interaction. | Before building anything more than one feature needs. |

### Approved decisions and designs

Sources marked *local* are working material in `.project/`, outside the repository. They are available to this effort's workers, not to other readers.

| Source | What it holds | Read when |
|---|---|---|
| [Approved designs](https://claude.ai/artifact/LFz7oGKfFJbRNumTZzBAtY) (Claude Design canvas) | The **Feed**, **Tweet details**, **Profile** and **Shared pieces** pages (all approved), with every state, both directions and both themes. Each carries an **ownership board**: the feature the design expects to own each part. That is a starting point for §4, not a decision. **Feed · v2** is still under review: until it is approved, the approved Feed governs. | Building any feature's interface. The values come from the approved design, never from earlier code. |
| Feed design brief (local: `.project/feed-design/design-brief.md`) and Profile and Tweet details brief (local: `.project/feed-design/profile-tweet-details-brief.md`) | The approved product decisions: threading, likes, editing, following, guests, links and the image viewer. | When a behaviour needs its reason. |
| Feed implementation analysis (local: `.project/feed-design/feed-implementation-analysis.md`), §3 | The first inventory of features, with ownership and dependencies. | Starting the track, and settling §4. It predates the Tweet details and Profile designs, which add threads, comment likes, the profile, follow lists and the approved edit and description designs. |

---

## 7 · Execution log

One entry per Work Item, newest last: its Issue and pull request, what it settled, which sections of this plan it amended, and what it recorded. No status lives here — that is the tracker's ([ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 3). **When and where an entry is written** is the [plans README](README.md)'s, which owns this convention.

*No Work Item has merged yet.*
