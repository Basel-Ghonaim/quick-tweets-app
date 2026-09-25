# Glossary

> **Status:** Active.
> **Authority:** The canonical source for the project's **domain vocabulary** — the product terms used across the code and documentation. Mechanism, process, and governance terms are owned by their documents and linked here, never redefined.
> **Scope:** What the project's core nouns mean. A vocabulary reference, not a specification.
> **Version:** 1.1
> **Last Updated:** 2026-09-25
> **Owner:** Basel Ghonaim

## Domain vocabulary

| Term | Meaning |
|---|---|
| **User** | An account — a unique `username`, a display `name`, an email, and an optional profile image and bio. The root entity that owns all others. |
| **Tweet** | A short post authored by a user, at most 280 characters. The central unit of content. |
| **Comment** | A reply to a tweet, or to a comment on it, at most 280 characters. Belongs to exactly one tweet and one author, and — when it is a reply — to exactly one top-level comment. A reply cannot itself be answered: the thread is two levels. |
| **Like** | A user's mark of approval on a tweet, or on a comment. Each user–item pair is unique, so a reader likes a thing at most once. Liking is **set and cleared, not toggled**: repeating either cannot reverse what the reader intended. |
| **Follow** | A one-directional relationship from a *follower* to a *followed* user. Follows together form the **social graph**. |
| **Feed** | The global list of all tweets in reverse-chronological order (newest first). |
| **Author timeline** | The slice of the feed authored by a single user — "that user's tweets". |
| **Profile** | A user's public page: their identity together with aggregate counts (tweets, likes received, followers, following). |
| **Author** | The user who created a tweet or comment, surfaced as a lightweight snapshot (id, username, name, profile image). |
| **Session** | An authenticated period of access for one device, established at login and renewable without re-entering credentials. |
| **Hashtag** | A word marked with `#` in a tweet's text, such as `#القراءة` or `#WebDev`, in any script. Two hashtags written differently can be the same one: case, and some Arabic spelling variation, do not tell them apart. What makes a hashtag, and when two are the same, is the [API contract](../api/api-contract.md#hashtags)'s. |
| **Trend** | A hashtag many tweets used in the last week: one of the few the product shows as what is being talked about now, with how many tweets used it. |
| **Guest** | An unauthenticated visitor. A guest may read public content but has no user-relative state. |

## Terms owned elsewhere

These appear across the project but are defined and owned by other documents — consult them rather than redefining the terms here:

- **Access token, refresh token, JWT, rate limiting** — authentication mechanisms; see the [API contract](../api/api-contract.md) and [Backend Security](../backend/security.md).
- **Response wrapper, cursor / offset pagination, error type, `AuthorEmbed`** — wire-level shapes; owned by the [API contract](../api/api-contract.md).
- **Language, catalogue, direction** — the reader's interface language, the words served for it, and the reading direction that follows it; owned by [Frontend Localisation](../frontend/localisation.md).
- **Work Item, branch, Pull Request, Definition of Done / Accepted** — execution process; owned by the [Engineering Execution Standard](../development/engineering-execution-standard.md).
- **ADR, Finding, platform vs. feature document, one-owner-per-fact** — documentation governance; owned by the [Documentation Strategy](../architecture/documentation-strategy.md).

---

> This glossary owns the project's domain vocabulary. Mechanism, process, and governance terms are defined once in their owning documents and linked from here — never duplicated.
