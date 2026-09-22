# Testing Topology

> **Status:** Active.
> **Class:** Contract ([Documentation Strategy §3](../architecture/documentation-strategy.md)).
> **Authority:** The authoritative source for **where a behavior is proven** — the lanes that exist, what each one owns, what each one is forbidden, and the rule that assigns a behavior to exactly one of them. It owns the **placement** of proof and never its **quality**, which is [Engineering Principles §8](engineering-principles.md)'s. The decision that gives it this ownership, and the reasoning behind it, are [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md)'s — cited here, never restated.
> **Scope:** Every lane in this repository, both tiers, automated and manual. It does **not** own any lane's configuration, which is code; nor the [manual verification harness](verification/README.md)'s contents, which that directory owns; nor whether a particular Work Item has proved enough, which is its acceptance criteria's.
> **Version:** 1.8
> **Last Updated:** 2026-09-22
> **Owner:** Basel Ghonaim

## Why placement has an owner

A lane that *can* run a behavior is not thereby the lane that *should* prove it. Without an owner for that distinction, proof settles wherever it happens to be runnable, and the cost is paid by whatever had to change to make it runnable — which in this repository was the production architecture. [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) holds that account and the decisions below; this document is where they are applied.

## What a behavior is

**A behavior is an outcome, attributed to the single unit that decides it. The lane follows the nature of that unit** ([ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) Decision 3).

One visible effect is often **two** behaviors with two owners, and separating them is the first step of every assignment. A refusal a reader meets is *which words are said*, decided by a service, and *that they are announced in an alert region*, decided by the component. Neither lane owns both.

## Which lane owns a behavior

Ask what the answer depends on:

| The answer depends on | Lane |
|---|---|
| its inputs alone | **unit** |
| a renderer's lifecycle — when something runs, how often, what it waits for | **component** |
| what a reader sees or can operate, in a real browser | **browser** |
| what a real server returns | **integration** |
| the system end to end | **E2E**, or the manual harness |

**The tie-breaker:** if you must supply an answerer — something that decides an outcome in the server's place, rather than what the server would send at the network boundary — you are not in the browser lane.

## One behavior, one lane

**A behavior is owned by exactly one lane** ([ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) Decision 4). Another lane may traverse it incidentally; it may not take it as its subject.

**The test:** if this lane's case were deleted, would the behavior still be proven? **Yes** — the case is incidental, and permitted. **No** — this lane owns it, and must be the lane assigned above.

A case whose **only** subject belongs to another lane is **deleted rather than rewritten**, because a case stripped of its subject has nothing left to assert. Counts fall when that happens, and a falling count under this rule is not a regression — but it is named by the Work Item, never discovered by a reviewer. Most cases assert more than one behavior, so apply the test to each of them before reaching for a deletion.

## The lanes

| Lane | Environment | Owns | Forbidden |
|---|---|---|---|
| **Web unit** | node, no DOM | outcomes that depend only on inputs — services, mappers, reducers, models, error maps, and gateway adapters given a fake client; and each capability's boundary fence | rendering; any assertion that depends on elapsed time |
| **Component** | a renderer, no browser | outcomes that depend on a renderer's lifecycle — when a capability is asked, how often, what it waits for; how a component is wired to its hook; interaction that needs no painting | appearance, layout, contrast, and the accessibility tree as computed |
| **Browser** | a real browser | what cannot be true without one — rendered layout, visual state, responsive behavior, contrast, focus as painted, and the accessibility tree as a browser computes it; **and rendering every state of a screen under that check** | knowing that a gateway exists; running or implementing a state machine; standing as the proof of any service's or gateway's behavior |
| **Frontend integration** | node, against a server or a contract artifact | that the wire shapes a gateway expects match what the server returns | capability logic; anything a reader sees |
| **Repository boundaries** | node | the dependency boundaries [ADR 0013](../architecture/decisions/0013-applications-and-cross-tier-packages.md) fixes between applications and packages | anything internal to one application |
| **API unit** | node | backend services, validators and policies, given fakes | a real database |
| **API integration** | node, against a real database | the backend as the database actually behaves | the frontend |
| **Manual harness** | the running system | what no automated lane can reach; owned by [verification/](verification/README.md) | being a gate |
| **E2E** | — | a reader's journey across more than one page group | anything a narrower lane already proves |

**The browser lane is given the answer, never the answerer** ([ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) Decision 5). An *answerer* is anything supplied to a story that decides an outcome: a gateway, a client, a promise whose resolution the story controls to manufacture timing, or an error thrown to stand in for a server's refusal. Values, callbacks that only receive, and presentation settings are answers, and remain permitted. So is what the server would send, given at the network boundary — a response, a refusal carried by its status, or a response withheld.

## Every state is rendered under the accessibility check

**The browser lane renders every state of a screen, because the accessibility check runs on what is rendered and nowhere else.** A *state* is each arm of a conditional render, plus each distinct value of a prop that changes what is announced; a redirect that renders nothing is not one.

This is an obligation on the lane, never an exemption for a case. It decides nothing about where an assertion belongs — a case whose subject is another lane's still moves — and it is satisfied by *a* renderer of each state, never by any particular case. A story that reaches a state and asserts its presence satisfies it; asserting anything further would return the duplication the interaction moves removed.

