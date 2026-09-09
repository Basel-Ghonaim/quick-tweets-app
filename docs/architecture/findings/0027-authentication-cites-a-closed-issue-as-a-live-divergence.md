# Finding 0027: The authentication document cites a closed issue as a live divergence

> **Status:** Open
> **Date:** 2026-09-09
> **Affected areas:** [`docs/features/authentication/authentication.md`](../../features/authentication/authentication.md) — the *Configuration, not code, for forms* entry
> **Reported by:** Basel Ghonaim (surfaced while comparing the rules against the contract, [#683](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/683))

## Observation

The feature document states that *"the current pre-check rules drift from the contract in places — tracked in [#263](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/263)."*

**They do not, and #263 is closed.** The issue was resolved on 2026-07-09, and the rules were compared against the server line by line while moving them: password 8–72 with `[a-z]`, `[A-Z]`, `[0-9]` and `[@$!%*?&#]`; username 4–20 matching `^[a-z0-9_]+$`. Identical on both tiers.

## Why it matters more than an ordinary stale sentence

A **Description** asserts that something exists and behaves as stated ([Documentation Strategy §3](../documentation-strategy.md)), and this document is one. The sentence asserts a live defect. A reader deciding whether to trust the client-side pre-check is told it is known to be wrong, and it is not — so the document understates the system it describes, and points at a closed issue for the detail.

It also hides the real problem. What is actually wrong with these rules is that **no tier owns them** ([Finding 0026](0026-no-tier-owns-the-credential-rules.md)) — a structural weakness the values' current agreement conceals. A sentence reporting a drift that has been fixed occupies the place where that would be said.

## Why it is not fixed here

The Work Item that surfaced it moves files between zones. Correcting a feature document's account of its own validators is that document's own co-versioning, not a move's, and the frontend zone migration defers documentation to its final phase by design.

## Not decided here

What the sentence becomes — whether it simply drops, or is replaced by a pointer to [Finding 0026](0026-no-tier-owns-the-credential-rules.md). A finding records the deviation; it never schedules the fix.
