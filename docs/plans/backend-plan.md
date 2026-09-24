# Backend — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-24
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
  - **Per account**, not per network address: an edit is always signed in, and an account's limit cannot be escaped by changing address.
  - **10 edits per hour**, counting **every edit request**, held **in memory** like every other limiter.
  - **Posts only.** Editing a comment stays under the general limit alone.
  - **Its own error type**, not the general limit's, because the design words the two differently: *too many edits* and *too fast*.
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
  - **Chosen from the people followed by the accounts the reader follows**, ranked by how many of them follow each. Where that runs short, **the most-followed accounts** fill the list. The order is **the same on every request**: where two rank equally, the one with **more followers** comes first, then the **newest account**, since a new account with no followers is likelier to be active than an old one that never gained any.
  - **A guest** sees the most-followed accounts.
  - **Every account may be suggested**, apart from those excluded above.
  - **A bounded list, not paged:** 3 in the sidebar, and up to 20 behind "Show more".

### 2.5 · Discovery

- **Search:** find posts, including by hashtag, in **Arabic and English** alike.
  - **Posts only**, **newest first**. Guests can search too.
  - A query that begins with `#` finds **that hashtag exactly**.
  - Any other query matches **whole words, and longer words that begin with one**, on the database's built-in text search, with no extension and no stemming. So `كتاب` finds `كتابة` but not `الكتاب`: the cost of a search that needs no extension.
- **Trending:** a short list of current terms, each with how many posts mention it. Guests can see it too.
  - A term is **a hashtag**. Plain words and phrases do not trend.
  - Counted over **the last 7 days**, by **distinct posts**, and ranked by that count. Comments and replies do not count.
  - A hashtag appears once **at least 2 posts** used it. The list holds **at most 5**, and is empty when none qualifies.
- **Hashtags** mean the same thing everywhere: the text that links them, the search that finds them and the trend that counts them all follow **one shared rule**, in any script.
  - Two hashtags are the same when they match **ignoring case**, after the text is normalised (§2.7), with the Arabic alef forms (أ إ آ ٱ) read as ا, and diacritics and tatweel ignored. **ة and ه, and ى and ي, stay distinct.**
  - Where one hashtag is written several ways, **the spelling used most** in the window is the one shown.
- **Mentions** follow the username rule, so a mention links exactly what could be a username. They are **not checked against real accounts**: an unknown name simply leads to a profile that is not found, which is what these designs need and all they need.

### 2.6 · Images

- **Images carry no description.** Image descriptions are **not supported** (§5):
  - there is no description in the API, in the schema, or on the media object;
  - no validation or length limit applies to one;
  - none takes part in the **"Edited"** marker (§2.1) or in counting characters (§2.7).
- The approved design draws a description field. **That does not make it a backend capability.**

### 2.7 · Text

- **One definition of a character**, shared by the frontend and the backend, so a post the counter accepts is never refused. It binds posts, comments and replies alike.
  - A character is **a Unicode code point**, which is what the approved design's counter counts.
  - Length is measured **after** the text is trimmed, so the limit applies to what is stored. Once text is normalised (below), the order is **normalise, trim, then count**.
  - **It does not bind a display name or a bio.** Theirs count as they always have: UTF-16 units measured before trimming, up to 50 and 160, as the profile form counts them. They are measured on the **normalised** text, so the limit protects what is stored.
- Text is **safe to show among other people's words** in both directions. This is already tracked as [#775](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/775), and settled as follows:
  - **Which text:** post and comment bodies, a display name and a bio, which is the text other readers see. Usernames are ASCII already.
  - **Normalised to NFC** when it is written.
  - **Direction controls refused** when written: the embeddings, overrides and isolates (U+202A–U+202E, U+2066–U+2069). The refusal is a `422` that names the field and never echoes the character. The direction **marks** (U+200E, U+200F, U+061C) are accepted, because Arabic text uses them legitimately.
  - **Text made only of invisible characters**, such as a zero-width space, is treated as empty. **Invisible** means Unicode white space and the default-ignorable characters: joiners, the direction marks, variation selectors and the like. A body or a name made only of them is refused. A bio made only of them is **cleared**, because an empty bio is how a bio is cleared.
  - **At write only, with no backfill.** Rows written before it ships stay as they are: the data is test data, and `v1` has no released consumer.
  - **It lands before the first surface that shows other readers' text.** That is the trigger #775 was recorded with.
