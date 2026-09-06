# ADR 0017: Recovery Holds Its Position Server-Side, and a Completed Reset Proves the Address

> **Status:** Accepted
> **Date:** 2026-09-06
> **Deciders:** Basel Ghonaim
> **Amends:** [ADR 0016](0016-password-reset-credential-change-authority.md) — Decisions 1 and 7 · [ADR 0009](0009-channel-verification-platform-capability.md) — Decision 2

## Context

Two questions about account recovery, both raised while designing its screens, and neither answerable inside the records that govern it today.

**Where the reader's position lives.** Recovery is three steps, and a reader who reloads must land on the step they reached — able to *finish* it, not merely to look at it. Three carriers were weighed and rejected. A URL per step reintroduces a reader-editable copy of a position, which is the shape this project rejected once already for onboarding. Client-readable storage would hold a live password-change credential. Component state does not survive a reload at all. What remains is a key the **browser** persists and JavaScript cannot read — and admitting one contradicts [ADR 0016](0016-password-reset-credential-change-authority.md) Decision 1, which shaped the capability around a single momentary credential held by the client.

**Whether completing a reset proves the address.** ADR 0016 Decision 7 states that recovery *"never writes verification state"*, and its stated reason is **ownership** — [ADR 0009](0009-channel-verification-platform-capability.md) Decision 2's sole authority — not that the evidence is insufficient. The evidence question was therefore never asked. It should be: producing a code delivered to an address demonstrates control of that address, which is the fact ADR 0009 Decision 2 defines.

**This record decides boundaries and implements nothing.**

## Decision

### 1. Recovery's position is server-held, keyed by a browser-held credential

The capability gains a **reset session**: a server-side record of which step a reader has reached, addressed by an opaque key the browser holds and JavaScript cannot read. The client asks where it is; it never decides.

The key is issued **whenever a code is requested, for every address alike**. Issuing it conditionally would answer, by its presence, the one question the capability refuses to answer.

**This admits the second credential ADR 0016 Decision 1 excluded, and the exclusion is amended rather than overruled.** That decision reasoned from the smallest possible credential surface, which was right on the evidence it had. The requirement that a reload land on a *working* final step is new, and cannot be met inside that boundary.

### 2. The client never holds a password-change credential

Once a code has been confirmed, the code is the session's and is not returned to the client. The final step submits a new password and nothing else; the server reads the credential from the session.

This is the decision's real security gain, and it is what distinguishes the second credential from a mere convenience: the flow ends with **less** exposure than it began with, not more.

### 3. One reset session per browser, and the most recent request wins

Concurrent sessions would need a per-tab key, and every place to put one is excluded by Decision 1's reasoning. Supersession also mirrors the credential's own behaviour, so the session and the code can never disagree about which recovery is live.

### 4. The session's lifetime is the credential's

One clock. A session that outlived what it authorizes would be a position a reader could return to and not be able to leave.

### 5. The session discloses the step and a masked address, and nothing else

Masking happens where the address is held; the unmasked value never crosses the boundary. The step is the answer the client needs, and the mask is what lets a returning reader recognise which address they used without the key becoming a way to read one.

### 6. A completed reset proves the address, and Channel Verification writes it

**The evidence is sufficient, and it becomes sufficient at the moment the reset completes — not before.**

ADR 0009 Decision 2 defines the fact as *"**the account holder** has demonstrated control of a specific channel endpoint."* Confirming a code proves that **whoever holds it** controls the address; it says nothing about whether that person is the account holder. Completing the reset closes the gap: in that act the bearer *becomes* the account holder, while demonstrably controlling the address. Only then is the sentence true in full.

**Channel Verification remains the sole authority.** It is extended to admit a second class of evidence and it owns the rule for what that class requires. Recovery reports what happened and never writes the fact, so one owner still writes it.

**The proof binds the endpoint the code was minted for**, not the account's address at the time of writing. ADR 0009 binds the fact to an endpoint value rather than to "the account's email" abstractly, and an address that changed mid-flow was never demonstrated.

### 7. Recovery reaches Channel Verification through a supplied dependency, never an import

The capability names the collaboration it needs and is handed something that satisfies it at the composition root. Neither module names the other, and the guard already asserting that recovery imports nothing from Channel Verification continues to hold — the same shape the onboarding journey uses for the fact it reads.

### 8. Proving never jeopardises the password change

A failure to record the proof leaves the reset complete. The password change is the act the reader asked for; the proof is a consequence of it, and a consequence must not be able to undo its cause.

## Alternatives considered

- **A URL per step.** *Rejected.* It makes the position reader-editable and requires machinery whose only purpose is to defeat what a URL grants — the shape rejected for onboarding, for the same reason.
- **Client-readable storage for the code.** *Rejected.* It places a live password-change credential where any script on the page can read it, for the whole of its life.
- **Storing only the step, not the credential.** *Rejected.* The final step's action cannot be performed without the credential, so this restores a screen that cannot function. Position and authorization are not separable here.
- **Accepting the restart.** *Rejected by the product.* A reader who leaves and returns would re-request, superseding the code already in their inbox.
- **Recovery writing verification state directly.** *Rejected.* Two writers of one fact is what ADR 0009 Decision 2 exists to prevent, and what it rejected when it declined to keep the bit on the account row.
- **Proving at confirmation rather than completion.** *Rejected.* At that moment there is no account holder in the room, only a bearer who may never return — see Decision 6.
- **Leaving the address unproven.** *Rejected.* It asks a reader to prove something they have just proved, and it makes the recorded fact less true than what the system knows.

## Consequences

- **ADR 0016 Decision 1** admits a second credential; its single-fact ownership is untouched. **Decision 7's** ownership reasoning is preserved and its conclusion is replaced: recovery still writes no verification state, and now causes it to be written by the capability that owns it.
- **ADR 0009 Decision 2** widens: the fact admits a second class of evidence, its sole authority and defeasibility unchanged. The capability publishes one further command; the rule for what the evidence requires stays inside it.
- **Recovery ends with less client-side exposure than before**, which is the trade that justifies the added credential.
- **A reader who never verified may find the verification reminder gone after a reset**, having performed no act they would recognise as verifying. Whether that is announced belongs to the surface that shows the reminder.
- **Every document describing the running system is co-versioned by the work that builds this**, not by this record: those documents state what exists, and none of it does yet.
- Status moves from `Proposed` to `Accepted` **on merge**; its lifecycle thereafter is the [Documentation Strategy](../documentation-strategy.md)'s.

## What this ADR does not decide

- **How any of it is carried** — attribute values, storage shapes, endpoint paths, response bodies, or the name of the published command. Implementation, and settled where it is built.
- **The emailed-link path.** [ADR 0016](0016-password-reset-credential-change-authority.md) left it deferred and nothing here reopens it; it answers re-entry from an inbox, which is a different problem from a reload.
- **What the verification reminder does** when a proof arrives from this route.
- **Whether any other flow may produce the same evidence.** Channel Verification owns that rule, and one caller does not settle it.
