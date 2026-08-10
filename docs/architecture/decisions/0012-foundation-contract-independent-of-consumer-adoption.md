# ADR 0012: A Foundation Contract Documented Independently of Consumer Adoption

> **Status:** Proposed
> **Date:** 2026-08-10
> **Deciders:** Basel Ghonaim
> **Amends:** [Documentation Strategy](../documentation-strategy.md) §4 and §11.6

## Context

The Design System's platform document was written as a description of the layer's current state, and says so in its own header: *"describes the currently implemented design-system conventions… covers only what exists today."* Everything below inherits that framing, and the consequences are measurable rather than theoretical.

The document names the components that consume a rule (*"Button, Input and Checkbox map 1:1 today; FileInput inherits `size` and does not vary its text at all"*), counts adoption (*"currently applied in one component"*), justifies a present rule with an unbuilt component, and enumerates the checks. Each of those changes when a consumer changes.

Two failures make the cost concrete. A statement about the transition scale became false **one Work Item after it was written**, when that family moved to `legacy/`. And the check enumeration was never updated when two checks were added — the list is prose, so nothing enforced it.

There is also a self-contradiction: the document's authority line forbids documenting individual components, while a later section documents one component's colour table and defaults.

The underlying error is a category one. **A description of current state and a contract are different artifacts**, and the "document only what exists" discipline — correct for a feature document, where speculative documentation is the risk — inverts when applied to a foundation whose whole purpose is to be adopted later. [ADR 0010](0010-design-system-platform-reestablishment.md) Decision 2 already holds that the Design System **precedes its consumers**; the documentation contradicted the architecture it describes.

## Decision

**The Design System's documentation is a contract, structured so that consumer adoption cannot invalidate it.**

1. **Foundation stability is independent of consumer adoption.** Three dimensions are distinct and only the first is the Design System's: **Foundation completeness** — every question in the language's domain has a decided answer; **consumer adoption** — how many components, features or pages bind it; **product completeness**. A Foundation with settled rules is stable at zero adoption.

2. **The contract test.** Adding a component, a token member, or a feature must require **no edit to a contract document**. If it does, the document is describing adoption rather than defining a contract. A new token *family*, or a change to an existing family's architectural meaning, legitimately does require an edit — that is the language changing.

3. **Token families are documented at family level.** The contract explains what a tier is, how a consumer reasons about primitive versus semantic versus local, and what each family means. It **does not enumerate members and does not name consumers**. Illustration uses family patterns, never individual tokens, so that adding a member changes nothing.

4. **One fact, one canonical owner, and executable sources outrank prose.** TypeScript owns props, types and variants; Storybook owns rendered visual and interactive behaviour; the checks own mechanical enforcement; ADRs own *why*; documentation owns the architectural contract and the authoring conventions. **Documentation links to an executable owner and never mirrors it** — a mirror has no enforcement and drifts silently, which is how the check list went stale.

5. **The ADR boundary.** An ADR holds the decision, its rationale, the alternatives and the limits. The Foundation states the **operative rule** in concise form and cites the ADR. It must not reproduce the reasoning. This matters while ADRs remain revisable in place: several hold operative rules, and a paraphrase in two places is two places to drift.

6. **Usage documentation lives with its owner.** Guidance for using one component belongs beside that component; guidance for how a feature or page composes the system belongs beside the module that owns it. Such a document is **earned by need**, never created by default: if types, Storybook, source comments and the shared conventions are sufficient, no document is warranted.

### Consequent amendments to the Documentation Strategy

7. **§11.6 — indexing may be delegated one hop.** The principle is discoverability, not enumeration. A document may be reached through **one designated index** rather than listed directly in `docs/README.md`, provided that index is itself classified there. Without this, the index grows with the component count and becomes the directory listing §4 forbids.

8. **§4 — the code-adjacent exemption admits a navigation index.** The exemption exists so usage guidance may sit beside its code without becoming a competing authority. A **map that states no rules** is the least authoritative document there is, and the rule's letter was narrower than its principle. It remains bound by the other conditions: no contract material, and reachable from `docs/README.md`.

**§4's prohibition on directory-tree documents is unchanged and now constrains the map**: it is expressed as *question → owner*, never as paths, because the repository is the source of truth for structure.

## Alternatives considered

- **Fix the sentences, keep one document.** Rejected: it treats the symptom. The header defines the document as a state description, and the same coupling would return with the next Work Item — as it did twice already.
- **A larger tree (`foundation/`, `architecture/`, `components/`, `usage/`).** Rejected: `architecture/` and `usage/` would own the same facts — four of one section's bullets restated the other's — designing a one-owner violation into the structure. And per-family Foundation files would orphan the cross-family rules that are most of the contract.
- **Per-component documents with props and variants.** Rejected: TypeScript and Storybook own those authoritatively and executably; a markdown mirror is a second home with no enforcement.
- **Leave indexing as it is.** Rejected: it does not scale past a handful of code-adjacent documents, and the alternative — refusing them — loses the drift resistance of keeping usage beside its code.

## Consequences

- `design-system.md` is replaced by `docs/frontend/design-system/{README.md, foundation.md, components.md}`, with a navigation map at `src/shared/design-system/README.md`.
- The Documentation Strategy gains two amendments; its structure rules and its Stable-Core rule are otherwise unchanged and continue to govern when a further document is earned.
- **Some content is deleted rather than moved**: consumer-state sentences, adoption counts, the check enumeration, a restatement of the Engineering Principles, and a component's internals whose rationale already lives in the code.
- The contract becomes testable. A reviewer can ask whether a change was forced by the language or merely by a new consumer, and the second is a defect.
- Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
