# Arabic and RTL/LTR Support

> **Status:** Historical
> **Type:** Execution
> **Owner:** Basel Ghonaim
> **Last Updated:** 2026-09-19
> **Parent Issue:** [#754](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/754)
> **Supersedes:** —
> **Archived (completed, 2026-09-19):** all six Work Items merged. The durable facts now live with their owners: [localisation](../../frontend/localisation.md), the Design System's [foundation](../../frontend/design-system/foundation.md) and [components](../../frontend/design-system/components.md) contracts, the [testing topology](../../development/testing-topology.md), the [API contract](../../api/api-contract.md) and the [UX direction](https://github.com/Basel-Ghonaim/quick-tweets-app/blob/093796829cfbd8628e8654bab5a2be144346a7ea/docs/features/authentication/product/ux-direction.md). Every deferral has an Issue (§12).

## 1. Purpose

The product is committed to English and Arabic, with right-to-left as a first-class direction ([overview](../../project/overview.md)). The Design System already authors direction-agnostically and can mirror icons; nothing else a reader meets can yet change language or direction. This effort makes the web interface readable in either language, in the direction that language reads, and proves every rendered state in both directions.

## 2. Settled decisions

Approved. A decision changes only when implementation exposes a genuine technical conflict, which is raised on #754 before anything is decided.

| | Settled as |
|---|---|
| **D1** | New passwords allow printable ASCII including space; the four required classes stay; never trimmed |
| **D2** | The tighter password rule is a Pre-release Contract Exception |
| **D3** | Forward-only: enforced where a password is set; login stays presence-only |
| **D4** | ASCII email only (punycode domains), as the server enforces; the client is aligned to it |
| **D5** | Web interface only; server-side language and localised mail are the next effort |
| **D6** | Selection in `shared/preferences`, catalogues in `shared/copy`, a new `shared/` mechanism resolves and formats |
| **D7** | Typed catalogues with native `Intl`; revisit on a third language, a vendor, or catalogue size |
| **D8** | A reader preference like the theme: stored choice → browser languages; direction derived from language; `lang`/`dir` before first paint; no URL segment |
| **O1** | The default follows the device/browser language, inside D8's order |
| **O5** | When no browser language is a registered one, the interface is in English, the source language; a browser language matches on its base language |
| **D9** | Western digits and the Gregorian calendar, both pinned in `Intl` |
| **D10** | ADR 0010's second-locale condition is met; script-ordered font stacks with a `:lang(ar)` override; Google Fonts delivery |
| **O2** | The Arabic face is Noto Sans Arabic; Arabic line-heights are 1.6 for display and heading, 1.8 for label and body |
| **O3** | The named native-Arabic approver is Basel Ghonaim |
| **O4** | The language control sits in the auth shell's header, beside the theme control, until a settings or navigation surface exists |
| **D11** | `dir="auto"` on user-authored text; identifiers isolated as LTR; script detection only where no element exists |
| **D12** | Render containment now; server-side NFC and bidi-control refusal later (deferred) |
| **D13** | The browser lane runs in both directions; coverage floors stay on the LTR run |
| **D14** | A frontend localisation platform document, plus the Strategy §6 row, the map, an RTL section in the UX direction, glossary links |
| **D15** | A named native-Arabic approver signs off Arabic content; English is the source |

**No input is still owed.**

## 3. Scope

**In:** the credential rules; every user-facing word moved into the catalogue; the language preference and pre-paint signal; the content mechanism and formatting; the browser lane in both directions; the Design System's typography seam, Arabic face and bidi rules; the Arabic catalogue and language control; the documentation each of these owes.

**Out:** Arabic in usernames and passwords · Arabic-Indic digit display, Hijri dates, locale URLs, account-stored language · E2E · surfaces not yet built.

**Deferred**, each with its trigger:

| Item | Trigger | Tracked in |
|---|---|---|
| Server-side language and localised mail | The next effort, after WI-6 | [#774](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/774) |
| Server-side NFC and bidi-control refusal | Before the first surface renders other users' text | [#775](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/775) |
| Arabic-Indic digits in the one-time code | Human ruling | [#776](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/776) |
| A translation library or vendor | A third language, a vendor, or catalogue size | [#777](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/777) |
| Self-hosted fonts | Decided for every face together, outside this effort | [#778](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/778) |

## 4. Strategy

**Content before language, language before direction proof, proof before Arabic.** Each step makes the next checkable: a word cannot be translated while code holds it, a language cannot be proven until the signal exists, and Arabic should land into a lane that already renders right-to-left.

**Constraints the Work Items honour:**

- **Content travels inward.** No platform mechanism or Design System component imports the catalogue; they take their words as input ([ADR 0018](../../architecture/decisions/0018-composition-has-a-home-four-frontend-zones.md) Decision 6, [ADR 0010](../../architecture/decisions/0010-design-system-platform-reestablishment.md) Decision 8).
- **No content is frozen at import.** Anything that holds words — form schemas, error handlers — resolves them against the active language.
- **Direction follows language.** No separate direction choice exists anywhere.
- **Proof stays in its lane** ([testing topology](../../development/testing-topology.md)): rules in the unit lanes, provider lifecycle in the component lane, rendering, fonts and accessibility in the browser lane.

**One Work Item at a time.** Each Issue opens after the previous Work Item merges and the human says to proceed.

## 5. Work Items

`WI-1 → WI-2 → WI-3 → WI-4 → WI-5 → WI-6`

| WI | Objective | Kind | Needs |
|---|---|---|---|
| **WI-1** [#755](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/755) | New passwords take English characters only; both tiers agree on email (D1–D4) | Decision | — |
| **WI-2** [#757](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/757) | English content leaves the code | Move | WI-1 |
| **WI-3** [#763](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/763) | The active language: preference, pre-paint `lang`/`dir`, content mechanism, formatting (D6–D9, O5) | Decision | WI-2 |
| **WI-4** [#765](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/765) | RTL proof: the browser lane in both directions (D13) | Decision | WI-3 |
| **WI-5** [#767](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/767) | Design System script and direction reactivity (D10, D11, D12 containment) | Decision | WI-4 · O2 |
| **WI-6** [#771](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/771) | The Arabic catalogue and the language control (D15) | Decision | WI-5 · O3 · O4 |

**WI-1.** Enforces the password allow-list in both tiers, aligns the client email rule with the server, and records the rules and the exception in the API contract. Done when both tiers accept and reject one shared fixture set identically, and login is unchanged.

**WI-2.** Every user-facing word — including the Design System's, the form engine's defaults and the error pipeline's defaults — comes from `shared/copy`, and messages are whole lines. Rendered text is unchanged. Done when a check finds no user-facing literal outside the catalogue, and every lane equals its base.

**WI-3.** The reader's language is resolved from their stored choice, then their browser, and stamped with its direction before the first paint; a new mechanism serves the active catalogue and formats with pinned `Intl`; every consumer reads through it. Only English is registered. Done when the inline script and the module provably agree, a switch re-renders every consumer without a reload, and catalogue parity is a compile-time error.

**WI-4.** Every story also renders right-to-left, under the same accessibility check, with coverage floors still measured on the LTR run. Done when both runs are green and a violation injected only under RTL fails only the RTL run.

**WI-5.** The Design System reacts to script as well as direction: Arabic text renders in the Arabic face wherever it appears, fields read `dir="auto"`, identifiers stay LTR, and the physical-direction check reaches inline styles. Done when each is proven in the browser lane in both directions.

**WI-6.** A complete Arabic catalogue, approved by the named approver, is registered and selectable from the language control. Done when every screen and state renders in Arabic right-to-left without an accessibility regression, and Arabic plurals are proven.

## 6. Milestones

| Milestone | Reached when | Work Items |
|---|---|---|
| **M1** — the credential rules hold | English-only passwords and one email rule, in both tiers | WI-1 |
| **M2** — the interface is language-ready | Every word is content, and the active language is a signal | WI-2, WI-3 |
| **M3** — right-to-left is proven | Every state renders in both directions, and the Design System reacts to script | WI-4, WI-5 |
| **M4** — Arabic ships | A reader can choose Arabic and read the whole interface in it | WI-6 |

## 7. Acceptance and proof

The effort is complete when:

- a reader's language and direction are correct from the first paint, by stored choice or browser language;
- no user-facing word lives outside a catalogue, and the catalogues cannot drift apart;
- every rendered state passes the accessibility check in both directions;
- Arabic text renders in its face and identifiers stay readable left-to-right in every direction;
- the documents named in §9 state what was built, and every deferral in §3 is tracked.

**Proof bites.** Every new check or rule is shown to fail on an injected violation and pass once it is reverted.

## 8. Verification strategy

- **Baseline at the Start SHA** — every lane, before WI-1's first change, including the browser lane's count, which the last baseline missed. It is re-measured whenever `main` moves before a Work Item branches.
- **After every Work Item** — every lane again. A count or size that moves is a named delta in the Issue and the PR; anything unnamed is a regression.
- **Ungated lanes** — the browser lane, the API integration lane and the manual harness run whenever a Work Item can affect them, and the result is stated either way.
- **Databases** — the API integration lane and the harness run on a throwaway database, never on shared data.

## 9. Documentation

Each change lands with the Work Item that makes it true.

| Owner | Carries | WI |
|---|---|---|
| API contract | the password and email rules, the exception row, login's presence-only statement | WI-1 |
| Design System components contract · forms · error handling | words arrive as input; validators take their message; defaults are content | WI-2 |
| New frontend localisation document · frontend architecture · Strategy §6 · the map · glossary links | the language policy, the mechanism, formatting, the approval rule; the platform index and the composition root | WI-3 |
| Testing topology | the accessibility-rendering rule in both directions | WI-4 |
| Design System foundation · components contract | the script-aware typography seam; `dir="auto"`, isolation, directional icons | WI-5 |
| UX direction | the RTL section and the language control | WI-6 |

No ADR is created or edited.

## 10. Risks

| Risk | Mitigation |
|---|---|
| A string moved in WI-2 changes what a reader sees | WI-2 is a Move: every assertion and count must equal base |
| The browser lane's runtime doubles in WI-4 | Accepted; the lane is not a CI gate, so merges are not slowed |
| A right-to-left defect exposed in WI-4 is outside a rule the effort owns | It stops the Work Item and is recorded, not absorbed |
| Arabic content is published unreviewed | WI-6 cannot merge without the named approver's recorded approval |
| This plan goes stale as execution teaches something | §11 |

## 11. Updating this plan

It changes in the branch where the need was found, never in a branch of its own. When an implementation detail moves, the Work Item's Issue is updated; when strategy, sequencing, scope or a decision moves, this plan is. Nothing stale is left in either.

## 12. Reconciliation — where the durable knowledge landed

*Written at archival. Every settled decision now lives with an owner that outlives this plan, which is what lets the plan be archived rather than kept alive as the only place a fact is written down.*

**Decisions, and where each landed:**

- **D1–D4 (the credential rules).** The [API contract](../../api/api-contract.md) holds the password and email rules, login's presence-only statement and the Pre-release Contract Exception; the [forms](../../frontend/forms.md) document holds the client's email rule. Both tiers state the rules, which is [Finding 0026](../../architecture/findings/open/0026-no-tier-owns-the-credential-rules.md)'s open question and not this plan's.
- **D5.** It was deferred, and the deferral is tracked in [#774](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/774).
- **D6–D9, O1, O5 and D15.** They are the [localisation](../../frontend/localisation.md) contract's: resolution, the pre-paint stamp, the catalogues and how they are read, writing numbers and values, choosing a language, and approval. The [frontend architecture](../../frontend/architecture.md) places the mechanism in its platform index and composition root.
- **D10 and O2.** The [Foundation](../../frontend/design-system/foundation.md) owns script as the second resolution axis and the script-ordered stacks. O2's face and line-heights are values, and they live in the token layer, where values belong. [#778](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/778) tracks D10's Google Fonts delivery against self-hosting.
- **D11 and D12's containment.** The [component contract](../../frontend/design-system/components.md) owns the direction of text; [localisation](../../frontend/localisation.md) owns how a line holds a value it did not write. D12's server half is [#775](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/775).
- **D13.** The [testing topology](../../development/testing-topology.md) owns it: every state is rendered in both directions, each run in its own language.
- **D14.** It is met: the [localisation](../../frontend/localisation.md) document, its [Documentation Strategy](../../architecture/documentation-strategy.md) §6 row, the [map](../../README.md), the [glossary](../../project/glossary.md) entry and the [UX direction](https://github.com/Basel-Ghonaim/quick-tweets-app/blob/093796829cfbd8628e8654bab5a2be144346a7ea/docs/features/authentication/product/ux-direction.md)'s §19.
- **O3 and O4.** They were inputs rather than rules. O3 named who approves; the approval rule is localisation's, and the approval itself is recorded on [#771](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/771). O4's placement is the UX direction's §19.
- **D7's revisit trigger** is tracked in [#777](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/777), and the one-time code's digits in [#776](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/776).
- **No ADR was created or edited**, as §9 required.

**Findings.**
- [Finding 0028](../../architecture/findings/resolved/0028-authentication-form-labels-live-outside-the-catalogue.md) was resolved, in WI-2.
- [Finding 0019](../../architecture/findings/open/0019-pre-paint-script-hardcodes-the-theme-set.md) gained the language set's addendum, in WI-3.
- [Finding 0032](../../architecture/findings/open/0032-a-check-on-lane-infrastructure-has-no-lane.md) gained three addenda, for the direction and language checks the lane runs on itself.
- No finding was opened, and none of these is this plan's to close.

**Residues, named rather than absorbed.** Each was recorded by the PR that met it, and none is a deferral of this plan:
- the theme's pre-paint check lacks the storage-key and storage-guard coverage the language's has, and the language-switch proof's surface list is recorded (#764);
- `createUnknownError` shows a raw message (#760);
- `FileTypeIcon`'s label column is never rendered (#764);
- a stale comment in `Mirroring.stories.tsx`, `FileInput`'s one-edged badge story, and a lane check that cannot see a removed setup file (#766);
- the application's body font binds a primitive, and `FileInput`'s add-more control sets a raw `10px` (#769);
- the component lane behaves differently on local Node 26 and CI's Node 22, and `arabic.test.ts` carries a tautological assertion inside the approved tree (#773).

**Deliberately not part of this closing.** The approver's comments on structure, file partitioning and organisation were deferred, by instruction, to an independent refactor round after this effort, and none of them is reconciled here.

**How this plan was closed.** It was archived in a branch of its own ([#779](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/779)), by the human's instruction and ruling W6-R9. That is the one departure from §11 and from the plans index's rule that a plan is never updated in a branch of its own.