- Text made only of spaces is not accepted as content.
  - A space is **what the standard trim removes**: Unicode white space and line ends.
  - **It binds a display name too.** A name of white space alone is refused, not stored empty ([#819](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/819)).
  - Refusing such text tightens what the API accepts, so it is recorded as a **pre-release exception** in the contract when it ships.

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

These product questions shape the capabilities above, and each is settled with the owner before the capability it affects is built.

**None is open.** The owner settled all six on 2026-09-24. Each answer is written once, in the section it binds, and not repeated here:
- what counts as a **character** → §2.7;
- the **edit limit** → §2.1;
- image **descriptions** → §2.6: not supported;
- what a **trend** is → §2.5;
- what **search** covers, and its ranking → §2.5;
- how **suggested accounts** are chosen, and what a guest sees → §2.4.

A question that later work finds open is added here, and leaves when it is settled.

---

## 5 · Out of scope

- **Settings** (deferred, [#796](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/796)), and any backend need that only Settings has.
- **Repost:** its meaning is not yet defined. Nothing is built for it until it is.
- The **search results page** and anything else not yet designed.
- The **Likes tab** on a profile, which is deferred.
- **Image descriptions:** not supported, whatever the design draws (§2.6).
- **Trends made of words or phrases:** a trend is a hashtag (§2.5).
- **Searching people or comments:** search covers posts (§2.5).

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

**Likes on comments and replies, and liking made repeat-safe.** [#805](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/805) · [#807](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/807).

- **Settled.** Liking is **set and cleared, never toggled**, and the guarantee lives in the verb rather than in a payload a client might omit: repeating either call is a no-op, so a double press or a retry cannot reverse what the reader meant. Neither call reads before it writes — the unique pair decides the outcome, so the expected conflict *is* the answer. A comment's likes are their own table, cascading from both sides, which is where a like differs from a comment: it holds no media reference, so nothing outlives the row. **The count is public and the state is personal**, which is why comment reads take an optional reader and a guest reads the same number and always `false`. Comments are the second likeable thing and a shared mechanism was still declined; only the wire shape is stated once.
- **Amended.** None. §2.2 states what must exist and still does.
- **Recorded.** No finding. The one defect found was in the verification harness rather than the product — the collection carries a bearer at its root, so four scenarios whose subject was being unauthenticated inherited a token and passed for the wrong reason; they are fixed and the trap is written into the [runbook](../development/verification/verification-runbook.md). `ICommentRepository.findById` was also found to have no callers, and was left alone rather than removed.

**Follow state wherever a Follow button appears.** [#810](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/810) · [#811](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/811).

- **Settled.** Both directions of the relation resolve from **one shared function** in `shared/social/`, so the profile, both list tabs and a post's author cannot disagree about the same pair — the users module's own one-at-a-time check went with it. **One query for a whole page, never one per row**, and **a guest asks nothing at all**; neither promise is visible in a response, so both are counted rather than reviewed. The server reports **two booleans and no third field**: which of the four states the button draws is the client's to derive, and your own row is recognised from ids. **`AuthorEmbed` was deliberately not widened** — only a post's row draws the button, so a comment's author carries neither field, and that boundary has cases of its own. Nothing here is breaking: fields added and an auth mode widened are additive, so this Work Item needed no pre-release exception.
- **Amended.** §2.5 and §4, by the correction this branch carried as its first commit: whether mentions are checked against real accounts was settled during [#799](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/799)'s preparation, so the answer moved to §2.5 and left the list of open decisions. **§4 now holds six questions, not seven.**
- **Recorded.** No finding. Two notes went to the verification harness rather than the product: folders that upload a fixture need `--working-dir`, which had been documented for one folder and applies to three; and the harness graph is kept asymmetric on purpose, since a mutual pair passes whichever way the two fields are wired.

**"Edited", when the text was actually edited.** [#813](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/813) · [#815](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/815).

- **Settled.** An edit is a change to the **text**, and only to the text — **narrowing both written sources**, which each said *"the text or the image"*: an image added, replaced, removed or reordered leaves no marker, and neither does re-saving the same words. The rule is decided **once, before the media branch**, because that is the only place it could be lost; and `editedAt` is left out of the write rather than set to `null`, so a marker is never taken back. Posts keep `updatedAt` unchanged and comments still carry none. The wire shape is a nullable timestamp rather than the boolean the design needs, so *"edited 2h ago"* would need no second migration.
- **Amended.** None. §2.1 and §2.3 state the capability correctly.
- **Recorded.** No finding, but **a premise was corrected**: `@updatedAt` is Prisma's, maintained client-side rather than by the database, and it does **not** move on an update that carries no field. The Work Item was justified on the claim that a media-only edit moves it, which is false; what is true is sharper — **re-saving identical text moves it while nothing has changed**, so a derived marker would announce an edit that never happened. The schema, the migration, the integration test and a commit message were corrected in the branch. **No backfill**, deliberately: rows edited before this shipped read as never edited, accepted because the data is test data and `v1` has no released consumer.

**The open decisions settled, and image descriptions ruled out.** [#816](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/816) · [#817](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/817).

- **Settled.** All six product decisions, which is what every remaining capability waited on, and #775's open questions with them. The character is a **code point** counted after trimming. The edit limit is **per account**, with its own error type. A trend is a **hashtag**. Search covers **posts, newest first**. Suggestions come from **the people your follows follow**. **Image descriptions are not supported.** This Work Item built nothing: it records where each answer binds, so no capability's preparation has to decide it again.
- **Amended.** §2.1, §2.4, §2.5, §2.6 and §2.7 received the answers, **§4 now holds none**, and §5 gained what they exclude. §2.6 kept its number, because the sibling plans cite §2.6 and §2.7 by number. The Frontend Features and Shared Platform plans each lost the one line that promised a description.
- **Recorded.** [Finding 0041](../architecture/findings/open/0041-the-contract-promises-single-attachment-that-nothing-enforces.md): the contract says a media token must not already be attached elsewhere, and nothing enforces it. A run against the worktree's API attached one object to two tweets, and the ledger kept each use apart. Whether the contract or the check changes is the owner's decision.

**One character rule, counted after trimming.** [#818](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/818) · [#821](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/821).

- **Settled.** A body is **trimmed, then measured in code points**, by **one shared field** in `shared/validation/` that posts and comments both use, as the username rule is shared. The order is the fix for #801: Zod runs a chain's checks in order, so the length used to see the text before it was trimmed. Counting code points is the fix for #802, and it needed **no migration**, because `VarChar(280)` already counts code points; the integration lane shows the columns refuse the 281st on their own. The contract now defines a character once, and refusing white space alone is recorded as a pre-release exception.
- **Amended.** None. §2.7 already stated the rule.
- **Recorded.** [#819](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/819): the display name has the same trim-order defect and is stored as `""` when blank, outside this Work Item's scope. The harness also taught a lesson about itself rather than the product: a combined command-line run needs `mediaOrigin` overridden as well as `baseUrl`, a fresh auth-limiter budget, and per-run users when folder 01 has run before. That is written into the verification-run notes.

**Text safety, and a blank name refused.** [#822](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/822) · [#824](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/824), closing [#775](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/775) and fixing [#819](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/819).

- **Settled.** Text other readers see is **stored in NFC**. A **direction control is refused** with one message that never repeats it. Text made only of **invisible characters counts as empty**, which each field interprets in its own terms: a body and a name are refused, and a bio is cleared. It is **one shared step**, and each field keeps its own rules for emptiness and length. A name's and a bio's lengths still count UTF-16 units before trimming, now **on the normalised text**, which is the one length change the step required. **#819 was fixed in the same Work Item** because making the name safe runs through its broken check; it still has a commit of its own.
- **Amended.** §2.7, by the correction this branch carried as its first commit: the definition of invisible, a bio cleared rather than refused, a name of white space refused, and how a name's and a bio's lengths are measured. Each was settled in this Work Item's preparation.
- **Recorded.** [Finding 0036](../architecture/findings/open/0036-documentation-the-feature-split-found-missing.md)'s clearing-forms gap is **closed**, and the finding stays open for the rest. One lesson was about the tools rather than the product: a `\u` escape typed into a file's content arrives as the raw character, so the first draft of this branch held real bidi controls in its source. They were caught before review, while the mutation proofs were being set up, and every one is now an escape.

**Ten post edits an hour, per account.** [#826](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/826) · [#827](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/827).

- **Settled.** Editing a post has a budget of its own: **ten edits an hour, keyed on the account**. It is the first limiter here not keyed on the address, because an edit is always signed in and moving address must not buy more. It answers **`edit_rate_limit`** with `Retry-After`, so a client can tell too many edits from too many requests. It sits **after authentication and before validation**, so every attempt counts, and it covers **posts only**. It is held in memory like the other eight: an existing mechanism applied once more, with no new dependency.
- **Amended.** None. §2.1 already stated every rule.
- **Recorded.** No finding. Two consequences were written down: the web reads the new type as `too_many_requests` until it recognises it, which the Shared Platform track is asked to do once this merges; and folder 04's fixed user can now meet the limit within an hour, which the runbook explains.

**Suggested accounts: who to follow.** [#831](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/831) · [#832](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/832).

- **Settled.** **`GET /follows/suggestions`**, under `/follows` because `suggestions` is a legal username and `GET /users/:username` would have lost that profile to it. **One SQL ordering** serves the whole list: people the reader's follows follow, ranked by how many of them do, then the most-followed, with ties going to more followers and then the newest account. The reader, anyone they follow, and the viewed profile are never in it, the last by current or former handle. A guest gets the most-followed and asks for no follow state. It is **bounded, not paged** (3 by default, up to 20), and its rows are the follower lists' own shape.
- **Amended.** §2.4, by the correction this branch carried first: how two equally ranked accounts are ordered, which with few follows decides most of what a reader sees.
- **Recorded.** No finding. A test in `mail-delivery` timed out intermittently: its first case paid for a cold import against Vitest's 5 s default, and did so on `main` as well. At the owner's instruction it was fixed here, in a dedicated commit that warms the import once. That fix is outside this Work Item's scope and changes no behaviour. The harness gained three lessons, now in its runbook: the Postman sandbox reserves `data`; following answers `200`; and folder 18 spends half the sign-in budget.
