# Backend — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-23
> **Parent Issue:** [#791](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/791)
> **Supersedes:** —

**Start here.** New to the project: [CLAUDE.md](../../CLAUDE.md), then the [agent onboarding guide](../development/agent-onboarding.md). This track is worked under the [Engineering Execution Standard](../development/engineering-execution-standard.md) — nothing in this plan replaces it. §6 holds every reference; §7 records what each Work Item settled.

---

## 1 · Purpose

The approved designs for the **Feed**, **Tweet details** and **Profile** rely on behaviour the backend must provide. This plan states those needs as **capabilities the frontend can consume**. It does not decide how they are built.

- **What this plan owns:** what must exist, and the product rules that behaviour must honour.
- **Who works it:** Worker 2 — the worker whose working tree is the linked one this project calls the **backend worktree** ([setup](../development/setup.md#working-in-a-linked-worktree), which names it and its own database and port). Backend work stays out of the main tree.
- **What it leaves to the worker:** how each capability is designed and built, how the work is split into Work Items, and in what order. These are settled with the owner in Execution Preparation.
- **What stays the same:** the existing engineering rules. Every change to the API's behaviour is published in the [API contract](../api/api-contract.md) in the same pull request, so the frontend builds against what has merged.

**From this plan to merged work.** A capability below is not a Work Item. The route is the Execution Standard's:

1. **Execution Preparation** with the owner: agree the task, decide what one Work Item is, and write its contract — scope and acceptance criteria — into an **Issue** (§3 and §8 there). The detailed analysis in §6 is an input to this step, not a substitute for it.
2. **One branch per Work Item**, cut from the latest `main`, in the **backend worktree** (§4, §5). A linked tree cannot check out the branch the main tree holds, so branch the way [setup](../development/setup.md#branching-from-main-inside-a-linked-worktree) shows.
3. **Atomic Conventional Commits**, and the documentation a change obligates lands in the **same pull request** ([Documentation Strategy](../architecture/documentation-strategy.md) §10).
4. **A pull request** carrying its evidence: what was run, what was not, and the base it was rebased onto (§8).
5. **Human review and merge.** The worker never merges, and never decides an architectural question alone — those are proposed and escalated (§9, §10).
6. **When it merges,** the Work Item gets its entry in §7.

---

## 2 · Capabilities required

### 2.1 · Posts

- **Editing a post stays as it is** (its text and its images, with no time limit); what follows is what must be added to it.
- A post shows **"Edited"** only when it was actually edited, not when anything else about it changed.
- Editing is **protected against abuse**, so it cannot be repeated without limit. When a reader hits that limit, the answer is one the frontend can recognise and explain.
- A post tells a signed-in reader **whether they follow its author**.

### 2.2 · Likes

- **Comments and replies** can be liked and unliked, as posts already can.
- Every likeable item carries its **like count** and **whether the reader liked it**. For a guest, that is always "not liked".
- Liking is **safe to repeat**: a retry or a double press cannot undo what the reader intended.

### 2.3 · Comments and replies

- **Two levels:** a comment on a post, and replies to a comment. A reply to a reply stays at the second level. No deeper nesting.
- A comment's replies are available **separately from the thread**, so they can stay collapsed until asked for, and each comment says **how many replies it has**.
- The thread and each reply list load **progressively, oldest first**. They stay consistent while the reader scrolls, even if comments are added or removed meanwhile.
- A comment, which can already be edited, shows **"Edited"** when it was.
- **Deleting a comment deletes its replies.** Nothing they referenced is left behind.
- A post's **comment count includes replies**.
- A newly written comment or reply is **returned complete**, so it can be shown at once.

### 2.4 · Following and people

- Wherever a Follow button appears, the reader learns both **whether they follow that person** and **whether that person follows them** (for Follow back). This covers a profile, the Followers and Following lists, the suggested accounts and a post's author. For a guest, both are false.
- The **Followers and Following lists** carry what each row's button needs.
- **Suggested accounts ("Who to follow"):** a short list with a way to see more. It never includes the reader, people the reader already follows, or the person whose profile is being viewed.

### 2.5 · Discovery

- **Search:** find posts, including by hashtag, in **Arabic and English** alike. What else is searched, and how results are ranked, is decided before it is built.
- **Trending:** a short list of current terms, each with how many posts mention it. Guests can see it too.
- **Hashtags** mean the same thing everywhere: the text that links them, the search that finds them and the trend that counts them all follow **one shared rule**, in any script.
- **Mentions** follow the username rule, so a mention links exactly what could be a username.

### 2.6 · Images

- Each image attached to a post, comment or reply can have a **description**, written by the author and returned wherever the image is read.
- The description belongs to **that use of the image**, not to the stored file.

### 2.7 · Text

- **One definition of a character**, shared by the frontend and the backend, so a post the counter accepts is never refused. It binds posts, comments and replies alike.
- Text is **safe to show among other people's words** in both directions. This is already tracked as [#775](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/775).
- Text made only of spaces is not accepted as content.

---

## 3 · Already provided: no change requested

These already exist and serve the designs as they are:
- the feed and a user's posts, loaded progressively;
- a single post, including when it no longer exists;
- writing, editing and deleting a post, a comment and a reply to a post;
- liking a post;
- the profile's details and counts;
- following and unfollowing;
- uploading and serving images;
- the signed-in account.

Anything the worker finds missing from these belongs in §2 and is raised with the owner, not assumed.

---

## 4 · Decisions to settle in Execution Preparation

These product questions shape the capabilities above. Each is settled with the owner before the capability it affects is built:
- what counts as a **character**;
- the **edit limit**: whether it applies per account or per network address, and how tight it is;
- the **description** length, and whether one is required;
- what a **trend** is, over what time window, and how trends are ranked;
- what **search** covers beyond posts, and its ranking;
- how **suggested accounts** are chosen, and what a guest sees;
- whether **mentions** are ever checked against real accounts. They need not be for these designs: an unknown name simply leads to a profile that is not found.

---

## 5 · Out of scope

- **Settings** (deferred, [#796](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/796)), and any backend need that only Settings has.
- **Repost:** its meaning is not yet defined. Nothing is built for it until it is.
- The **search results page** and anything else not yet designed.
- The **Likes tab** on a profile, which is deferred.

---

## 6 · References

Read the architecture and the contracts before starting. Read the others when the question they answer comes up.

### Architecture and contracts (settled; never reopened here)

| Document | What it answers | Read when |
|---|---|---|
| [System overview](../architecture/system-overview.md) | How the two applications fit together, and a request's lifecycle. | First read. |
| [API contract](../api/api-contract.md) | Every endpoint, payload, error and pagination shape the frontend consumes. **It changes in the same pull request as the code.** | Any capability that changes behaviour on the wire. |
| [Data model](../architecture/data-model.md) | The entities, their relationships, indexes and deletion rules. | Any capability that changes stored data. |
| [Backend conventions](../backend/conventions.md) | How a module is built on this tier. | Before writing anything. |
| [Setup](../development/setup.md) | Running the two applications, the database, and **working in a linked worktree**: its own environment, its own database and port, and how to branch from `main` inside it. | Before the first branch, and whenever the environment misbehaves. |
| [Backend security](../backend/security.md) | Rate limiting, tokens and abuse control. | The edit limit, and anything a stranger can reach. |
| [Media](../backend/media.md) and [ADR 0005](../architecture/decisions/0005-media-file-upload-architecture.md) | How an image is uploaded, referenced and served, and why a reference is never dropped silently. | Image descriptions, and any deletion that touches media. |
| [Glossary](../project/glossary.md) | What the product's nouns mean. **Comment** ("a reply to a tweet") and **Like** ("on a tweet") both narrow the product this track widens, so both change with it. | Naming anything a reader will see. |
| [Documentation Strategy](../architecture/documentation-strategy.md) | One owner per fact, and which documents a change obligates (§10). | Every Work Item. |
| [Testing topology](../development/testing-topology.md) and [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) | Which lane proves what: answers, not answerers. | Deciding where a capability is proven. |
| [ADR 0013](../architecture/decisions/0013-applications-and-cross-tier-packages.md) | Applications, and the cross-tier packages layer. | Rules the frontend must state the same way (§2.4, §2.7). |
| [Project overview](../project/overview.md) | The product's surfaces, capabilities and committed scope. | Checking that a capability is part of the product. |

### The approved design

| Source | What it holds | Read when |
|---|---|---|
| [Approved designs](https://claude.ai/artifact/LFz7oGKfFJbRNumTZzBAtY) (Claude Design canvas) | The **Feed**, **Tweet details**, **Profile** and **Shared pieces** pages, all approved, with every state in both languages. **Feed · v2** is still under review: until it is approved, the approved Feed governs. | Understanding what a capability is for, and what the interface will do with it. |
| Working analysis, **local** to the effort's worktrees, not tracked: the backend register (`.project/feed-design/backend-changes-profile-tweet-details.md`), the Feed brief (`.project/feed-design/design-brief.md`), the Profile and Tweet details brief (`.project/feed-design/profile-tweet-details-brief.md`) and the Feed analysis §5 (`.project/feed-design/feed-implementation-analysis.md`) | Per-decision detail: what the code does today, what must change, which documents each change obligates, and the questions still open. | Execution Preparation. Whatever a Work Item relies on is written into **its Issue**, which is where that detail becomes tracked and reviewable. |

### The effort

| Source | What it holds | Read when |
|---|---|---|
| [#791](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/791) | This track's parent Issue: its place in the sequence, and its Work Items. | Starting, and whenever the tracker is the question. |
| [Frontend Features plan](frontend-features-plan.md) and [Shared Platform plan](shared-platform-plan.md) | Who consumes these capabilities, and what they expect of them. | Before changing a shape the frontend reads. |
| [Design System plan](design-system-plan.md) and [Pages plan](pages-plan.md) | The rest of the effort. | Context. |

---

## 7 · Execution log

One entry per Work Item, newest last: its Issue and pull request, what it settled, which sections of this plan it amended, and what it recorded. No status lives here — that is the tracker's ([ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md) Decision 3). **When and where an entry is written** is the [plans README](README.md)'s, which owns this convention.

**The comment thread — two levels, cursor pagination, cascading deletion.** [#799](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/799) · [#803](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/803).

- **Settled.** A comment may answer another comment, and the thread stops at two: a parent that is itself a reply is refused rather than re-pointed, so the server never moves a row the caller did not name. A reply is reached through its parent (`?parentId=`) and excluded from the thread list, and **both lists cursor on `id`**. **A reply keeps its `tweetId`** — the invariant that lets a post's comment count cover both levels with no second query. The parent link is **not** a database cascade, for the reason the comment-to-tweet link is not: deletion is coordinated in the application so no media reference is dropped silently. Comments took the shared cursor default, so they no longer carry a pagination default of their own.
- **Amended.** None. §2.3 states what must exist and still does; delivery is the tracker's.
- **Recorded.** [Finding 0038](../architecture/findings/open/0038-offset-pagination-has-no-endpoint-left.md) — moving the thread to a cursor left offset pagination with no endpoint anywhere, and whether the convention survives its last reader is not this Work Item's to decide. [#801](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/801) and [#802](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/802), the two text defects §2.7 and §4 will have to settle together.
