# Shared Platform — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-22
> **Parent Issue:** [#793](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/793)
> **Supersedes:** —

---

## 1 · Purpose

Several features behind the **Feed**, **Tweet details** and **Profile** need the same foundations: data, media, formats, shared rules, and presentation of the same product nouns. This plan states them as **capabilities that must exist before the features that rely on them**, so no feature builds its own copy and no feature has to reach into another.

- **What this plan owns:** what must be available to more than one feature or page.
- **Who works it:** Worker 1, in the main worktree.
- **What it leaves to the worker:** how each capability is built, **where it lives and who owns it**, how the work is split into Work Items, and in what order. These are settled with the owner in Execution Preparation.
- **The current direction, not a decision:** these are called *shared components*. Where each one lives, whether `shared/`, a feature or the page, is decided per capability by analysis against the zone rules (§6), and may change.
- **What stays the same:** the zone rules and the existing platform contracts. Where a capability needs a decision those rules do not already give, the decision is proposed and approved first.

---

## 2 · Capabilities required

### 2.1 · Data

- **One data layer** the features share. When one feature changes something (a like, a comment, a follow, an edit, a deletion), every place showing it is refreshed without the features knowing about each other.
- **Progressive lists:** loading the next part of a list as the reader reaches it, with loading, end and failure states the page can show.
- **Immediate feedback** for the reader's own actions, which settles correctly when the server answers or refuses.

### 2.2 · Media

- **Uploading and showing images for any feature:** the composer, the reply box and the profile alike. This includes progress, failure, retry and refusal.
- A posted image's **description** travels with it wherever it is shown.

### 2.3 · Language and formats

- **Times:** relative time for lists, and full date and time for a single post, in both languages.
- **Counts:** compact counts (thousands and beyond) in both languages, with Arabic plural forms, and Western digits throughout.
- **Words:** every new area's words in both catalogues. Arabic is reviewed during implementation.

### 2.4 · Rules shared with the backend

- **One definition of a character**, and the limits for posts, comments and replies.
- **Image rules:** how many, which types, how large.
- **The hashtag and mention rules**, and the username rule they rely on.

Both tiers state each rule the same way, so the frontend never accepts what the backend refuses, or links what the backend cannot find.

### 2.5 · Presentation of shared product nouns

Parts that know the product, and that more than one feature shows:
- **a user's avatar**, with its fallback;
- **a user's identity:** the name falling back to the username, with the @username kept left to right;
- **a time** that is both readable and machine-readable;
- **a posted image**, and opening it full size;
- **text with links:** web addresses, #hashtags and @mentions made safe and clickable, in either direction.

### 2.6 · Cross-cutting interaction

- **Feedback after an action:** a toast any feature can raise, shown in one place.
- **Sharing a post:** the phone's share sheet, or copying the link with a confirmation.
- **Guest intents:** when a guest tries something that needs an account, the feature can say so and the page shows the one guest prompt.
- **Knowing the reader:** whether they are signed in, and whether something is their own. This exists already.

---

## 3 · Already provided: no change requested

These already exist and serve the features as they are:
- the session and the reader's identity;
- language and theme preferences;
- the word catalogues;
- the navigating element links take;
- error normalisation;
- the brand mark;
- the transport;
- the form engine.

Anything the worker finds missing belongs in §2 and is raised with the owner, not assumed.

---

## 4 · Decisions to settle in Execution Preparation

Each is settled with the owner before the capability it affects is built:
- **where each capability lives and who owns it** (§1), including whether product presentation (§2.5) earns a home in `shared/`. That would amend what the zones admit, so it would need an ADR;
- whether **media** becomes a platform capability of its own ([Finding 0030](../architecture/findings/open/0030-the-capabilities-predate-the-structure-they-share.md));
- the **data layer**: its shape, its documentation ([#272](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/272)), and the transport's two base addresses ([#240](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/240));
- **compact counts**, which change the localisation contract (it states counts as whole and ungrouped);
- **where shared rules are held**: mirrored by hand on each tier, or a cross-tier package ([ADR 0013](../architecture/decisions/0013-applications-and-cross-tier-packages.md); [Finding 0026](../architecture/findings/open/0026-no-tier-owns-the-credential-rules.md)). Both tiers' rules follow the backend's decisions, such as what a character is;
- how **guest intents** and **toasts** reach the page without a feature depending on it;
- **bringing a guest back** after signing in, and keeping that return address safe ([#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739));
- when the **frontend integration lane** is built, now that real wire shapes are consumed ([ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md)).

---

## 5 · Out of scope

- **Settings** (deferred, [#796](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/796)), and any capability only Settings needs.
- **Presentation language**: that is the [Design System plan](design-system-plan.md)'s.
- **Product features** and **page composition**: the features and pages tracks.
- **Anything used by one feature only**, which stays with that feature until a second one needs it.

---

## 6 · References

Read the architecture before starting. Read the others when the question they answer comes up.

### Architecture and contracts (settled; never reopened here)

| Document | What it answers | Read when |
|---|---|---|
| [ADR 0018](../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) | The four zones, and what each may hold and import. Decision 5 lists what `shared/` admits. | Before deciding where any capability lives. |
| [ADR 0019](../architecture/decisions/0019-authentication-is-a-feature-and-the-session-is-platform.md) | Decision 6 is the criterion for a **platform capability**; it amends ADR 0018. | Deciding whether media, or anything else, is platform. |
| [ADR 0013](../architecture/decisions/0013-applications-and-cross-tier-packages.md) | Applications, and the cross-tier packages layer. | Deciding where shared rules are held (§2.4). |
| [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md) and [Media (backend)](../backend/media.md) | How media is uploaded, referenced and served. | Any media capability (§2.2). |
| [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) and the [testing topology](../development/testing-topology.md) | Which lane proves what, including the frontend integration lane (adopted, not built). | Planning how a capability is proven. |
| [Frontend architecture](../frontend/architecture.md) | The dependency rule, the page-group contract, the capability structure, and **the platform index** of what `shared/` holds today. | First read. Before adding anything to the platform. |
| [API client](../frontend/api-client.md) | The transport, both stacks, and base address configuration. | The data layer (§2.1). |
| [Error handling](../frontend/error-handling.md) | The one typed error, and how refusals are normalised. | Failure states, and feedback after an action. |
| [Forms](../frontend/forms.md) | The schema-driven form engine. | Any capability that validates input. |
| [Localisation](../frontend/localisation.md) | The reader's language, the catalogues, writing numbers, and approving a language's words. | Formats and words (§2.3). |
| [Design System README](../frontend/design-system/README.md) | Where presentation language ends and product presentation begins. | Product presentation (§2.5). |
| [API contract](../api/api-contract.md) | The payloads the data layer consumes, including errors and pagination. | Any capability that reads or writes server data. |

### Open questions on record

| Source | What it holds | Read when |
|---|---|---|
| [Finding 0030](../architecture/findings/open/0030-the-capabilities-predate-the-structure-they-share.md) | Capabilities that predate the structure they share, including where media belongs. | Media (§2.2). |
| [Finding 0026](../architecture/findings/open/0026-no-tier-owns-the-credential-rules.md) | No tier owns the credential rules. | Shared rules (§2.4). |
| [#272](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/272) and [#240](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/240) | The data layer's deferred document, and the two base addresses. | The data layer (§2.1). |
| [#739](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/739) | Route literals inside capability screens, and the guest's return address. | Guest intents (§2.6). |
| [#775](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/775) | Text safety, shared with the backend. | Text with links (§2.5). |

### Approved decisions and designs

Sources marked *local* are working material in `.project/`, outside the repository. They are available to this effort's workers, not to other readers.

| Source | What it holds | Read when |
|---|---|---|
| [Approved designs](https://claude.ai/artifact/LFz7oGKfFJbRNumTZzBAtY) (Claude Design canvas) | The **Feed**, **Tweet details**, **Profile** and **Shared pieces** pages (all approved). Each carries an **ownership board**: the zone the design expects to own each part. That is a starting point for §4, not a decision. **Feed · v2** is still under review: until it is approved, the approved Feed governs. | Building any capability that shows something. |
| Feed design brief (local: `.project/feed-design/design-brief.md`) and Profile and Tweet details brief (local: `.project/feed-design/profile-tweet-details-brief.md`) | The approved product and design decisions, with who approved each. | When a behaviour needs its reason. |
| Feed implementation analysis (local: `.project/feed-design/feed-implementation-analysis.md`), §2 | The first inventory of shared needs, and the options for product presentation. | Starting the track, and settling §4. It predates the Tweet details and Profile designs, which add text with links, the image viewer, toasts and guest intents. |
| [Backend plan](backend-plan.md) and [Design System plan](design-system-plan.md) | What the backend will provide and what the Design System will provide. | Before relying on either. |
