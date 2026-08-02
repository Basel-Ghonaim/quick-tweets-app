# Design System Re-establishment — Execution Plan

> **Status:** Active
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-08-02
> **Parent Issue:** [#414](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/414)
> **Supersedes:** —

This plan sequences the re-establishment of the **Design System** into ten independently reviewable Work Items. Its architecture is **closed** — recorded in [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) (Accepted), which owns the boundary, ownership, and invariants, and which this plan never reopens.

It is a **strategy document**: it owns the effort's **execution order, boundaries, invariants, and the rationale for that order**. Each Work Item's granular acceptance criteria, live status, and progress belong to its Issue (created when that Work Item begins), which this plan links and never mirrors — per [Documentation Strategy §5](../architecture/documentation-strategy.md) and [ADR 0006](../architecture/decisions/0006-execution-plans-home-and-lifecycle.md).

**Why the sequence is justified, not just listed.** Each Work Item below states **why it precedes the next**, **which architectural boundary or assumption it validates**, and **which invariant it protects**. That is deliberate: the ADR explains *why the Design System exists and what it owns*; this plan must explain *why it is rebuilt in this order*, so the sequence can be executed without rediscovering the design.

## 1. Purpose & goals

- Rebuild the Design System to the architecture the project has evolved toward, replacing an **early bootstrap** written before the project had its ADRs, ownership rules, or platform-vs-feature model.
- Make the presentation language **enforceable rather than merely stated**: the binding rule, key parity, the owned focus indicator, and contrast become mechanically checkable instead of conventions.
- Retire the bootstrap-era drift **by construction** — undefined token references, a light/dark key mismatch, a global stylesheet that bypasses tokens, an unreachable theme, primitive-direct and hardcoded consumption, and per-component focus duplication.
- Reach **Stable** (§3.3) — the point at which the pages currently deferred can adopt the language without another foundational rebuild.

## 2. Boundary declaration

**Covers:** the token tiers and the colour vocabulary; the theme contract, its resolution, and the mechanism that makes a theme switchable; the migration of every existing Design System component and of the one feature module that consumes tokens; the icon set's hardcoded palette; the conformance of the remaining token types to the tier model; the retirement of the legacy token set; and the rewrite of the platform document.

**Does not cover (out of scope; unchanged):** any **visual redesign** or design language — there is no approved UI/UX, and none is invented here; **new components** (no Toast, Modal, Tooltip, Dropdown or selectable list); a **visual-regression system**; **product pages** (Feed, Profile); the **product-semantic layer** (engagement colours such as like / repost / quote); **localization data** (locale, strings, formatting); **theme selection policy** (system preference, persistence, startup); and bringing the Storybook browser run into CI.

## 3. Pinned constraints (binding on every Work Item)

### 3.1 Architectural invariants

Each Work Item cites the invariants it protects by identifier. Those marked ✅ are mechanically verifiable.

- **I1 — Binding rule.** A consumer binds only to **semantic** tokens (or its own component tokens derived from them) — never primitives, never hardcoded values. ✅
- **I2 — Key parity.** Every theme defines the **same** set of semantic keys; a theme is a complete resolution, never a partial override. ✅
- **I3 — Theme transparency.** Components know nothing about themes and never branch on them. ✅
- **I4 — Responsibility purity.** Each semantic token carries **one** responsibility, and is never collapsed with another merely because two current themes render them identically.
- **I5 — Accessibility is owned.** AA contrast for guaranteed relationships, and a **single owned focus indicator**, in **every** theme.
- **I6 — Direction-agnostic authoring.** Logical properties throughout; the Design System honours the native `dir` contract and owns no locale data. ✅
- **I7 — Language, not composition.** The Design System owns the responsive language and its own primitives' adaptivity; consumers own page layout.
- **I8 — Platform boundary.** The Design System imports no feature, and product-domain semantics never enter its semantic set. ✅
- **I9 — Selection is app policy.** The Design System defines the theme contract and performs the resolution; selection and persistence live in the application.

**Cross-cutting obligations.** **I5**, **I6** and **I7** are honoured *inside every component-migration Work Item* (4, 5, 6, 8) rather than deferred to a Work Item of their own. Direction-agnosticism in particular is free at authoring time and prohibitively expensive to retrofit, so no component is migrated with physical properties.

### 3.2 Settled decisions

- **D1 — Colour first.** Not because colour is the most important token family, but because it is the **best validator of the architecture**: it is the type most coupled to theming, so it exercises semantic resolution, theme resolution and key parity before any other family. It also carries every verified bug and the worst drift. The architecture itself remains **token-type agnostic** (ADR 0010 Decision 3) — this is a sequencing choice, not an architectural one.
- **D2 — Storybook is the verification environment.** It is to the Design System what the manual harness is to the backend. **No visual-regression system is introduced in this effort.**
- **D3 — Accessibility gate.** The a11y addon stays **reporting-only** until the first component migration, then is promoted to failing. Stated honestly: the Storybook run is **not in CI**, so this is a **local** gate, not an enforced one. Bringing that run into CI is its own effort and is out of scope (§2).
- **D4 — The Design System defines the theme contract; the application implements it.** The contract is **typed** — the Design System exports the theme-name union and the attribute contract, so a consumer cannot drift from the theme set the Design System actually resolves. **Theming stays pure CSS**: the resolution needs no framework, and no theme provider is ever added *inside* the Design System.
- **D5 — Ambient signals and capabilities are not the same pattern.** Theme and direction are **signals that flow application → Design System** (it reacts; the app supplies). Toast and modal would be **capabilities that flow Design System → application**. The React plumbing looks alike, but the ownership is opposite; conflating them invites putting capability policy in the platform or theme resolution in the app. Neither Toast nor Modal is built here.
- **D6 — Direction rides the native contract.** `dir` is a platform attribute and logical properties honour it automatically; the Design System invents **no** direction API. Its obligation is authoring discipline, not a surface.
- **D7 — Auth is a mechanical token-swap, never a redesign.** The current Auth implementation is a **prototype**, not a design reference and not a source of the design language. It is migrated to preserve its present appearance, purely to stop it pinning the legacy set. Where its hardcoded brand values have no semantic home, they stay **local to the Auth module** as consumer-owned composition; they are **not** promoted into the Design System's semantic set.
- **D8 — The vocabulary is scoped to what the components exercise.** The four existing components constrain the **interaction** vocabulary — roles, emphasis steps, states, focus, validity, and the surfaces and borders controls need. They do not exercise a **compositional** vocabulary; tokens such as inverse surfaces, scrims and persistent selection have no consumer and are **reserved, not built** (ADR 0010 Decision 2).
- **D9 — Values are provisional; structure is what is validated.** With no approved UI/UX, the components can prove the vocabulary has a correct **place** for every state — they cannot prove a given value is the right one. The tier model makes this a non-problem: values live in primitives and the resolution, components never see them, and a future design lands as a palette swap. Do not over-invest in specific values.
- **D10 — Feed and Profile are adoption targets, not validation targets.** This effort does not prove those pages work; it makes the language mature enough for them to adopt it later without another foundational rebuild. If a future page needs a token that does not exist, that is **normal extension of a stable foundation**, not evidence this effort was incomplete.
- **D11 — Migration is an in-place strangler.** CSS custom properties are additive and the old and new names do not collide, so: introduce the new tiers **alongside** the existing tokens; migrate consumers **one Work Item at a time**, each leaving the application fully working; delete the legacy set only when its **last** consumer is gone.
- **D12 — The undefined-token checker is a unit test.** Frontend unit tests already run in CI, so implementing the checker as a test earns enforcement for free rather than requiring a bespoke build step.
- **D13 — The checker enforces token *responsibility*, not one rule for every custom property.** A **Design Token** (primitive or semantic) must exist: a fallback does not excuse a missing one, because a fallback *hides* the silent rename the checker exists to catch — `var(--color-accent, blue)` still renders after `--color-accent` disappears, plausibly and wrongly. A **component token** is runtime-parameterised by design (set by an inline style), so its fallback **is** its default value and is legitimate. This is not a compromise between strict and lenient: it applies the tier model **ADR 0010 Decision 3 already defines**. A single strict rule would false-positive on legitimate defaults, and a checker that cries wolf gets weakened rather than obeyed; a single lenient rule would let the language rot one fallback at a time. **Classification is by definition site** — `foundations/tokens/**` and `foundations/theme/**` are Design Tokens; a component's own module CSS or inline-style keys are component tokens — because naming conventions drift and definition sites do not.
- **D14 — "No new tokens" means no new *semantic vocabulary*.** A token that is already **referenced** but never **defined** is a bug, and defining it introduces no vocabulary — the vocabulary is already present in the references. Completing a partial ramp is therefore a bugfix, not scope creep, and is preferred over repointing references to a different token, which would change appearance on a set that is about to be deleted.

### 3.3 Definition of Stable

**Stable** means *ready for product adoption* — not *finished forever*. The effort reaches it when **all nine** hold:

1. The legacy token set is **retired** — deleted, not merely unused.
2. Every component and consumer binds to **semantic tokens only** — no primitives, no hardcoded values (**I1**).
3. **Theme switching works** through the typed contract, with full **key parity** across themes (**I2**, **I9**).
4. The **undefined-token checker is green** — zero unresolvable references (**D12**).
5. **Storybook is the verification environment**, exercising both themes and every interaction state (**D2**).
6. A **single owned focus indicator** — no per-component focus rings remain (**I5**).
7. **AA contrast holds in both themes** for every guaranteed relationship (**I5**).
8. **Logical properties throughout** — direction-agnostic authoring, no physical properties (**I6**).
9. **`design-system.md` is rewritten** to the re-established architecture, superseding its bootstrap-era model.

## 4. Strategy & sequencing

**Order:** **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10**, with 5–7 parallelisable once 4 lands.

```
1 (safety net) ─▶ 2 (theme mechanism) ─▶ 3 (colour vocabulary) ─▶ 4 (Button — the vertical slice)
                                                                        │
                                        ┌───────────────────────────────┼───────────────┐
                                        ▼                               ▼               ▼
                              5 (Input + Checkbox)              6 (FileInput)      7 (Icons)
                                        └───────────────┬───────────────┘
                                                        ▼
                                              8 (Auth token-swap)
                                                        ▼
                                         9 (remaining token types) ─▶ 10 (retire legacy + doc)
```

- **1 → everything** *(hard)*: ~25 files consume tokens, and components build token names by **string interpolation**, so a rename fails no typecheck and no lint — it resolves to an undefined variable at runtime. The compiler cannot be the safety net, so the checker must exist before anything moves.
- **1 → 2** *(hard)*: the checker immediately converts the existing undefined-token bugs into visible failures, which is what makes the theme work verifiable rather than merely plausible.
- **2 → 3** *(hard)*: theming is **unverifiable** until a theme can be switched — nothing currently sets the theme attribute, so the dark block is dead code. Key parity and theme transparency cannot be claimed, let alone tested, before the mechanism exists.
- **3 → 4** *(hard)*: the language must exist before a component can bind to it.
- **4 → 5, 6, 7** *(hard, then parallel)*: the first component proves the vocabulary survives contact with a real consumer. Once it has, the rest are mechanical and independent of one another.
- **5, 6, 7 → 8** *(sequencing)*: Auth consumes the components; migrating it after them avoids touching the same surfaces twice.
- **8 → 9 → 10** *(hard)*: the legacy set cannot be deleted while any consumer still binds to it, and the platform document cannot describe a system that is still half-migrated.

**Why this order and not another.** The riskiest claims are validated earliest and most cheaply. **Enforceability** comes first (a 25-file migration with no compiler safety net is the effort's single largest hazard). **Verifiability** comes second — a theme that cannot be switched makes the central invariants unfalsifiable. **Vocabulary sufficiency** comes third, proven by one real component before nine more files depend on it. Everything after WI-4 is repetition of a proven pattern, and the two items that can only be done last — deleting the legacy set and describing the result — are last.

## 5. Execution structure

Each Work Item is a separate, atomic unit with its own Issue and PR, and each leaves `main` green under the real CI gate (frontend typecheck + unit tests; the Storybook run is a local gate, **D3**).

### WI-1 — Migration safety net
- **Goal & rationale:** make the binding rule *enforceable* before anything moves. **It comes first** because the migration's largest hazard is silent breakage: components construct token names by string interpolation and stories pass role names as strings, so a rename produces an undefined custom property at runtime with **no compile-time or lint failure**. Every later Work Item depends on this net existing.
- **Scope:** a checker, implemented as a **unit test** (**D12**), that resolves `var(--…)` references — literal in CSS and interpolated in TSX — against definitions drawn from the foundations, from components' runtime-prop keys, and from CSS-local declarations, and **fails on any unresolved Design Token reference by the responsibility rule in D13**; and the fixes for the undefined-token bugs it surfaces, **including those currently masked by a fallback** (per **D14**, completing a partial ramp is a bugfix).
- **Non-goals:** no token renaming; **no new semantic vocabulary** (**D14** — defining an already-referenced token is a bugfix, not new vocabulary); no component changes beyond the bug fixes the checker forces; no theme-parity enforcement (**WI-2** owns **I2**, and see the note below).
- **Dependencies:** none (first).
- **Boundary validated:** that the binding rule is **mechanically enforceable**, not merely declared — the property every later item relies on — and that enforcement follows the **tier model** rather than treating every custom property alike.
- **Invariants protected:** **I1**.
- **Verification:** the checker fails on a deliberately injected undefined reference, then passes once reverted — proven, not asserted; a component token with a fallback does **not** trip it, while a Design Token with a fallback does; typecheck + unit green.
- **DoD:** the checker runs in the unit suite and is green; every unresolved Design Token reference is fixed; the injection proof and an explicit statement of **what the checker does and does not cover** are recorded in the PR.
- **Commit/PR boundary:** one PR (checker + the bugs it surfaces).
- **Stop-risks:** if the checker cannot see through the string-interpolated token construction, say so plainly and record what it does and does not cover — a net believed to be tighter than it is would be worse than none.

> **The checker does not need to be theme-aware.** A token defined in one theme but not another is invisible to a union-of-definitions check — but that is **I2**'s gap, not the checker's, and **WI-2 closes it**: once every theme defines the same key set, a union check and a per-theme check are equivalent for Design Tokens. Two simple mechanisms composing, rather than one clever one.

### WI-2 — Theme mechanism, key parity, and the global bypass
- **Goal & rationale:** make theming **verifiable**. **It precedes the vocabulary** because nothing currently sets the theme attribute — the dark block is unreachable, so key parity, theme transparency and theme-count agnosticism are all unfalsifiable claims until a theme can actually be switched.
- **Scope:** the **typed theme contract** the Design System exports (the theme-name union and the attribute contract, **D4**); the application-side provider that implements it and the Storybook switcher that exercises it; alignment of the diverging light/dark keys — including a **provisional dark value** for any key the legacy light theme defines and dark does not, and removal of a dark-only key with no consumer; and the removal of the global stylesheet's hardcoded body colours and font, which bypass the token layer entirely.
- **Non-goals:** no theme **selection policy** (system preference, persistence, startup) — that is the application's (**I9**); no theme provider inside the Design System (**D4**); no new **semantic vocabulary** (**D14** — closing a parity gap by defining an already-referenced key is a bugfix, not vocabulary; authoring the colour layer is **WI-3**).
- **Dependencies:** **WI-1** (hard).
- **Boundary validated:** the theme contract itself — that the Design System resolves and the application selects, with the contract **typed** so a consumer cannot drift from the theme set that actually exists. Establishing key parity also **closes WI-1's checker blind spot**: with identical key sets, a union-of-definitions check is equivalent to a per-theme one.
- **Invariants protected:** **I2**, **I3**, **I9**.
- **Verification:** switching the root attribute re-themes the surface with **no component change**; a key-set comparison between themes is equal; Storybook can switch themes; the global stylesheet no longer sets colour.
- **DoD:** both themes reachable and key-aligned; the contract is exported and typed; Storybook switches; `main.css` bypass removed; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if key parity cannot be reached without **inventing vocabulary** — a key referenced nowhere, or a value with no defensible provisional choice — stop and record it. Defining a key that is already *referenced* is a bugfix (**D14**); minting one that nothing consumes is not, and neither is guessing a value the evidence does not support.

> **Legacy-set parity is WI-2's or nobody's.** WI-3 introduces the new tiers **alongside** the legacy set (**D11**) and never repairs it; WI-10 deletes it. A parity gap left open here therefore survives the entire migration — and because every component-migration Work Item verifies that **AA holds in both themes**, each would be validating against a broken baseline. Closing it is why a dark value that has never rendered is still a **D14** bugfix rather than **WI-3** authoring: it completes a resolution so the mechanism can be trusted, and **D9** keeps the value provisional.


### WI-3 — Colour primitives and the semantic layer
- **Goal & rationale:** author the language. **It precedes any component** because nothing can bind to a vocabulary that does not exist, and **it follows the mechanism** because a semantic layer is only meaningful once its resolution can be observed in more than one theme.
- **Scope:** the colour **primitive** tier and the **semantic** tier built on it, resolved completely in every theme, introduced **alongside** the legacy set (**D11**). The vocabulary is scoped to what the existing components exercise (**D8**); tokens with no consumer are **reserved, not built**.
- **Non-goals:** no component migration; no deletion of legacy tokens, and **no repair of the legacy set** — the new tiers land beside it (**D11**), so a legacy parity gap is not closed here; no compositional tokens (inverse surfaces, scrims, selection) — no consumer exists; no investment in final values (**D9**).
- **Dependencies:** **WI-2** (hard).
- **Boundary validated:** the three-tier model — that intent-named roles resolve to primitives, and that a theme is a complete resolution of that layer.
- **Invariants protected:** **I1**, **I2**, **I4**.
- **Verification:** every semantic key resolves in every theme; the key sets are identical; the checker stays green; no responsibility is collapsed onto a shared token merely because the current themes render two responsibilities alike (**I4**).
- **DoD:** the colour tiers exist and resolve in all themes; nothing consumes them yet; legacy untouched; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if a contrast requirement cannot be met without collapsing two responsibilities into one token, **stop** — that is a vocabulary problem, and discovering it here is far cheaper than after nine files bind to it.

### WI-4 — First component migration (Button) — the vertical slice
- **Goal & rationale:** prove the language survives contact with a real consumer. **It is the effort's pivot**: everything before it is preparation, everything after is repetition of the pattern it establishes. It precedes the remaining components so that a vocabulary flaw is found once, not five times.
- **Scope:** migrate Button to bind **only** to semantic tokens; replace its hand-rolled focus ring with the **single owned focus indicator**; verify AA in both themes; author the stories that exercise every interaction state; author with logical properties. Promote the a11y addon from reporting to failing (**D3**).
- **Non-goals:** no redesign of Button's appearance; no API/prop changes; no other component.
- **Dependencies:** **WI-3** (hard).
- **Boundary validated:** **vocabulary sufficiency** — that the semantic layer has a correct place for every state a real component needs, and that the component re-themes with no knowledge of themes.
- **Invariants protected:** **I1**, **I3**, **I5**, **I6**, **I7**.
- **Verification:** Button references no primitive and no hardcoded value; it renders correctly in both themes with no theme-conditional code; focus comes from the owned token; AA holds in both themes; stories cover every state.
- **DoD:** Button fully migrated; the owned focus indicator exists and Button uses it; a11y promoted to failing; typecheck + unit green; Storybook green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if Button needs a semantic token the vocabulary lacks, **stop and extend the vocabulary deliberately** rather than reaching for a primitive — the first such reach would silently reintroduce the drift this effort exists to remove.

### WI-5 — Input and Checkbox
- **Goal & rationale:** apply the proven pattern. **It follows WI-4** because the pattern must be proven once before it is repeated; it can run in parallel with WI-6 and WI-7, which touch disjoint files.
- **Scope:** migrate both components to semantic-only binding, the owned focus indicator, and logical properties; update their stories to exercise every state in both themes.
- **Non-goals:** no redesign; no API change; no FileInput.
- **Dependencies:** **WI-4** (hard).
- **Boundary validated:** that the vocabulary holds for **validity and selection states** — the surfaces Button does not exercise.
- **Invariants protected:** **I1**, **I3**, **I5**, **I6**.
- **Verification:** as WI-4, for both components, including the invalid/error state path.
- **DoD:** both components migrated and story-covered; checker green; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** as WI-4 — a missing token is a vocabulary decision, never a primitive reach.

### WI-6 — FileInput
- **Goal & rationale:** the worst case, isolated. **It gets its own Work Item** because it carries by far the heaviest drift — primitive-direct references *and* hardcoded hex and rgba throughout, across three variants — so folding it into a shared PR would make that review unreadable.
- **Scope:** migrate all three variants to semantic-only binding, the owned focus indicator, and logical properties; replace every hardcoded value; update stories.
- **Non-goals:** no redesign; no variant restructuring; no change to its upload behaviour.
- **Dependencies:** **WI-4** (hard).
- **Boundary validated:** the binding rule **under the worst case** — if the vocabulary survives this component, it survives the codebase.
- **Invariants protected:** **I1**, **I3**, **I5**, **I6**.
- **Verification:** zero primitive-direct references and zero hardcoded colour values remain in the component; both themes correct; checker green.
- **DoD:** all three variants migrated; typecheck + unit green; Storybook green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if a hardcoded value proves to be a genuine product/brand decision with no semantic home, treat it as **consumer-owned composition** (the **D7** rule) rather than promoting it into the Design System.

### WI-7 — Icons
- **Goal & rationale:** close the surface everyone forgets. **It is separated** because the icon set is not on anyone's mental list of "components", yet one icon hardcodes an eight-colour palette — a binding-rule violation that would otherwise survive the entire effort and quietly falsify the completion criteria.
- **Scope:** bring the hardcoded icon palette onto semantic tokens; remove the hardcoded colour in the icon stories.
- **Non-goals:** no icon redesign; no additions to the set; no change to the `currentColor` convention the other icons already follow correctly.
- **Dependencies:** **WI-4** (hard).
- **Boundary validated:** that the binding rule holds **everywhere**, not only in components that look like components.
- **Invariants protected:** **I1**.
- **Verification:** no hardcoded colour values remain in the icon set; icons render correctly in both themes.
- **DoD:** icons migrated; checker green; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if a file-type palette is genuinely semantic to file types rather than to the design language, record it as consumer-owned rather than inventing eight Design System roles for it.

### WI-8 — Auth — mechanical token-swap
- **Goal & rationale:** **unpin the legacy set.** Auth is the last consumer holding the old tokens alive, and the legacy set cannot be deleted while it does. **It follows the components** because Auth composes them, so migrating it earlier would mean touching the same surfaces twice. It is explicitly **not** a design exercise (**D7**).
- **Scope:** swap Auth's token references to the semantic layer, **preserving current appearance**; author with logical properties. Hardcoded brand values with no semantic home stay **local to the Auth module** as consumer-owned composition.
- **Non-goals:** **no visual redesign** of any kind; no restructuring; no promotion of Auth's brand values into the Design System's semantic set; no treatment of Auth as a design reference.
- **Dependencies:** **WI-5**, **WI-6**, **WI-7** (sequencing).
- **Boundary validated:** the **language/composition boundary** — that a consumer can express itself in the language while keeping its own decorative composition local.
- **Invariants protected:** **I1**, **I6**, **I8** (product/brand specifics stay out of the platform).
- **Verification:** Auth references no primitive and no Design System-owned hardcoded value; appearance is unchanged; any retained local values are visibly scoped to the Auth module.
- **DoD:** Auth migrated with appearance preserved; no brand value promoted into the Design System; typecheck + unit green.
- **Commit/PR boundary:** one PR.
- **Stop-risks:** if preserving appearance would require adding a Design System token that serves only Auth's prototype look, **stop** — that token would encode a design that is expected to be replaced, which is precisely what **D7** forbids.

### WI-9 — Conform the remaining token types
- **Goal & rationale:** make the architecture true of **every** token family, not only colour. **It follows the colour migration** because the tier model and binding rule are proven there first; conforming the rest is then mechanical.
- **Scope:** bring the remaining token families (spacing, typography, elevation, motion, and the rest) into the three-tier model and under the binding rule, to the extent each requires.
- **Non-goals:** no new scales or values; no responsive/breakpoint redesign; no redesign of any kind.
- **Dependencies:** **WI-8** (sequencing).
- **Boundary validated:** **token-type agnosticism** — that the architecture defined once genuinely governs every family identically (ADR 0010 Decision 3).
- **Invariants protected:** **I1**, **I4**.
- **Verification:** each remaining family conforms to the tier model; the checker stays green; no consumer binds to a primitive of any type.
- **DoD:** all token families conformed; typecheck + unit green.
- **Commit/PR boundary:** one PR, or one per family if the diff is large enough to harm review.
- **Stop-risks:** if a family genuinely does not fit the tier model, that is an **architectural** finding — record it and stop, rather than bending the family or the model quietly.

### WI-10 — Retire the legacy set and rewrite the platform document
- **Goal & rationale:** declare **Stable** and make it true. **It is last** because the legacy set cannot be deleted while any consumer binds to it, and the platform document cannot describe a system that is still half-migrated.
- **Scope:** delete the legacy token set; rewrite `design-system.md` to the re-established architecture, superseding its bootstrap-era model; verify every criterion in §3.3.
- **Non-goals:** no behaviour change; no new semantic vocabulary (**D14**); no component changes.
- **Dependencies:** **WI-9** (hard).
- **Boundary validated:** that the Design System is the **single owner** of the presentation language, with no second vocabulary surviving alongside it.
- **Invariants protected:** all nine, verified together as the **Definition of Stable**.
- **Verification:** the legacy set is deleted and nothing references it; every §3.3 criterion is demonstrated, with the mechanically verifiable ones shown rather than asserted.
- **DoD:** legacy deleted; `design-system.md` rewritten and co-versioned; all nine Stable criteria hold; typecheck + unit green; Storybook green.
- **Commit/PR boundary:** one PR (deletion + document), or two if the document rewrite is large enough to warrant its own review.
- **Stop-risks:** if any consumer still binds to a legacy token, the effort is **not** complete — do not delete it and do not declare Stable; finish the migration first.

## 6. Risks & mitigations (effort-wide)

- **Silent rename is the defining hazard.** Token names are built by string interpolation and passed as strings from stories, so no compiler or linter catches a break. Mitigation: **WI-1 first**, and every later Work Item keeps the checker green.
- **A contrast failure may be a vocabulary failure.** If AA cannot be met without collapsing two responsibilities into one token, the vocabulary is wrong, not the value. Mitigation: check contrast in **WI-3 and WI-4**, not at the end, or the rework touches every migrated file.
- **No visual regression net.** There are no Design System component tests and no snapshots, and Storybook's a11y gate is local rather than CI-enforced (**D2**, **D3**). Appearance can change silently. Mitigation: stories exercising every state, migration Work Items that preserve appearance by intent, and honest reporting when a change is observed.
- **Values are provisional (D9).** A future design will replace them. Mitigation: the tier model keeps values out of components, so a redesign is a palette swap — provided no Work Item lets a value reach a component.
- **Auth is a prototype, not a reference (D7).** The risk is that migrating it quietly promotes prototype brand decisions into the platform. Mitigation: WI-8's explicit stop-risk, and the rule that unhoused brand values stay local.
- **Scope creep toward "while we're here".** New components, a design language, or a visual-regression system are all out (§2). Mitigation: discoveries are **recorded, not absorbed**.

## 7. Completion criteria (whole effort)

- All ten Work Items merged to `main`, each green under the CI gate, each leaving the application fully working.
- **All nine Definition-of-Stable criteria (§3.3) hold**, with the mechanically verifiable ones (**I1**, **I2**, **I3**, **I6**, **I8**, and the checker) demonstrated rather than asserted.
- The legacy token set is **deleted**, and `design-system.md` describes the re-established architecture.
- No out-of-scope item was pulled in: no redesign, no new components, no visual-regression system, no product pages.
- **What is deliberately *not* claimed:** that the vocabulary is *sufficient* for pages that do not yet exist. Sufficiency is proven on **adoption** (**D10**); a later page needing a new token is normal extension of a stable foundation, not a defect of this effort.

## 8. Reconciliation

*Added as this plan approaches `Historical`: where each Work Item's durable facts landed in the permanent documents, which findings were recorded, and the forward links. `design-system.md` is rewritten in WI-10 and thereafter owns the operative conventions; [ADR 0010](../architecture/decisions/0010-design-system-platform-reestablishment.md) retains only the boundary, ownership, and rationale.*
