# Backend — Capability Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-22
> **Parent Issue:** [#791](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/791)
> **Supersedes:** —

---

## 1 · Purpose

The approved designs for the **Feed**, **Tweet details** and **Profile** rely on behaviour the backend must provide. This plan states those needs as **capabilities the frontend can consume**. It does not decide how they are built.

- **What this plan owns:** what must exist, and the product rules that behaviour must honour.
- **Who works it:** Worker 2, in the dedicated backend worktree.
- **What it leaves to the worker:** how each capability is designed and built, how the work is split into Work Items, and in what order. These are settled with the owner in Execution Preparation.
- **What stays the same:** the existing engineering rules. Every change to the API's behaviour is published in the [API contract](../api/api-contract.md) in the same pull request, so the frontend builds against what has merged.

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
