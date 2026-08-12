# ADR 0013: Applications and a Cross-Tier Packages Layer in a Single Workspace

> **Status:** Accepted
> **Date:** 2026-08-12
> **Deciders:** Basel Ghonaim
> **Supersedes:** [ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md)

## Context

The project is two independent applications — a web client and an HTTP API — but the repository does not say so. The root manifest is simultaneously the repository's manifest and the web application's: the web therefore holds a structural primacy the architecture no longer justifies, repository-level concerns sit as siblings of one application's source, and the other application reads as a subdirectory rather than a peer.

Certain deterministic facts are defined on both tiers and reconciled by hand, which drifts. Housing them requires a layer that is a peer of the applications rather than a guest inside one — and no such position exists, because the position that would host it is occupied by the web application.

[ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md) decided the *boundary* for such a layer while assuming the repository would remain two independent projects. That assumption is what this decision changes; the boundary rules it established remain sound and are carried forward.

## Decision

**Structure.** Applications live under `apps/` — `apps/web` and `apps/api`. Cross-tier packages live under `packages/`. Applications and packages are members of **one workspace**.

**The root is orchestration only.** It is `private`, carries **no runtime dependencies**, and owns workspace configuration and scripts — never product code.

**Dependency direction is fixed and total.** An application may depend on packages; **no application depends on another**, in either direction; and a package depends on **no application**, by manifest or by path.

**A package carries no runtime dependencies of any kind** — neither external nor another package. Development-only tooling is permitted: it neither ships nor enters a consumer's graph. A dependency between packages is therefore excluded at runtime by construction, and is not admitted in any other form either. Where one appears necessary, that is evidence of a single ownership category, or of a concept belonging somewhere neither package sits; admitting one is a decision taken at that time, requiring an acyclic and declared justification.

**These boundaries are mechanically enforced.** A rule that only documentation asserts is not a boundary.

**Ownership of a package sits at the platform level**, not with either application. A package that a tier owns is that tier's module which the other tier happens to read — the dependency graph would still point correctly while the decision flowed backwards.

**A package never originates a fact.** It re-presents a fact whose owner is already documented, and it names that owner. Where no document owns the fact, the package is not created until one does.

**Packages are consumed as compiled output**, produced through TypeScript project references, so a consumer never depends on its host interpreter's ability to execute uncompiled sources.

**The applications share a single TypeScript version.**

**Carried forward from [ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md)**, unchanged in substance: one ownership category per package; no generic catch-all package; and only deterministic definitions are shared — never execution, framework code, or presentation text.

## Alternatives considered

- **Keep the current shape and add a packages layer beside it.** Rejected: it leaves one application acting as the repository and gives the package layer no peer position, which is the defect this decision exists to remove.
- **Keep the applications as separate projects, with the package layer linked by path.** Rejected: once the applications are peers, treating one as a workspace member and the other as an outsider re-creates the structural privilege being removed, while forfeiting the single dependency graph and paying the same restructuring cost.
- **Consume packages as source rather than compiled output.** Rejected: an application's runtime would depend on its host interpreter's ability to execute TypeScript, and every package would be permanently constrained to erasable syntax. The resulting failure appears at runtime, not at build.
- **Distinguish package distribution by content — source for some, compiled for others.** Rejected: a package changes category the moment it gains a runtime value, silently migrating its distribution model.
- **Publish packages to a registry.** Rejected: the versioning and publication overhead is not warranted by the boundary this decision draws. It remains available should an application ever need to deploy independently of the repository.
- **Allow the applications to diverge on compiler version.** Rejected: within one dependency graph, which compiler a given tool resolves becomes ambiguous.

## Consequences

- **One dependency graph, one lockfile.** Orchestration, tooling, and continuous integration each address named units instead of a root, a subdirectory, and nothing.
- **The previous isolation between the tiers was physical and is now gone.** Their dependencies could not reach each other because they were installed separately — an accident of topology, not a control. Under one graph that accident disappears, which is precisely why the dependency boundaries must be enforced mechanically rather than trusted.
- **A single graph couples the upgrade cadence of shared development tooling** across both applications.
- **Compiled packages introduce a build before type-checking.** Ordering follows the reference graph rather than external sequencing.
- **A further unit can be added as a directory** rather than as a restructure.
- Migration touches configuration, continuous integration, and documentation. Those are implementation concerns and are not part of this decision.

## Migration invariants

Two constraints on the transition itself. Both are recorded here because violating either causes damage that is silent and expensive to reverse; neither prescribes how the migration is carried out.

1. **History must survive the move.** Relocating application sources is recorded as **moves**, never as deletions paired with additions, so file history remains traceable through the change. Correspondingly, the historical record in ADRs and findings is **not rewritten** because paths changed — those documents cite evidence as it stood when observed, and a dated mapping note preserves navigability without editing the record.

2. **Ignore rules must move with the directories they guard.** Rules anchored to an application's former path — in particular those covering environment files, secrets, and generated output — are re-anchored **in the same change that moves the directory**. Nothing fails when this is missed: a previously ignored sensitive file simply becomes eligible to commit.

## Relationship to ADR 0003

On acceptance of this decision, **[ADR 0003](0003-cross-tier-shared-facts-leaf-packages.md) becomes `Superseded`** and this ADR is the current architectural reference for the repository's structure and its cross-tier package layer. ADR 0003's record is preserved unchanged apart from its status and a forward link; the principles that remain valid are named in the Decision above rather than restated there.

Status moves from `Proposed` to `Accepted` **on merge**. Its lifecycle thereafter — revisable in place while the project is a `Foundation`, immutable once `Stable`, and superseded outright when the decision itself changes — is the [Documentation Strategy](../documentation-strategy.md)'s, not restated here.
