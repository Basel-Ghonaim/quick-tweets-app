# Finding 0035: The language's writer is offered by a barrel no production file reads

> **Status:** Open
> **Date:** 2026-09-20
> **Affected areas:** `apps/web/src/shared/preferences/index.ts`; `apps/web/src/shared/preferences/language/index.ts`; `apps/web/.storybook/readingDirection.ts`
> **Reported by:** the independent review of [#784](https://github.com/Basel-Ghonaim/quick-tweets-app/pull/784), while the language preference gained a provider ([#783](https://github.com/Basel-Ghonaim/quick-tweets-app/issues/783))

## Observation

`setLanguage` is exported from `shared/preferences`' barrel and from the language slice's own. **No production file imports it from either.** The control that changes a language reads it from the context — `LanguageToggle.tsx` destructures it off `useLanguage()` — and `LanguageProvider.tsx` imports it from `./languageStore` directly, beside the other store functions it composes.

What still imports the exported name is test support:

- `apps/web/.storybook/readingDirection.ts:2`, the browser lane's harness, which calls `setLanguage(language)` around **every story in both reading directions**;
- `apps/web/src/app/routes/placeholder/Placeholder.component.test.tsx:5`.

[ADR 0020](../decisions/0020-proof-has-a-home-testing-topology.md) Decision 6 clause 2 says: *"No production declaration exists whose only consumer is a test."* The declaration itself — `setLanguage` in `languageStore.ts` — is used in production by the provider, so the clause does not reach it. What became test-only is the **public surface that re-exports it**, which is a smaller thing than the clause names and the same shape of problem.

`currentLanguage`, `setupLanguages` and `subscribeToLanguage` are unaffected: `shared/localisation/catalogues.ts` consumes all three in production.

## Why it matters

The clause exists so that the architecture does not grow surface for its tests. A public name nothing in production reaches is a name the next reader must still understand, and a seam the next change must still preserve.

It also sits against a real guarantee. Running every story in both directions is the Arabic and RTL effort's proof ([testing topology](../../development/testing-topology.md); the plan's D13), and the harness reaches the language imperatively because it runs outside React. Removing the export without answering that leaves the proof without a way in.

## Why it is recorded rather than resolved

Every answer available touches something already decided, so none of them belongs to the Work Item that surfaced it:

- **Remove the export and let the harness import the module path.** That is a deep import past a root barrel, which the [frontend architecture](../../frontend/architecture.md)'s barrel rule forbids a consumer — and whether lane infrastructure is a consumer in that sense is itself unsettled ([Finding 0032](0032-a-check-on-lane-infrastructure-has-no-lane.md) records the neighbouring question).
- **Keep the export as the lane's seam, named as such.** Honest, but it accepts the clause's letter being broken and needs saying out loud rather than assuming.
- **Give the lane another way in** — a decorator that renders the provider and chooses the language through it. That rewrites how the both-directions proof works, which is approved machinery.
- **Say that `.storybook/` setup is not "a test" for the clause's purposes.** That is a change to what ADR 0020 Decision 6 means, and only an ADR can make it.

The decision was deliberately not taken while the preferences were being reshaped; the reshaping itself changed no behaviour, and this question changes a rule's reach.

## Not decided here

Which of the four answers is right · whether a barrel's re-export counts as a "declaration" under ADR 0020 Decision 6 clause 2 · whether lane infrastructure may import past a root barrel.