**Why this lane and not the cheaper one:** the component lane is forbidden the accessibility tree as computed, so a state rendered only there is rendered under no check at all. Three Work Items moved a case correctly and deleted a state's only accessibility proof, which is the failure this rule exists to prevent ([Finding 0031](../architecture/findings/open/0031-the-proofs-predate-the-topology-they-share.md)).

**Every state is rendered in both reading directions.** The lane runs every story twice, left to right and right to left, each under the story's own accessibility mode; a violation that only one direction produces is reported only in that run, and fails it where the story enforces the check. Each run chooses a language as a reader does and stamps the direction that follows it: English left to right, and Arabic right to left, since the application never reads right to left in English. So every screen renders in its run's words, and a story asserts the active language's words rather than one language's. A story that ends in another language or direction fails. That last check guards the lane rather than any outcome a reader meets, and where such a check belongs is [Finding 0032](../architecture/findings/open/0032-a-check-on-lane-infrastructure-has-no-lane.md)'s open question. The commitment to both directions is the [Arabic and RTL plan](../plans/arabic-rtl-support.md)'s D13.

**The check is a tripwire, not a proof.** Per-file **branch**-coverage floors over the screen files, measured on the browser lane's left-to-right run alone, fail when a branch stops being rendered. Coverage does not map to states — it counts closing tags, default parameters and callback bodies — so the floors are a ratchet whose numbers mean nothing on their own, and a green run says that nothing stopped rendering rather than that every state is covered. **What proves a state covered is the mutation: inject a violation inside its branch, run the lane, revert.** The floors ride the browser lane, so they are gated exactly as much as it is, which is not at all.

## Which lanes exist

| Lane | State |
|---|---|
| Web unit · **Component** · Repository boundaries · API unit | **built**, and gated by CI |
| Browser · API integration · Manual harness | **built**, and **not** gated — a green CI run says nothing about them, so a Work Item that could affect one runs it and says so |
| **Frontend integration** | **adopted, not built** ([ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) Decision 7). A behavior belongs to it from today; building it is a Work Item of its own |
| **E2E** | **not adopted.** It becomes warranted when a reader's journey crosses more than one page group and no narrower lane can prove that it connects. That is a condition on the state of the code, not a date, and this is not a prohibition ([Documentation Strategy §8](../architecture/documentation-strategy.md)) |

## What sits outside its lane today

**Nothing does. Both classes this list opened with have reached their lane**, and the list is kept rather than deleted because the rule it carries still binds. **It was closed on the day it was written** ([ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) Decision 8): it is a record of debt, not an exemption. No check was relaxed by an entry appearing here, and **nothing joins it** — a behavior that later finds no lane is a stop, and the Work Item raises it. An entry leaves only by the behavior reaching its lane, which is how both of these left.

| Class | Held by | Belongs to |
|---|---|---|
| ~~**Lifecycle**~~ — how often a capability is asked, what it waits for, and which calls it makes | — | **resolved**: the component lane holds it |
| ~~**Interaction**~~ — typing, clicking, disabled state, and the values that follow | — | **resolved**: the component lane holds it ([Finding 0031](../architecture/findings/open/0031-the-proofs-predate-the-topology-they-share.md)) |

**A case that restates a behavior another lane owns is narrowed, not deleted.** Where a case asserts both — something this lane owns, and alongside it an outcome the owning lane already proves — only the second half is redundant, and removing the case would take the first half with it. Apply the test above to each half separately: a case is deleted only when **every** behavior it asserts survives its deletion. Which cases carry such a half is [Finding 0031](../architecture/findings/open/0031-the-proofs-predate-the-topology-they-share.md)'s to record, and this document does not enumerate it.

## What a lane may never require of production

A testing tool is external, and production adapts to nothing it needs. The four clauses that bind this are [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md) Decision 6's, and the one that decides most cases is the last: **where a lane cannot prove something without a change to production, ask whether that change improves production independently of the test.** If it does not, the behavior is in the wrong lane.

## How a Work Item uses this

**Execution Preparation declares the assignment** — each behavior the Work Item adds, and the lane that will own it — in the same place it declares whether the Work Item is a move or a decision. A misassignment found in preparation costs a sentence; found at review it costs the branch.

Two rules then bind the rest of the lifecycle, and both are the [Engineering Execution Standard](engineering-execution-standard.md)'s:

- its **Definition of Done** requires new behavior covered in the lane that owns it, and coverage in a lane that merely can run the behavior does not meet it;
- its **Stop Rules** make *no lane owns this* a stop — never a reason to use the nearest lane that happens to run.

---

> This document owns **where** a behavior is proven. The decision that gave it that ownership is [ADR 0020](../architecture/decisions/0020-proof-has-a-home-testing-topology.md)'s; **what a good test looks like** is [Engineering Principles §8](engineering-principles.md)'s; **how a Work Item is executed** is the [Engineering Execution Standard](engineering-execution-standard.md)'s; the proof that is not yet in its lane is [Finding 0031](../architecture/findings/open/0031-the-proofs-predate-the-topology-they-share.md)'s — linked here, never duplicated.
